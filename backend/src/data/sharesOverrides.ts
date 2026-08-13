// Code-driven share overrides. These are authoritative fixes for tickers where
// upstream sources (yfinance / XBRL) report a wrong share count, e.g. covering
// only one share class (preferred stock) or an inconsistent count, while the
// consolidated income statement / balance sheet cover the whole company.
//
// Code overrides always win over CompanyOverride table entries (see
// applyCompanyOverrides), so re-syncs keep these values.
export const SHARES_OVERRIDES: Record<string, number> = {
  'VOW3.DE': 590500000,
  'AIR.PA': 795000000,
  'MC.PA': 501000000,
  'ITX.MC': 3116115505,
};
