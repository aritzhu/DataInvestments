# Plan: Mejorar datos financieros europeos

## Problema actual

1. **Yahoo Finance es inútil para datos históricos europeos**: Solo devuelve `revenue` + `netIncome` (4 años). Balance sheet y cash flow = vacíos. EBIT/EBITDA = null.
2. **`saveAndComputeRatios` sobreescribe TODO**: Cuando re-sincronizas, el último source destruye los datos anteriores. Si XBRL tenía 30 campos y Yahoo solo 2, se pierden 28 campos.
3. **European XBRL es la ÚNICA fuente real** pero tiene cobertura limitada (~5 países, 2-5 años).
4. **EBITDA se calcula mal**: Yahoo iguala EBITDA = EBIT (ignora depreciación).

## Solución: 3 cambios

### Cambio 1: Merge inteligente en saveAndComputeRatios
**Archivo**: `backend/src/services/dataAggregator.ts`

Crear función `mergeYearlyData(existing, newData)`:
- Si `newData` tiene valor (>0 o !=null) → usar `newData`
- Si `newData` es 0/null → conservar `existing` si tiene valor
- Nunca destruir datos existentes con valores vacíos

Aplicar en upserts de FinancialData y BalanceSheet.

### Cambio 2: Mejorar extracción de Yahoo Finance
**Archivo**: `backend/src/services/yahoo.ts`

- Mapear `shortTermDebt`, `longTermDebt`, `totalDebt`
- Mapear `grossProfit` desde `grossProfits` del módulo `financialData`
- Mapear `costOfRevenue` = `totalRevenue - grossProfits`
- Mapear `operatingExpenses` = `totalRevenue - operatingIncome`
- Corregir EBITDA: usar valor real de `financialData` si disponible

### Cambio 3: Reintentar más LEI candidates
**Archivo**: `backend/src/services/europeanData.ts`

- No parar en el primer LEI con datos parciales
- Logging mejorado de qué LEI funcionó
