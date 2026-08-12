# Datos SEC

## Alcance

Extracción y normalización de estados financieros de empresas estadounidenses
desde los informes XBRL de la SEC al modelo común del proyecto.

## Flujo

1. Resolución del CIK de la empresa.
2. Descarga de los estados (Income Statement, Balance Sheet, Cash Flow).
3. Normalización al modelo común (`FinancialData`, `BalanceSheet`).
4. Persistencia con `source = 'sec-xbrl'` y `tier = '1'`.

## Garantías

- Los datos SEC (tier 1) no se pierden cuando Yahoo Finance devuelve datos vacíos.
- Los campos sin valor se guardan como `null`, nunca como `0` ficticios.
- Las filas marcadas `manual` desde el editor admin nunca se sobrescriben.
- La lógica europea se normaliza al mismo modelo (ver `modules/import/context.md`).
