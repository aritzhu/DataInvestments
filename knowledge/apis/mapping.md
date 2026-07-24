# Mapping Layer

## Purpose

The mapping layer converts provider-specific data concepts (XBRL tags, API field names) into the internal model's field names. This decouples business logic from data providers.

## Architecture

```
Provider Data (XBRL tags, JSON fields)
         │
         ▼
  ┌─────────────────┐
  │ fieldMappingCatalog │  ← Base mappings (hardcoded)
  │ FieldConfig         │  ← Custom tags per field+source (DB)
  │ ConceptMapping      │  ← Learned concept mappings (DB)
  └─────────────────┘
         │
         ▼
   Internal field name (revenue, netIncome, ...)
         │
         ▼
   Internal Model (FinancialData, BalanceSheet, etc.)
```

## Components

### fieldMappingCatalog.ts

Defines `FIELD_MAPPING_CATALOG`, an array of `FieldMappingEntry` with:
- `fieldName` — internal field name
- `sources.sec` — US-GAAP XBRL tags
- `sources.european` — IFRS concepts
- `sources.yahoo` — Yahoo Finance field names

### FieldConfig (DB table)

Per-field, per-source customization:
- `customTags` — additional XBRL tags to recognize
- `active` — whether this source is used for this field

### ConceptMapping (DB table)

Learned mappings from Tag Discovery:
- `conceptName` — XBRL concept (e.g. `ifrs-full:Revenue`)
- `fieldName` — internal field (e.g. `revenue`)
- These are applied automatically during extraction.

## Resolution Order

For each XBRL fact during extraction:
1. Check `IFRS_MAP` / `IFRS_ALIASES` (built-in constants)
2. Check `FieldConfig.customTags` for this source
3. Check `ConceptMapping` for this concept
4. Check regex patterns (e.g. CapEx detection)
5. If no match → tagged as unused concept
