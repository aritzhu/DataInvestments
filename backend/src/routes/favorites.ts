import { Router, type Router as ExpressRouter } from 'express';
import { requireAuth } from '../middleware/auth';
import prisma from '../infrastructure/prisma/client';

const router: ExpressRouter = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.session.userId! },
      include: {
        company: {
          select: {
            id: true, ticker: true, name: true, sector: true, industry: true, website: true, logoUrl: true,
            stockMetrics: { orderBy: { date: 'desc' }, take: 1 },
            financialData: { orderBy: [{ year: 'desc' }, { quarter: 'desc' }], take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching favorites' });
  }
});

router.post('/:companyId', requireAuth, async (req, res) => {
  try {
    const companyId = req.params.companyId as string;
    const userId = req.session.userId!;

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const existing = await prisma.favorite.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });

    if (existing) {
      res.status(409).json({ error: 'Already in favorites' });
      return;
    }

    const favorite = await prisma.favorite.create({
      data: { userId, companyId },
      include: { company: { select: { id: true, ticker: true, name: true, sector: true, industry: true, website: true, logoUrl: true } } },
    });

    res.status(201).json(favorite);
  } catch (error) {
    res.status(500).json({ error: 'Error adding favorite' });
  }
});

router.delete('/:companyId', requireAuth, async (req, res) => {
  try {
    const companyId = req.params.companyId as string;
    const userId = req.session.userId!;

    await prisma.favorite.deleteMany({
      where: { userId, companyId },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error removing favorite' });
  }
});

export default router;
