import { Router, type Request, type Response, type Router as ExpressRouter } from 'express';
import type Stripe from 'stripe';
import prisma from '../infrastructure/prisma/client';
import { getStripe, syncSubscription, downgradeToFree, handleInvoicePaymentFailed } from '../services/stripeService';

const router: ExpressRouter = Router();

// Mounted with express.raw() BEFORE the global express.json() parser.
router.post('/', (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    res.status(400).json({ error: 'Missing signature or webhook secret' });
    return;
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[StripeWebhook] Signature verification failed:', err instanceof Error ? err.message : err);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  // Handle async without blocking the response; Stripe retries on non-2xx.
  void (async () => {
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.mode === 'subscription' && typeof session.subscription === 'string') {
            const sub = await getStripe().subscriptions.retrieve(session.subscription);
            await syncSubscription(sub, { fromCheckout: true });
          }
          break;
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.created': {
          await syncSubscription(event.data.object as Stripe.Subscription);
          break;
        }
        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          if (sub.metadata?.userId) {
            await downgradeToFree(sub.metadata.userId, 'canceled');
          } else if (typeof sub.customer === 'string') {
            const user = await prisma.user.findUnique({ where: { stripeCustomerId: sub.customer } });
            if (user) await downgradeToFree(user.id, 'canceled');
          }
          break;
        }
        case 'invoice.payment_failed': {
          await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        }
        default:
          break;
      }
      console.log(`[StripeWebhook] Handled ${event.type}`);
    } catch (error) {
      console.error(`[StripeWebhook] Error handling ${event.type}:`, error);
    }
  })();

  res.json({ received: true });
});

export default router;
