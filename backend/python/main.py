from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
import time
import traceback
import threading

app = FastAPI(title="yfinance-service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_crumb_lock = threading.Lock()
_session = requests.Session()
_session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
})
_crumb: str | None = None
_crumb_time: float = 0
_CRUMB_TTL = 300

# App ticker → Yahoo native symbol where Yahoo uses a different format.
SYMBOL_OVERRIDES = {
    "STM.PA": "STMPA.PA",
    "STM.MI": "STMMI.MI",
}


def _resolve_symbol(ticker: str) -> str:
    return SYMBOL_OVERRIDES.get(ticker.upper(), ticker)


def _ensure_crumb():
    global _crumb, _crumb_time
    with _crumb_lock:
        if _crumb and (time.time() - _crumb_time) < _CRUMB_TTL:
            return _crumb
        try:
            _session.get("https://fc.yahoo.com", timeout=10)
            r = _session.get("https://query2.finance.yahoo.com/v1/test/getcrumb", timeout=10)
            if r.status_code == 200:
                _crumb = r.text
                _crumb_time = time.time()
                print(f"[yfinance] Got crumb: {_crumb[:10]}...")
                return _crumb
        except Exception as e:
            print(f"[yfinance] Crumb fetch failed: {e}")
    return None


@app.get("/health")
async def health():
    crumb = _ensure_crumb()
    return {"status": "ok", "crumb": crumb is not None}


# ── fundamentals-timeseries helper ──────────────────────────────────────────

# All quarterly field types we request from the timeseries endpoint.
# Grouped by category for readability.
_INCOME_FIELDS = [
    "quarterlyTotalRevenue",
    "quarterlyCostOfRevenue",
    "quarterlyGrossProfit",
    "quarterlyOperatingExpense",
    "quarterlyOperatingIncome",
    "quarterlyEBITDA",
    "quarterlyNetIncome",
    "quarterlyNetIncomeCommonStockholders",
    "quarterlyTaxProvision",
    "quarterlyBasicEPS",
    "quarterlyDilutedEPS",
    "quarterlySellingGeneralAndAdministration",
    "quarterlyResearchAndDevelopment",
    "quarterlyInterestExpense",
    "quarterlyDepreciationAndAmortizationInIncomeStatement",
    "quarterlyReconciledDepreciation",
]

_BALANCE_FIELDS = [
    "quarterlyTotalAssets",
    "quarterlyCurrentAssets",
    "quarterlyCurrentLiabilities",
    "quarterlyStockholdersEquity",
    "quarterlyCashAndCashEquivalents",
    "quarterlyNetPPE",
    "quarterlyGoodwill",
    "quarterlyIntangibleAssets",
    "quarterlyLongTermDebt",
    "quarterlyShortTermDebt",
    "quarterlyRetainedEarnings",
    "quarterlyInventory",
    "quarterlyOtherShortTermInvestments",
    "quarterlyTotalNonCurrentAssets",
    "quarterlyTotalNonCurrentLiabilities",
    "quarterlyTotalLiabilities",
    "quarterlyAccountsReceivable",
    "quarterlyAccountsPayable",
    "quarterlyTreasuryStock",
]

_CASHFLOW_FIELDS = [
    "quarterlyCapitalExpenditure",
    "quarterlyFreeCashFlow",
    "quarterlyCashDividendsPaid",
    "quarterlyRepurchaseOfCapitalStock",
    "quarterlyOperatingCashFlow",
    "quarterlyCashFlowFromContinuingOperatingActivities",
    "quarterlyCashFlowFromContinuingInvestingActivities",
    "quarterlyCashFlowFromContinuingFinancingActivities",
]

ALL_QUARTERLY_FIELDS = _INCOME_FIELDS + _BALANCE_FIELDS + _CASHFLOW_FIELDS

# Map Yahoo timeseries field names → field names expected by yfinanceSidecar.ts
_FIELD_MAP = {
    # Income
    "quarterlyTotalRevenue": "Total Revenue",
    "quarterlyCostOfRevenue": "Cost Of Revenue",
    "quarterlyGrossProfit": "Gross Profit",
    "quarterlyOperatingExpense": "Operating Expense",
    "quarterlyOperatingIncome": "Operating Income",
    "quarterlyEBITDA": "EBITDA",
    "quarterlyNetIncome": "Net Income",
    "quarterlyNetIncomeCommonStockholders": "Net Income Common Stockholders",
    "quarterlyTaxProvision": "Tax Provision",
    "quarterlyBasicEPS": "Basic EPS",
    "quarterlyDilutedEPS": "Diluted EPS",
    "quarterlySellingGeneralAndAdministration": "Selling General And Administration",
    "quarterlyResearchAndDevelopment": "Research And Development",
    "quarterlyInterestExpense": "Interest Expense",
    "quarterlyDepreciationAndAmortizationInIncomeStatement": "Depreciation And Amortization In Income Statement",
    "quarterlyReconciledDepreciation": "Reconciled Depreciation",
    # Balance sheet
    "quarterlyTotalAssets": "Total Assets",
    "quarterlyCurrentAssets": "Current Assets",
    "quarterlyCurrentLiabilities": "Current Liabilities",
    "quarterlyStockholdersEquity": "Stockholders Equity",
    "quarterlyCashAndCashEquivalents": "Cash And Cash Equivalents",
    "quarterlyNetPPE": "Net PPE",
    "quarterlyGoodwill": "Goodwill",
    "quarterlyIntangibleAssets": "Intangible Assets",
    "quarterlyLongTermDebt": "Long Term Debt",
    "quarterlyShortTermDebt": "Short Term Debt",
    "quarterlyRetainedEarnings": "Retained Earnings",
    "quarterlyInventory": "Inventory",
    "quarterlyOtherShortTermInvestments": "Other Short Term Investments",
    "quarterlyTotalNonCurrentAssets": "Total Non Current Assets",
    "quarterlyTotalNonCurrentLiabilities": "Total Non Current Liabilities",
    "quarterlyTotalLiabilities": "Total Liabilities",
    "quarterlyAccountsReceivable": "Accounts Receivable",
    "quarterlyAccountsPayable": "Accounts Payable",
    "quarterlyTreasuryStock": "Treasury Stock",
    # Cash flow
    "quarterlyCapitalExpenditure": "Capital Expenditure",
    "quarterlyFreeCashFlow": "Free Cash Flow",
    "quarterlyCashDividendsPaid": "Cash Dividends Paid",
    "quarterlyRepurchaseOfCapitalStock": "Repurchase Of Capital Stock",
    "quarterlyOperatingCashFlow": "Operating Cash Flow",
    "quarterlyCashFlowFromContinuingOperatingActivities": "Cash Flow From Continuing Operating Activities",
    "quarterlyCashFlowFromContinuingInvestingActivities": "Cash Flow From Continuing Investing Activities",
    "quarterlyCashFlowFromContinuingFinancingActivities": "Cash Flow From Continuing Financing Activities",
}


def _yahoo_fundamentals_timeseries(ticker: str) -> dict[str, list[dict]]:
    """Fetch quarterly fundamentals via the timeseries endpoint.
    Returns dict keyed by output field name (e.g. 'Total Revenue'),
    each value a list of {date, value} sorted by date ascending."""
    crumb = _ensure_crumb()
    if not crumb:
        return {}

    period1 = int(time.time() - 10 * 365 * 86400)  # 10 years back
    period2 = int(time.time())
    types_str = ",".join(ALL_QUARTERLY_FIELDS)

    url = (
        f"https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/{ticker}"
        f"?symbol={ticker}&type={types_str}"
        f"&period1={period1}&period2={period2}&crumb={crumb}"
    )

    try:
        r = _session.get(url, timeout=20)
    except Exception as e:
        print(f"[yfinance] timeseries {ticker} request failed: {e}")
        return {}

    if r.status_code != 200:
        print(f"[yfinance] timeseries {ticker} status {r.status_code}")
        return {}

    data = r.json()
    results = data.get("timeseries", {}).get("result", [])

    field_data: dict[str, list[dict]] = {}

    for item in results:
        meta = item.get("meta", {})
        types = meta.get("type", [])
        if not types:
            continue
        yahoo_key = types[0]
        output_key = _FIELD_MAP.get(yahoo_key)
        if not output_key:
            continue

        vals = item.get(yahoo_key, [])
        if not isinstance(vals, list):
            continue

        records = []
        for v in vals:
            rv = v.get("reportedValue", {})
            raw = rv.get("raw") if isinstance(rv, dict) else None
            if raw is not None:
                records.append({"date": v.get("asOfDate", ""), "value": raw})

        if records:
            field_data[output_key] = records

    return field_data


def _pivot_timeseries(field_data: dict[str, list[dict]]) -> dict[str, list[dict]]:
    """Pivot flat field_data into {date: {field: value}} then split into
    income, balance, cashflow lists matching the format yfinanceSidecar.ts expects."""

    # Collect all dates
    all_dates: set[str] = set()
    for records in field_data.values():
        for r in records:
            if r["date"]:
                all_dates.add(r["date"])

    if not all_dates:
        return {"income": [], "balance": [], "cashflow": []}

    # Build lookup: date → {field: value}
    by_date: dict[str, dict] = {d: {} for d in all_dates}
    for field_name, records in field_data.items():
        for r in records:
            if r["date"] in by_date:
                by_date[r["date"]][field_name] = r["value"]

    # Compute derived fields
    for date, fields in by_date.items():
        # grossProfit = revenue - costOfRevenue (when costOfRevenue available)
        if "Gross Profit" not in fields and "Cost Of Revenue" in fields and "Total Revenue" in fields:
            rev = fields["Total Revenue"]
            cogs = fields["Cost Of Revenue"]
            if rev is not None and cogs is not None:
                fields["Gross Profit"] = rev - abs(cogs)

        # totalLiabilities = totalAssets - stockholdersEquity (accounting equation)
        if "Total Liabilities" not in fields:
            ta = fields.get("Total Assets")
            eq = fields.get("Stockholders Equity")
            if ta is not None and eq is not None:
                fields["Total Liabilities"] = ta - eq

        # totalNonCurrentLiabilities = totalLiabilities - currentLiabilities
        if "Total Non Current Liabilities" not in fields:
            tl = fields.get("Total Liabilities")
            cl = fields.get("Current Liabilities")
            if tl is not None and cl is not None:
                fields["Total Non Current Liabilities"] = tl - cl

        # Short Term Debt = Current Liabilities - Accounts Payable (rough estimate)
        # Skip — too inaccurate

    # Classify fields into income / balance / cashflow
    _INCOME_OUTPUT_FIELDS = {
        "Total Revenue", "Cost Of Revenue", "Gross Profit", "Operating Expense",
        "Operating Income", "EBITDA", "Net Income", "Net Income Common Stockholders",
        "Tax Provision", "Basic EPS", "Diluted EPS",
        "Selling General And Administration", "Research And Development",
        "Interest Expense",
        "Depreciation And Amortization In Income Statement", "Reconciled Depreciation",
    }
    _BALANCE_OUTPUT_FIELDS = {
        "Total Assets", "Current Assets", "Current Liabilities",
        "Stockholders Equity", "Cash And Cash Equivalents", "Net PPE",
        "Goodwill", "Intangible Assets", "Long Term Debt", "Short Term Debt",
        "Retained Earnings", "Inventory", "Other Short Term Investments",
        "Total Non Current Assets", "Total Non Current Liabilities",
        "Total Liabilities", "Accounts Receivable", "Accounts Payable",
        "Treasury Stock",
    }
    _CASHFLOW_OUTPUT_FIELDS = {
        "Capital Expenditure", "Free Cash Flow", "Cash Dividends Paid",
        "Repurchase Of Capital Stock", "Operating Cash Flow",
        "Cash Flow From Continuing Operating Activities",
        "Cash Flow From Continuing Investing Activities",
        "Cash Flow From Continuing Financing Activities",
    }

    sorted_dates = sorted(all_dates)
    income = []
    balance = []
    cashflow = []

    for date in sorted_dates:
        fields = by_date[date]

        inc_row = {"date": date}
        for k in _INCOME_OUTPUT_FIELDS:
            if k in fields:
                inc_row[k] = fields[k]
        income.append(inc_row)

        bs_row = {"date": date}
        for k in _BALANCE_OUTPUT_FIELDS:
            if k in fields:
                bs_row[k] = fields[k]
        balance.append(bs_row)

        cf_row = {"date": date}
        for k in _CASHFLOW_OUTPUT_FIELDS:
            if k in fields:
                cf_row[k] = fields[k]
        cashflow.append(cf_row)

    return {"income": income, "balance": balance, "cashflow": cashflow}


# ── Legacy quoteSummary helpers (used by /annual and /info) ─────────────────

def _yahoo_quote_summary(ticker: str, modules: str) -> dict | None:
    crumb = _ensure_crumb()
    if not crumb:
        return None
    url = (
        f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{ticker}"
        f"?modules={modules}&crumb={crumb}"
    )
    r = _session.get(url, timeout=15)
    if r.status_code != 200:
        print(f"[yfinance] quoteSummary {ticker} status {r.status_code}")
        return None
    data = r.json()
    results = data.get("quoteSummary", {}).get("result", [])
    return results[0] if results else None


def _parse_statements(result: dict, statement_key: str, history_key: str) -> list[dict]:
    stmt = result.get(statement_key, {}).get(history_key, [])
    records = []
    for entry in stmt:
        date_str = entry.get("endDate", {}).get("fmt", "")
        row = {"date": date_str}
        for field_key, field_val in entry.items():
            if isinstance(field_val, dict) and "raw" in field_val:
                row[field_key] = field_val["raw"]
        records.append(row)
    return records


def _flatten_modules(result: dict, module_names: list[str]) -> dict:
    info = {}
    for module_name in module_names:
        module = result.get(module_name, {})
        if not isinstance(module, dict):
            continue
        for k, v in module.items():
            if isinstance(v, dict) and "raw" in v and v["raw"] is not None:
                info[k] = v["raw"]
            elif isinstance(v, str) and v:
                info[k] = v
    return info


# ── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/api/yfinance/{ticker}/quarterly")
async def get_quarterly(ticker: str):
    """Quarterly data via fundamentals-timeseries (rich fields for European stocks).
    Falls back to quoteSummary for any quarters where timeseries is missing
    critical fields (revenue, netIncome)."""
    try:
        symbol = _resolve_symbol(ticker)
        field_data = _yahoo_fundamentals_timeseries(symbol)

        if not field_data:
            # Full fallback to quoteSummary
            modules = "incomeStatementHistoryQuarterly,balanceSheetHistoryQuarterly,cashflowStatementHistoryQuarterly"
            result = _yahoo_quote_summary(symbol, modules)
            if not result:
                return {"ticker": ticker, "hasQuarterly": False, "income": [], "balance": [], "cashflow": []}
            income = _parse_statements(result, "incomeStatementHistoryQuarterly", "incomeStatementHistory")
            balance = _parse_statements(result, "balanceSheetHistoryQuarterly", "balanceSheetStatements")
            cashflow = _parse_statements(result, "cashflowStatementHistoryQuarterly", "cashflowStatements")
            return {"ticker": ticker, "hasQuarterly": len(income) > 0, "income": income, "balance": balance, "cashflow": cashflow}

        pivoted = _pivot_timeseries(field_data)

        # Merge: fill missing revenue/netIncome from quoteSummary for incomplete quarters
        modules = "incomeStatementHistoryQuarterly"
        result = _yahoo_quote_summary(symbol, modules)
        if result:
            qs_income = _parse_statements(result, "incomeStatementHistoryQuarterly", "incomeStatementHistory")
            # Index quoteSummary records by date, mapping raw Yahoo names to our names
            qs_by_date: dict[str, dict] = {}
            for rec in qs_income:
                if rec.get("date"):
                    mapped = {
                        "Total Revenue": rec.get("totalRevenue"),
                        "Net Income": rec.get("netIncome"),
                        "Cost Of Revenue": rec.get("costOfRevenue"),
                        "Gross Profit": rec.get("grossProfit"),
                        "Operating Expense": rec.get("totalOperatingExpenses"),
                        "Interest Expense": rec.get("interestExpense"),
                        "Tax Provision": rec.get("incomeTaxExpense"),
                        "Operating Income": rec.get("operatingIncome"),
                    }
                    qs_by_date[rec["date"]] = mapped

            for inc in pivoted["income"]:
                date = inc.get("date", "")
                qs = qs_by_date.get(date)
                if not qs:
                    continue
                # Fill missing fields from quoteSummary
                for field, qs_field in [
                    ("Total Revenue", "Total Revenue"),
                    ("Net Income", "Net Income"),
                    ("Cost Of Revenue", "Cost Of Revenue"),
                    ("Gross Profit", "Gross Profit"),
                    ("Operating Expense", "Operating Expense"),
                    ("Interest Expense", "Interest Expense"),
                    ("Tax Provision", "Tax Provision"),
                    ("Operating Income", "Operating Income"),
                ]:
                    if field not in inc or inc.get(field) is None or inc.get(field) == 0:
                        val = qs.get(qs_field)
                        if val is not None:
                            inc[field] = val

        has_quarterly = len(pivoted["income"]) > 0 or len(pivoted["balance"]) > 0

        return {
            "ticker": ticker,
            "hasQuarterly": has_quarterly,
            "income": pivoted["income"],
            "balance": pivoted["balance"],
            "cashflow": pivoted["cashflow"],
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"yfinance error: {str(e)}")


@app.get("/api/yfinance/{ticker}/annual")
async def get_annual(ticker: str):
    """Annual data via legacy quoteSummary (fallback)."""
    try:
        symbol = _resolve_symbol(ticker)
        modules = "incomeStatementHistory,balanceSheetHistory,cashflowStatementHistory"
        result = _yahoo_quote_summary(symbol, modules)

        if not result:
            return {
                "ticker": ticker,
                "hasAnnual": False,
                "income": [],
                "balance": [],
                "cashflow": [],
            }

        income = _parse_statements(result, "incomeStatementHistory", "incomeStatements")
        balance = _parse_statements(result, "balanceSheetHistory", "balanceSheetStatements")
        cashflow = _parse_statements(result, "cashflowStatementHistory", "cashflowStatements")

        return {
            "ticker": ticker,
            "hasAnnual": len(income) > 0 or len(balance) > 0,
            "income": income,
            "balance": balance,
            "cashflow": cashflow,
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"yfinance error: {str(e)}")


@app.get("/api/yfinance/{ticker}/info")
async def get_info(ticker: str):
    """Company info + stock metrics via quoteSummary."""
    try:
        symbol = _resolve_symbol(ticker)
        modules = "assetProfile,defaultKeyStatistics,financialData,summaryDetail,price"
        result = _yahoo_quote_summary(symbol, modules)

        if not result:
            return {"ticker": ticker, "info": {}}

        info = _flatten_modules(result, ["financialData", "defaultKeyStatistics", "summaryDetail", "price", "assetProfile"])

        return {"ticker": ticker, "info": info}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"yfinance error: {str(e)}")
