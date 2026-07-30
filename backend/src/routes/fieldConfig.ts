import { Router, type Router as ExpressRouter } from 'express';
import { requireAdmin } from '../middleware/auth';
import prisma from '../infrastructure/prisma/client';
import {
  FIELD_MAPPING_CATALOG,
  FIELD_CATEGORIES,
  type FieldCategory,
} from '../data/fieldMappingCatalog';
import { batchResyncCompanies } from '../services/dataAggregator';

const router: ExpressRouter = Router();

router.use(requireAdmin);

type SourceKey = 'sec' | 'european' | 'yahoo';

// GET /api/admin/field-config — full catalog with DB overrides
router.get('/field-config', async (_req, res) => {
  try {
    const dbConfigs = await prisma.fieldConfig.findMany();
    const configMap = new Map<string, { customTags: string[]; active: boolean }>();
    for (const c of dbConfigs) {
      configMap.set(`${c.fieldName}:${c.source}`, { customTags: c.customTags, active: c.active });
    }

    const catalog = FIELD_MAPPING_CATALOG.map((entry) => {
      const sources = {} as Record<SourceKey, { baseTags: string[]; customTags: string[]; active: boolean }>;
      for (const src of ['sec', 'european', 'yahoo'] as SourceKey[]) {
        const dbConfig = configMap.get(`${entry.fieldName}:${src}`);
        sources[src] = {
          baseTags: entry.sources[src] || [],
          customTags: dbConfig?.customTags || [],
          active: dbConfig?.active ?? true,
        };
      }
      return {
        fieldName: entry.fieldName,
        label: entry.label,
        category: entry.category,
        description: entry.description,
        sources,
      };
    });

    const categories = Object.entries(FIELD_CATEGORIES).map(([id, info]) => ({
      id,
      label: info.label,
      color: info.color,
    }));

    res.json({ catalog, categories });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching field config' });
  }
});

// PUT /api/admin/field-config — update single field+source config
router.put('/field-config', async (req, res) => {
  try {
    const { fieldName, source, customTags, active } = req.body;
    if (!fieldName || !source) {
      res.status(400).json({ error: 'fieldName and source are required' });
      return;
    }

    const data: Record<string, unknown> = {};
    if (customTags !== undefined) data.customTags = customTags;
    if (active !== undefined) data.active = active;

    await prisma.fieldConfig.upsert({
      where: { fieldName_source: { fieldName, source } },
      update: data,
      create: {
        fieldName,
        source,
        customTags: customTags || [],
        active: active ?? true,
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error updating field config' });
  }
});

// PUT /api/admin/field-config/bulk — bulk update
router.put('/field-config/bulk', async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) {
      res.status(400).json({ error: 'updates array is required' });
      return;
    }

    for (const update of updates) {
      const { fieldName, source, customTags, active } = update;
      if (!fieldName || !source) continue;

      const data: Record<string, unknown> = {};
      if (customTags !== undefined) data.customTags = customTags;
      if (active !== undefined) data.active = active;

      await prisma.fieldConfig.upsert({
        where: { fieldName_source: { fieldName, source } },
        update: data,
        create: {
          fieldName,
          source,
          customTags: customTags || [],
          active: active ?? true,
        },
      });
    }

    res.json({ success: true, updated: updates.length });
  } catch (error) {
    res.status(500).json({ error: 'Error updating field configs' });
  }
});

// POST /api/admin/field-config/apply — re-sync all companies with current config (SSE)
router.post('/field-config/apply', async (req, res) => {
  const { years = 5 } = req.body;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const totalCompanies = await prisma.company.count();
  res.write(`data: ${JSON.stringify({ type: 'start', total: totalCompanies })}\n\n`);

  try {
    // Clear caches so European data picks up new config
    const { clearEuropeanCustomTagsCache, clearConceptMappingsCache } = await import('../services/europeanData');
    clearEuropeanCustomTagsCache();
    clearConceptMappingsCache();

    const result = await batchResyncCompanies(
      Math.min(Math.max(parseInt(years) || 5, 1), 10),
      (progress) => {
        res.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`);
      },
    );

    res.write(`data: ${JSON.stringify({ type: 'complete', ...result })}\n\n`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.write(`data: ${JSON.stringify({ type: 'error', error: msg })}\n\n`);
  }

  res.end();
});

// GET /api/admin/concept-mappings — list all learned mappings
router.get('/concept-mappings', async (_req, res) => {
  try {
    const mappings = await prisma.conceptMapping.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(mappings);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching concept mappings' });
  }
});

// POST /api/admin/concept-mappings — save new mapping
router.post('/concept-mappings', async (req, res) => {
  try {
    const { conceptName, fieldName, source, confirmedBy } = req.body;
    if (!conceptName || !fieldName) {
      res.status(400).json({ error: 'conceptName and fieldName are required' });
      return;
    }

    const mapping = await prisma.conceptMapping.upsert({
      where: { conceptName },
      update: { fieldName, source: source || 'european', confirmedBy: confirmedBy || 'admin' },
      create: {
        conceptName,
        fieldName,
        source: source || 'european',
        confirmedBy: confirmedBy || 'admin',
      },
    });

    // Clear in-memory cache so next extraction picks it up
    const { clearConceptMappingsCache } = await import('../services/europeanData');
    clearConceptMappingsCache();

    res.status(201).json(mapping);
  } catch (error) {
    res.status(500).json({ error: 'Error saving concept mapping' });
  }
});

// DELETE /api/admin/concept-mappings/:id — remove mapping
router.delete('/concept-mappings/:id', async (req, res) => {
  try {
    await prisma.conceptMapping.delete({ where: { id: req.params.id } });
    const { clearConceptMappingsCache } = await import('../services/europeanData');
    clearConceptMappingsCache();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting concept mapping' });
  }
});

export default router;
