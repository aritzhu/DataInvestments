import prisma from '../infrastructure/prisma/client';
import { computeDCF, getSectorConfigs } from '../services/valuationService';

interface Flag {
  ticker: string;
  kd: string;
  wacc: string;
  waccRaw: string;
  terminalWeight: string;
  notes: string[];
}

const FLAG_WACC = 0.05;
const FLAG_TERMINAL = 0.75;
const RF = 0.03;

async function main() {
  const companies = await prisma.company.findMany({
    where: { active: true, stockMetrics: { some: {} } },
    select: { id: true, ticker: true, name: true, sector: true, industry: true },
    orderBy: { ticker: 'asc' },
  });

  const flags: Flag[] = [];

  for (const c of companies) {
    const [financials, balanceSheets, stockMetrics] = await Promise.all([
      prisma.financialData.findMany({ where: { companyId: c.id }, orderBy: [{ year: 'desc' }, { quarter: 'desc' }] }),
      prisma.balanceSheet.findMany({ where: { companyId: c.id }, orderBy: [{ year: 'desc' }, { quarter: 'desc' }] }),
      prisma.stockMetric.findMany({ where: { companyId: c.id }, orderBy: { date: 'desc' }, take: 1 }),
    ]);

    const stock = stockMetrics[0];
    if (!stock || financials.length === 0) continue;

    const configs = getSectorConfigs(c.sector, c.industry);
    const input = { financials: financials as never, balanceSheets: balanceSheets as never, stock };
    const dcf = computeDCF(input, configs.dcf, c.sector, c.industry);

    if (dcf.fairValue == null) continue;

    const find = (label: string) => dcf.inputs.find((i) => i.label.startsWith(label))?.rawValue;
    const kd = find('Kd');
    const wacc = find('WACC = Ke');
    const weight = dcf.terminalValue?.weight;
    const terminalGrowth = find('Terminal growth');

    const notes: string[] = [];
    if (kd != null && kd < RF * 100) notes.push(`Kd ${kd.toFixed(2)}% < risk-free`);
    if (wacc != null && wacc < FLAG_WACC * 100) notes.push(`WACC ${wacc.toFixed(2)}% < suelo ${FLAG_WACC * 100}%`);
    if (weight != null && weight > FLAG_TERMINAL) notes.push(`peso valor terminal ${(weight * 100).toFixed(0)}% > ${FLAG_TERMINAL * 100}%`);
    if (notes.length === 0) continue;

    flags.push({
      ticker: c.ticker,
      kd: kd != null ? `${kd.toFixed(2)}%` : '—',
      wacc: wacc != null ? `${wacc.toFixed(2)}%` : '—',
      waccRaw: terminalGrowth != null ? `tg ${terminalGrowth.toFixed(1)}%` : '—',
      terminalWeight: weight != null ? `${(weight * 100).toFixed(0)}%` : '—',
      notes,
    });
  }

  console.log(`\nEmpresas auditadas: ${companies.length}`);
  console.log(`Con supuestos dudosos: ${flags.length}\n`);

  if (flags.length === 0) {
    console.log('Ninguna. Todos los WACC y pesos del valor terminal estan en rango.');
    return;
  }

  for (const f of flags) {
    console.log(`${f.ticker.padEnd(10)} Kd=${f.kd.padEnd(8)} WACC=${f.wacc.padEnd(8)} pesoTV=${f.terminalWeight.padEnd(6)} ${f.notes.join('; ')}`);
  }

  console.log('\nCausas tipicas:');
  console.log('  - Kd por debajo del risk-free: la deuda registrada incluye arrendamientos o el gasto de intereses cubre un periodo incompleto.');
  console.log('  - WACC bajo: estructural, por apalancamiento alto. Suele combinarse con un beta bajo (utilities reguladas).');
  console.log('  - Peso del valor terminal alto: horizonte corto o spread (r - tg) estrecho. Alargar el horizonte lo reparte.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
