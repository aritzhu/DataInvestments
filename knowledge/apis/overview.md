# APIs Overview

## Data Sources

The system integrates three categories of data sources:

### Official Financial Sources

| Source | Coverage | Format | Authentication |
|---|---|---|---|
| **SEC EDGAR** | US companies (10-K, 10-Q) | XBRL (us-gaap taxonomy) | Free (User-Agent header) |
| **ESEF** | European companies (annual reports) | XBRL (IFRS taxonomy) | Free (public API) |

### Market Data Sources

| Source | Coverage | Authentication |
|---|---|---|
| **Yahoo Finance** | Global stock prices, market cap, exchange info | Free (scraping) |
| **Financial Modeling Prep** | Global financial statements, ratios, profiles | API key (optional) |
| **Finnhub** | Global market metrics, ratios | API key (optional, env var) |

## Architecture

```
SEC EDGAR ──┐
            ├──> XBRL Parser ──> Mapping Layer ──> Internal Model ──> PostgreSQL
ESEF ───────┘
Yahoo Finance ──> Scraper ──> Adapter ────┘
FMP ────────────> API Client ──> Adapter ──┘
Finnhub ────────> API Client ──> Adapter ──┘
```

## Key Principles

- All data sources normalize to the same internal model.
- Business logic never depends on a specific provider.
- XBRL tags are resolved during mapping; the internal model stores only normalized values.
- Market data (prices, market cap) comes from Yahoo/FMP; accounting data comes from SEC/ESEF.
