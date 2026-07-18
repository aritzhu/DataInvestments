import { Router, type Router as ExpressRouter } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { fetchYahooQuote } from '../services/yahoo';
import { computeAll, weightedAverage, getVerdict, getSectorConfigs } from '../services/valuationService';

const router: ExpressRouter = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const alarms = await prisma.alarm.findMany({
      where: { userId: req.session.userId! },
      include: {
        company: { select: { id: true, ticker: true, name: true, sector: true, industry: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(alarms);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching alarms' });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { companyId, targetVerdict } = req.body;

    if (!companyId || !targetVerdict) {
      res.status(400).json({ error: 'companyId and targetVerdict are required' });
      return;
    }

    if (!['buy', 'hold', 'sell'].includes(targetVerdict)) {
      res.status(400).json({ error: 'targetVerdict must be buy, hold, or sell' });
      return;
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const existing = await prisma.alarm.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });

    if (existing) {
      res.status(409).json({ error: 'Alarm already exists for this company' });
      return;
    }

    // Compute initial valuation
    let lastVerdict: string | null = null;
    let lastPrice: number | null = null;
    let triggered = false;

    try {
      const [financials, balanceSheets, stockMetrics] = await Promise.all([
        prisma.financialData.findMany({ where: { companyId }, orderBy: [{ year: 'desc' }, { quarter: 'desc' }] }),
        prisma.balanceSheet.findMany({ where: { companyId }, orderBy: [{ year: 'desc' }, { quarter: 'desc' }] }),
        prisma.stockMetric.findMany({ where: { companyId }, orderBy: { date: 'desc' }, take: 1 }),
      ]);

      const stock = stockMetrics[0];
      if (stock && financials.length > 0) {
        const configs = getSectorConfigs(company.sector, company.industry);
        const input = { financials, balanceSheets, stock };
        const results = computeAll(input, configs);
        const avg = weightedAverage(results);
        lastVerdict = getVerdict(avg, stock.currentPrice);
        lastPrice = stock.currentPrice;
        triggered = lastVerdict === targetVerdict;
      }
    } catch {
      // Ignore valuation errors on creation
    }

    const alarm = await prisma.alarm.create({
      data: {
        userId,
        companyId,
        targetVerdict,
        lastVerdict,
        lastPrice,
        lastCheckedAt: lastPrice ? new Date() : null,
        triggered,
      },
      include: {
        company: { select: { id: true, ticker: true, name: true, sector: true, industry: true } },
      },
    });

    res.status(201).json(alarm);
  } catch (error) {
    res.status(500).json({ error: 'Error creating alarm' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const userId = req.session.userId!;
    const alarmId = req.params.id as string;

    const existing = await prisma.alarm.findUnique({ where: { id: alarmId } });
    if (!existing || existing.userId !== userId) {
      res.status(404).json({ error: 'Alarm not found' });
      return;
    }

    const { targetVerdict } = req.body;

    if (targetVerdict && !['buy', 'hold', 'sell'].includes(targetVerdict)) {
      res.status(400).json({ error: 'targetVerdict must be buy, hold, or sell' });
      return;
    }

    const alarm = await prisma.alarm.update({
      where: { id: alarmId },
      data: {
        targetVerdict: targetVerdict ?? existing.targetVerdict,
        triggered: false,
        lastVerdict: null,
        lastPrice: null,
        lastCheckedAt: null,
      },
      include: {
        company: { select: { id: true, ticker: true, name: true, sector: true, industry: true } },
      },
    });

    res.json(alarm);
  } catch (error) {
    res.status(500).json({ error: 'Error updating alarm' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = req.session.userId!;
    const alarmId = req.params.id as string;

    const existing = await prisma.alarm.findUnique({ where: { id: alarmId } });
    if (!existing || existing.userId !== userId) {
      res.status(404).json({ error: 'Alarm not found' });
      return;
    }

    await prisma.alarm.delete({ where: { id: alarmId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting alarm' });
  }
});

// Manual trigger (admin only)
router.post('/check', async (req, res) => {
  try {
    const userId = req.session.userId!;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Admin only' });
      return;
    }
    const result = await checkAllAlarms();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error checking alarms' });
  }
});

export async function checkAllAlarms() {
  const alarms = await prisma.alarm.findMany({
    where: { triggered: false },
    include: {
      company: { select: { id: true, ticker: true, name: true, sector: true, industry: true } },
    },
  });

  let checked = 0;
  let triggered = 0;

  for (const alarm of alarms) {
    try {
      const [financials, balanceSheets, stockMetrics] = await Promise.all([
        prisma.financialData.findMany({ where: { companyId: alarm.companyId }, orderBy: [{ year: 'desc' }, { quarter: 'desc' }] }),
        prisma.balanceSheet.findMany({ where: { companyId: alarm.companyId }, orderBy: [{ year: 'desc' }, { quarter: 'desc' }] }),
        prisma.stockMetric.findMany({ where: { companyId: alarm.companyId }, orderBy: { date: 'desc' }, take: 1 }),
      ]);

      const stock = stockMetrics[0];
      if (!stock || financials.length === 0) continue;

      // Try to get fresh price from Yahoo
      let currentPrice = stock.currentPrice;
      try {
        const quote = await fetchYahooQuote(alarm.company.ticker);
        if (quote) currentPrice = quote.currentPrice;
      } catch {
        // Use last known price
      }

      const configs = getSectorConfigs(alarm.company.sector, alarm.company.industry);
      const input = { financials, balanceSheets, stock: { ...stock, currentPrice } };
      const results = computeAll(input, configs);
      const avg = weightedAverage(results);
      const verdict = getVerdict(avg, currentPrice);

      const isTriggered = verdict === alarm.targetVerdict;

      await prisma.alarm.update({
        where: { id: alarm.id },
        data: {
          lastVerdict: verdict,
          lastPrice: currentPrice,
          lastCheckedAt: new Date(),
          triggered: isTriggered,
        },
      });

      checked++;
      if (isTriggered) triggered++;

      // Rate limit: 200ms between companies
      await new Promise((r) => setTimeout(r, 200));
    } catch {
      // Skip failed alarms
    }
  }

  return { checked, triggered, total: alarms.length };
}

export default router;
