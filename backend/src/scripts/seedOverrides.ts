import prisma from '../infrastructure/prisma/client';

// Seed known company overrides. These are values the data sources get wrong
// or don't cover, verified manually. Upserts with update:{} so that later
// admin edits via the UI/API are never overwritten by re-running the seed.
const SEED: Array<{ ticker: string; field: string; value: number; source: string }> = [
  // VOW3.DE: Yahoo reports only the preferred share class (206.2M) while the
  // consolidated statements cover the whole company. Total outstanding as of
  // 2025-12-31: 206,205,445 preferred + 295,089,818 ordinary = 501,295,263.
  { ticker: 'VOW3.DE', field: 'sharesOutstanding', value: 501_300_000, source: 'seed:manual' },
  // MRK.DE (Merck KGaA): Yahoo reports only the common shares (129.2M) while
  // the consolidated statements cover all classes. Total ≈ 433.6M.
  { ticker: 'MRK.DE', field: 'sharesOutstanding', value: 433_600_000, source: 'seed:manual' },
  // HEN3.DE: Yahoo reports only the preferred shares in circulation (151.4M).
  // Total in circulation: 151,440,961 preferred + 253,409,961 ordinary ≈ 405M.
  { ticker: 'HEN3.DE', field: 'sharesOutstanding', value: 405_000_000, source: 'seed:manual' },
  // SRT3.DE: Yahoo reports only the preference shares (34.8M). Total
  // outstanding: 34.2M ordinary + 34.8M preference ≈ 69.1M.
  { ticker: 'SRT3.DE', field: 'sharesOutstanding', value: 69_100_000, source: 'seed:manual' },
  // GRF.MC: Yahoo reports only the class A shares (426M). Total share capital:
  // 426,129,798 class A + 261,425,110 class B ≈ 687.6M.
  { ticker: 'GRF.MC', field: 'sharesOutstanding', value: 687_600_000, source: 'seed:manual' },
  // IBE.MC: Yahoo's dividendsPaid only captures part of the scrip dividend.
  // Total shareholder remuneration charged to FY2025 = 4,500M € (0.68 €/share).
  { ticker: 'IBE.MC', field: 'dividendsPaid', value: 4_500_000_000, source: 'seed:manual' },
  // BMW.DE: yfinance balance excludes most of the financial-services arm debt.
  // Consolidated LT debt ≈ 112B → net debt ≈ 93B (cash ≈ 19B).
  { ticker: 'BMW.DE', field: 'longTermDebt', value: 112_000_000_000, source: 'seed:manual' },
  // DTE.DE: yfinance balance omits most lease/other financial liabilities.
  // Official net debt FY2025 = 132.518B € (telekom.com). LT debt set so that
  // netDebt = LT(137.891B) + ST(0) - cash(5.373B) = 132.518B.
  { ticker: 'DTE.DE', field: 'longTermDebt', value: 137_891_000_000, source: 'seed:manual' },
  // Yahoo returns no sharesOutstanding/marketCap for these tickers (quote meta
  // and yfinance info both empty), so resolveShares yields 0 and marketCap is
  // lost. Values from issuer filings:
  //   ALV.DE  Allianz SE      380,418,897 (06/2026, allianz.com capital structure)
  //   CON.DE  Continental AG  200,005,983 (12/2025, continental.com share data)
  //   FRE.DE  Fresenius SE    563,237,277 (12/2025, fresenius.com)
  //   SIE.DE  Siemens AG      782,000,000 (03/2026, siemens.com IR)
  //   MTS.MC  ArcelorMittal   754,041,698 (issued less treasury, arcelormittal.com)
  { ticker: 'ALV.DE', field: 'sharesOutstanding', value: 380_418_897, source: 'seed:manual' },
  { ticker: 'CON.DE', field: 'sharesOutstanding', value: 200_005_983, source: 'seed:manual' },
  { ticker: 'FRE.DE', field: 'sharesOutstanding', value: 563_237_277, source: 'seed:manual' },
  { ticker: 'SIE.DE', field: 'sharesOutstanding', value: 782_000_000, source: 'seed:manual' },
  { ticker: 'MTS.MC', field: 'sharesOutstanding', value: 754_041_698, source: 'seed:manual' },
  // Yahoo reports shares x1000 (scale error): Acciona 54.52B → 54.6M real;
  // Tecnicas Reunidas 78.21B → 79.2M real.
  //   ANA.MC  Acciona S.A.    capital €55M / €1 par ≈ 54,648,412 outstanding (12/2025)
  //   TRE.MC  Tecnicas Reunidas 79,160,101 (07/2026, companiesmarketcap / JGA 2025)
  { ticker: 'ANA.MC', field: 'sharesOutstanding', value: 54_648_412, source: 'seed:manual' },
  { ticker: 'TRE.MC', field: 'sharesOutstanding', value: 79_160_101, source: 'seed:manual' },
];

async function main() {
  for (const s of SEED) {
    const company = await prisma.company.findUnique({ where: { ticker: s.ticker } });
    if (!company) {
      console.log(`[OverrideSeed] ${s.ticker} not found, skipping`);
      continue;
    }
    await prisma.companyOverride.upsert({
      where: { companyId_field: { companyId: company.id, field: s.field } },
      update: {},
      create: {
        companyId: company.id,
        field: s.field,
        value: s.value,
        source: s.source,
      },
    });
    console.log(`[OverrideSeed] ${s.ticker} ${s.field} = ${s.value}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
