# Internal Model

## Overview

All financial data is normalized into a provider-independent internal model before storage. Business logic, valuation calculations, and the frontend only operate on this model.

## Models

### FinancialData (Income Statement + Cash Flow summary)

| Field | Type | Source | Notes |
|---|---|---|---|
| revenue | Float | IS | Required |
| costOfRevenue | Float | IS | Required |
| grossProfit | Float? | IS | Computed if missing |
| operatingExpenses | Float | IS | Required |
| sgaExpense | Float | IS | 0 if unavailable |
| rdExpense | Float | IS | 0 if unavailable |
| interestExpense | Float | IS | Required |
| taxExpense | Float | IS | Required |
| netIncome | Float | IS | Required |
| ebitda | Float? | IS | Computed: EBIT + Depreciation |
| ebit | Float? | IS | Operating Income |
| capex | Float | CF | Required |
| depreciation | Float | CF | Required |
| operatingCashFlow | Float? | CF | |
| investingCashFlow | Float? | CF | |
| financingCashFlow | Float? | CF | |
| freeCashFlow | Float? | CF | Computed: OCF - CapEx |
| dividendsPaid | Float? | CF | |
| shareRepurchases | Float? | CF | |
| totalAssets | Float? | BS | Summary |
| totalLiabilities | Float? | BS | Summary |
| totalEquity | Float? | BS | Summary |

### BalanceSheet

Granular balance sheet fields: cash, receivables, inventory, currentAssets, PPE, goodwill, intangibles, accountsPayable, shortTermDebt, longTermDebt, retainedEarnings, etc.

### StockMetric

Market data: currentPrice, peRatio, pbRatio, psRatio, marketCap, enterpriseValue, sharesOutstanding, roe, roa, etc.

## Normalization

1. XBRL facts → extract annual values (year-based, quarter=0).
2. Map using `fieldMappingCatalog.ts` + `FieldConfig` (custom tags) + `ConceptMapping` (learned).
3. Compute derived fields where direct extraction is unavailable.
4. Upsert into Prisma models using `(companyId, year, quarter)` unique constraint.
