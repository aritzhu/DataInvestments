import cron from 'node-cron';
import { refreshAllQuotes } from './services/refreshQuotes';
import { resyncStaleCompanies } from './scripts/resyncStale';

const running = new Set<string>();

async function runOnce(name: string, fn: () => Promise<void>) {
  if (running.has(name)) {
    console.log(`[Worker] ${name} ya en ejecucion, se omite esta corrida`);
    return;
  }
  running.add(name);
  try {
    console.log(`[Worker] ${name} iniciado`);
    await fn();
    console.log(`[Worker] ${name} terminado`);
  } catch (err) {
    console.error(`[Worker] ${name} ERROR: ${err instanceof Error ? err.message : err}`);
  } finally {
    running.delete(name);
  }
}

// Quotes + ratios TTM diarios (06:00 UTC)
cron.schedule('0 6 * * *', () => {
  void runOnce('refresh-quotes', async () => {
    const result = await refreshAllQuotes();
    console.log(`[Worker] refresh-quotes refreshed=${result.refreshed} skipped=${result.skipped}`);
  });
});

// Fundamentals semanales incrementales (lunes 07:30 UTC)
cron.schedule('30 7 * * 1', () => {
  void runOnce('resync-fundamentals', async () => {
    await resyncStaleCompanies({ staleDays: 7 });
  });
});

console.log('[Worker] sync-worker iniciado. Quotes diarias 06:00, fundamentals semanales lunes 07:30 (UTC).');

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    console.log(`[Worker] recibido ${sig}, saliendo`);
    process.exit(0);
  });
}
