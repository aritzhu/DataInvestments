# XBRL (eXtensible Business Reporting Language)

## Overview

XBRL is an international standard for digital business reporting. It encodes financial statements using taxonomies (concept definitions) and facts (instance values).

## Taxonomies Used

| Taxonomy | Prefix | Source | Region |
|---|---|---|---|
| US GAAP | `us-gaap` | SEC EDGAR | United States |
| IFRS | `ifrs-full` | ESEF | European Union |

## Concept Format

Concepts are identified by namespace-prefixed names:

- `us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax`
- `ifrs-full:Revenue`

## Parsing Approach

1. Fetch raw XBRL facts (JSON format from SEC or ESEF API).
2. Filter to annual period facts only.
3. Deduplicate by fiscal year (keep latest-filed).
4. Map each concept to an internal field name using the mapping catalog.
5. Compute derived fields (grossProfit = revenue - cogs).
6. Store normalized values in the internal model.

## Mapping

The mapping layer (`fieldMappingCatalog.ts`) defines which XBRL tags map to which internal fields, per source. The mapping is extensible:
- Base tags are defined in `FIELD_MAPPING_CATALOG`
- Custom tags can be added via `FieldConfig` (persisted in DB)
- Learned mappings from Tag Discovery are stored in `ConceptMapping`
