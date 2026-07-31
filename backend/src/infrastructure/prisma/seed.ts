import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Admin user ──
  const adminEmail = 'admin@datainvestments.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin',
        passwordHash,
        role: 'admin',
      },
    });
    console.log(`Admin user created: ${adminEmail} / admin123`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  // ── Companies ──
  const apple = await prisma.company.upsert({
    where: { ticker: 'AAPL' },
    update: {},
    create: {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
      ceo: 'Tim Cook',
      employees: 164000,
      country: 'US',
      exchange: 'NASDAQ',
      website: 'https://www.apple.com',
      ipoDate: '1980-12-12',
    },
  });

  const microsoft = await prisma.company.upsert({
    where: { ticker: 'MSFT' },
    update: {},
    create: {
      ticker: 'MSFT',
      name: 'Microsoft Corporation',
      sector: 'Technology',
      industry: 'Software',
      description: 'Microsoft Corporation develops and supports software, services, devices and solutions worldwide.',
      ceo: 'Satya Nadella',
      employees: 228000,
      country: 'US',
      exchange: 'NASDAQ',
      website: 'https://www.microsoft.com',
      ipoDate: '1986-03-13',
    },
  });

  const google = await prisma.company.upsert({
    where: { ticker: 'GOOGL' },
    update: {},
    create: {
      ticker: 'GOOGL',
      name: 'Alphabet Inc.',
      sector: 'Technology',
      industry: 'Internet Content',
      description: 'Alphabet Inc. offers various products and platforms in the United States, Europe, the Middle East, Africa, the Asia-Pacific, Canada, and Latin America.',
      ceo: 'Sundar Pichai',
      employees: 183000,
      country: 'US',
      exchange: 'NASDAQ',
      website: 'https://abc.xyz',
      ipoDate: '2004-08-19',
    },
  });

  // ── Apple FY2024 ──
  await prisma.financialData.upsert({
    where: { companyId_year_quarter: { companyId: apple.id, year: 2024, quarter: 0 } },
    update: {},
    create: {
      companyId: apple.id, year: 2024, quarter: 0,
      revenue: 391035000000, costOfRevenue: 214137000000, grossProfit: 176898000000,
      operatingExpenses: 54847000000, sgaExpense: 26094000000, rdExpense: 30522000000,
      interestExpense: 2924000000, taxExpense: 13712000000, netIncome: 93736000000,
      ebitda: 134661000000, ebit: 123216000000,
      capex: 9959000000, depreciation: 11445000000,
      operatingCashFlow: 118254000000, investingCashFlow: -3075000000, financingCashFlow: -109120000000,
      freeCashFlow: 108295000000, dividendsPaid: 15234000000, shareRepurchases: 94949000000,
      totalAssets: 364989000000, totalLiabilities: 308029000000, totalEquity: 56960000000,
    },
  });

  await prisma.stockMetric.upsert({
    where: { companyId_date: { companyId: apple.id, date: new Date('2025-01-15') } },
    update: {},
    create: {
      companyId: apple.id, date: new Date('2025-01-15'),
      currentPrice: 234.82, peRatio: 35.2, pbRatio: 45.6, psRatio: 8.9,
      dividendYield: 0.0044, marketCap: 3600000000000, enterpriseValue: 3650000000000,
      sharesOutstanding: 15170000000,
      roe: 1.68, roa: 0.257, roic: 0.56,
      currentRatio: 0.99, debtToEquity: 1.78, altmanZ: 3.2, piotroskiScore: 7,
      intrinsicValue: 280.0, marginOfSafety: 0.161,
    },
  });

  await prisma.balanceSheet.upsert({
    where: { companyId_year_quarter: { companyId: apple.id, year: 2024, quarter: 0 } },
    update: {},
    create: {
      companyId: apple.id, year: 2024, quarter: 0,
      cashAndCashEquivalents: 29943000000, shortTermInvestments: 35228000000,
      accountsReceivable: 65375000000, inventory: 7291000000,
      totalCurrentAssets: 143567000000,
      propertyPlantEquipment: 43634000000, goodwill: 0, intangibleAssets: 0,
      totalNonCurrentAssets: 221422000000, totalAssets: 364989000000,
      accountsPayable: 68960000000, shortTermDebt: 18690000000,
      totalCurrentLiabilities: 145308000000,
      longTermDebt: 85750000000, totalNonCurrentLiabilities: 162721000000,
      totalLiabilities: 308029000000,
      totalStockholdersEquity: 56960000000, retainedEarnings: 0, treasuryStock: 0,
    },
  });

  // ── Microsoft FY2024 ──
  await prisma.financialData.upsert({
    where: { companyId_year_quarter: { companyId: microsoft.id, year: 2024, quarter: 0 } },
    update: {},
    create: {
      companyId: microsoft.id, year: 2024, quarter: 0,
      revenue: 245122000000, costOfRevenue: 74125000000, grossProfit: 170997000000,
      operatingExpenses: 61894000000, sgaExpense: 29471000000, rdExpense: 29510000000,
      interestExpense: 1862000000, taxExpense: 9201000000, netIncome: 88136000000,
      ebitda: 129839000000, ebit: 114816000000,
      capex: 44480000000, depreciation: 15023000000,
      operatingCashFlow: 119431000000, investingCashFlow: -57481000000, financingCashFlow: -62717000000,
      freeCashFlow: 74951000000, dividendsPaid: 21779000000, shareRepurchases: 18915000000,
      totalAssets: 484265000000, totalLiabilities: 239639000000, totalEquity: 244626000000,
    },
  });

  await prisma.stockMetric.upsert({
    where: { companyId_date: { companyId: microsoft.id, date: new Date('2025-01-15') } },
    update: {},
    create: {
      companyId: microsoft.id, date: new Date('2025-01-15'),
      currentPrice: 422.86, peRatio: 36.8, pbRatio: 12.1, psRatio: 13.2,
      dividendYield: 0.0074, marketCap: 3140000000000, enterpriseValue: 3180000000000,
      sharesOutstanding: 7430000000,
      roe: 0.36, roa: 0.182, roic: 0.29,
      currentRatio: 1.77, debtToEquity: 0.35, altmanZ: 5.1, piotroskiScore: 8,
      intrinsicValue: 480.0, marginOfSafety: 0.119,
    },
  });

  await prisma.balanceSheet.upsert({
    where: { companyId_year_quarter: { companyId: microsoft.id, year: 2024, quarter: 0 } },
    update: {},
    create: {
      companyId: microsoft.id, year: 2024, quarter: 0,
      cashAndCashEquivalents: 34602000000, shortTermInvestments: 76327000000,
      accountsReceivable: 56865000000, inventory: 3028000000,
      totalCurrentAssets: 171111000000,
      propertyPlantEquipment: 143443000000, goodwill: 119409000000, intangibleAssets: 49680000000,
      totalNonCurrentAssets: 313154000000, totalAssets: 484265000000,
      accountsPayable: 24000000000, shortTermDebt: 22500000000,
      totalCurrentLiabilities: 97034000000,
      longTermDebt: 166303000000, totalNonCurrentLiabilities: 142605000000,
      totalLiabilities: 239639000000,
      totalStockholdersEquity: 244626000000, retainedEarnings: 0, treasuryStock: 0,
    },
  });

  // ── Google FY2024 ──
  await prisma.financialData.upsert({
    where: { companyId_year_quarter: { companyId: google.id, year: 2024, quarter: 0 } },
    update: {},
    create: {
      companyId: google.id, year: 2024, quarter: 0,
      revenue: 350018000000, costOfRevenue: 152852000000, grossProfit: 197166000000,
      operatingExpenses: 97886000000, sgaExpense: 37912000000, rdExpense: 52470000000,
      interestExpense: 1085000000, taxExpense: 16534000000, netIncome: 100736000000,
      ebitda: 112392000000, ebit: 99496000000,
      capex: 32287000000, depreciation: 12896000000,
      operatingCashFlow: 125301000000, investingCashFlow: -51496000000, financingCashFlow: -80750000000,
      freeCashFlow: 93014000000, dividendsPaid: 0, shareRepurchases: 62200000000,
      totalAssets: 402392000000, totalLiabilities: 110840000000, totalEquity: 291552000000,
    },
  });

  await prisma.stockMetric.upsert({
    where: { companyId_date: { companyId: google.id, date: new Date('2025-01-15') } },
    update: {},
    create: {
      companyId: google.id, date: new Date('2025-01-15'),
      currentPrice: 192.53, peRatio: 23.5, pbRatio: 7.8, psRatio: 7.2,
      dividendYield: 0, marketCap: 2370000000000, enterpriseValue: 2300000000000,
      sharesOutstanding: 12300000000,
      roe: 0.346, roa: 0.25, roic: 0.42,
      currentRatio: 1.75, debtToEquity: 0.12, altmanZ: 8.5, piotroskiScore: 8,
      intrinsicValue: 240.0, marginOfSafety: 0.198,
    },
  });

  await prisma.balanceSheet.upsert({
    where: { companyId_year_quarter: { companyId: google.id, year: 2024, quarter: 0 } },
    update: {},
    create: {
      companyId: google.id, year: 2024, quarter: 0,
      cashAndCashEquivalents: 95647000000, shortTermInvestments: 72463000000,
      accountsReceivable: 53062000000, inventory: 14420000000,
      totalCurrentAssets: 178636000000,
      propertyPlantEquipment: 135338000000, goodwill: 33376000000, intangibleAssets: 14640000000,
      totalNonCurrentAssets: 223756000000, totalAssets: 402392000000,
      accountsPayable: 23900000000, shortTermDebt: 4068000000,
      totalCurrentLiabilities: 102064000000,
      longTermDebt: 67650000000, totalNonCurrentLiabilities: 8776000000,
      totalLiabilities: 110840000000,
      totalStockholdersEquity: 291552000000, retainedEarnings: 0, treasuryStock: 0,
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
