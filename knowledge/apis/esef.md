# ESEF (European Single Electronic Format)

## Overview

ESEF is the mandatory electronic reporting format for annual financial reports of issuers listed on EU regulated markets since 2020. It uses XBRL with the IFRS taxonomy.

## Data Flow

```
LEI lookup (GLEIF API) ──> Entity LEI ──> XBRL filings index ──> JSON facts ──> Mapping ──> Internal Model
```

## API Endpoints Used

### 1. GLEIF API (LEI lookup)

`https://api.gleif.org/api/v1/lei-records`

- Search by legal name
- Returns LEI (Legal Entity Identifier)
- Free, no authentication

### 2. filings.xbrl.org API

`https://filings.xbrl.org/api/entities/{LEI}/filings`
`https://filings.xbrl.org/{json_url}`

- Lists XBRL filings for a given LEI
- JSON facts per filing

## IFRS Taxonomy

All European ESEF filings use the IFRS XBRL taxonomy with the `ifrs-full:` namespace prefix.

## Limitations

- Only annual filings (no quarterly)
- Coverage gap for FY2019 and earlier
- LEI lookup by name can be imprecise for ticker-based workflows
- No CIK-equivalent identifier for European companies
