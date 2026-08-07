import prisma from '../infrastructure/prisma/client';
import { refreshAllQuotes } from '../services/refreshQuotes';

async function main() {
  const result = await refreshAllQuotes();
  console.log(`\nDone. refreshed=${result.refreshed}, skipped=${result.skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
