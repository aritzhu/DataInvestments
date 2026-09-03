import { Router, type Router as ExpressRouter } from 'express';
import { fetchYahooQuote } from '../services/yahoo';

const router: ExpressRouter = Router();

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; price: number; name: string; currency: string }>();

async function fetchCommodityPrice(symbol: string): Promise<{ price: number; name: string; currency: string } | null> {
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { price: cached.price, name: cached.name, currency: cached.currency };
  }

  const quote = await fetchYahooQuote(symbol);
  if (!quote || quote.currentPrice <= 0) return null;

  const data = { price: quote.currentPrice, name: quote.name, currency: quote.currency || 'USD' };
  cache.set(symbol, { at: Date.now(), ...data });
  return data;
}

router.get('/prices', async (req, res) => {
  try {
    const raw = req.query.symbols;
    const symbols = typeof raw === 'string' ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];

    if (symbols.length === 0) {
      res.json({ prices: {} });
      return;
    }

    const entries: Array<[string, { price: number; name: string; currency: string }] | null> = await Promise.all(
      symbols.map(async (symbol) => {
        const data = await fetchCommodityPrice(symbol);
        return data ? [symbol, data] : null;
      })
    );

    const prices: Record<string, { price: number; name: string; currency: string }> = {};
    for (const entry of entries) {
      if (entry) prices[entry[0]] = entry[1];
    }

    res.json({ prices });
  } catch (error) {
    console.error('[Commodities] Error fetching commodity prices:', error);
    res.status(500).json({ error: 'Error fetching commodity prices' });
  }
});

export default router;
