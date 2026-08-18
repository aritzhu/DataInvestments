import { Router, type Router as ExpressRouter } from 'express';
import { trackEvent, getOverview, getTopEvents, getDailyCounts } from '../services/analytics.service';
import { requireAdmin } from '../middleware/jwt';

const router: ExpressRouter = Router();

router.post('/event', async (req, res) => {
  try {
    const { event, page, params } = req.body;
    if (!event || typeof event !== 'string') {
      res.status(400).json({ error: 'Event name is required' });
      return;
    }
    await trackEvent({ event, page, params });
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Analytics track error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

router.get('/overview', requireAdmin, async (_req, res) => {
  try {
    const data = await getOverview();
    res.json(data);
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/top-events', requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const data = await getTopEvents(days);
    res.json(data);
  } catch (error) {
    console.error('Analytics top events error:', error);
    res.status(500).json({ error: 'Failed to fetch top events' });
  }
});

router.get('/daily', requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const data = await getDailyCounts(days);
    res.json(data);
  } catch (error) {
    console.error('Analytics daily error:', error);
    res.status(500).json({ error: 'Failed to fetch daily counts' });
  }
});

export default router;
