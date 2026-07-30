import { Router, type Router as ExpressRouter } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/jwt';
import * as portfolioService from '../services/portfolioService';

const router: ExpressRouter = Router();
router.use(requireAuth);

// Portfolio CRUD
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, description, currency } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    const portfolio = await portfolioService.createPortfolio(req.user!.id, { name, description, currency });
    res.status(201).json(portfolio);
  } catch (error) {
    res.status(500).json({ error: 'Error creating portfolio' });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const portfolios = await portfolioService.listPortfolios(req.user!.id);
    res.json(portfolios);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching portfolios' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const portfolio = await portfolioService.getPortfolio(req.params.id as string, req.user!.id);
    if (!portfolio) {
      res.status(404).json({ error: 'Portfolio not found' });
      return;
    }
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching portfolio' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;
    const portfolio = await portfolioService.updatePortfolio(req.params.id as string, req.user!.id, { name, description });
    if (!portfolio) {
      res.status(404).json({ error: 'Portfolio not found' });
      return;
    }
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ error: 'Error updating portfolio' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const deleted = await portfolioService.deletePortfolio(req.params.id as string, req.user!.id);
    if (!deleted) {
      res.status(404).json({ error: 'Portfolio not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting portfolio' });
  }
});

// Holdings
router.post('/:id/holdings', async (req: AuthRequest, res) => {
  try {
    const { companyId, quantity, averageCost } = req.body;
    if (!companyId || quantity == null || averageCost == null) {
      res.status(400).json({ error: 'companyId, quantity, and averageCost are required' });
      return;
    }
    const holding = await portfolioService.addHolding(req.params.id as string, req.user!.id, { companyId, quantity, averageCost });
    if (!holding) {
      res.status(404).json({ error: 'Portfolio or company not found' });
      return;
    }
    res.status(201).json(holding);
  } catch (error) {
    res.status(500).json({ error: 'Error adding holding' });
  }
});

router.put('/:id/holdings/:holdingId', async (req: AuthRequest, res) => {
  try {
    const { quantity, averageCost } = req.body;
    const holding = await portfolioService.updateHolding(req.params.holdingId as string, req.params.id as string, req.user!.id, { quantity, averageCost });
    if (!holding) {
      res.status(404).json({ error: 'Holding or portfolio not found' });
      return;
    }
    res.json(holding);
  } catch (error) {
    res.status(500).json({ error: 'Error updating holding' });
  }
});

router.delete('/:id/holdings/:holdingId', async (req: AuthRequest, res) => {
  try {
    const deleted = await portfolioService.removeHolding(req.params.holdingId as string, req.params.id as string, req.user!.id);
    if (!deleted) {
      res.status(404).json({ error: 'Holding or portfolio not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error removing holding' });
  }
});

// Valuation
router.get('/:id/valuation', async (req: AuthRequest, res) => {
  try {
    const valuation = await portfolioService.getPortfolioValuation(req.params.id as string, req.user!.id);
    if (!valuation) {
      res.status(404).json({ error: 'Portfolio not found' });
      return;
    }
    res.json(valuation);
  } catch (error) {
    res.status(500).json({ error: 'Error calculating portfolio valuation' });
  }
});

export default router;
