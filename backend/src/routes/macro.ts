import { Router, type Router as ExpressRouter } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/jwt';
import {
  canAccessMacro,
  getMacroIndices,
  isMacroPeriod,
  type MacroPeriod,
} from '../services/macroService';

const router: ExpressRouter = Router();

router.get('/indices', requireAuth, async (req: AuthRequest, res) => {
  try {
    const allowed = await canAccessMacro(req.user!.id);
    if (!allowed) {
      res.status(403).json({ error: 'premium_required' });
      return;
    }

    const periodParam = req.query.period;
    if (periodParam !== undefined && !isMacroPeriod(periodParam)) {
      res.status(400).json({ error: 'Invalid period' });
      return;
    }

    const period: MacroPeriod = periodParam === undefined ? '1m' : periodParam;
    const data = await getMacroIndices(period);
    res.json(data);
  } catch (error) {
    console.error('[Macro] Error fetching macro indices:', error);
    res.status(500).json({ error: 'Error fetching macro indices' });
  }
});

export default router;
