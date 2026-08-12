# Importación de datos financieros

## Fuentes

- **SEC XBRL** (EE. UU.): datos auditados de las empresas americanas.
- **ESEF XBRL** (Europa): informes anuales auditados publicados en filings.xbrl.org.
- **Yahoo Finance / yfinance sidecar**: precios, cotizaciones y relleno de huecos.

## Jerarquía de datos (tier)

Cada fila de `FinancialData` y `BalanceSheet` lleva `source` y `tier`:

| tier | source      | Descripción                                  |
|------|-------------|----------------------------------------------|
| 1    | `sec-xbrl`  | Informe auditado SEC                         |
| 1    | `esef-xbrl` | Informe auditado ESEF                        |
| 2    | `yfinance`  | Relleno de huecos de Yahoo Finance           |
| —    | `manual`    | Fila editada en el editor admin (no se pisa) |

Reglas:

- La sincronización nunca sobrescribe una fila `manual`.
- Un dato `null` de una fuente no destruye un dato existente de otra.
- `yfinance` (tier 2) solo rellena huecos y nunca pisa ESEF/SEC (tier 1).

## Configuración

- **XbrlTagMapping**: mapeos configurables de etiqueta XBRL → campo, con prioridad.
  Se siembran con `pnpm seed:xbrl-tags`.
- **Company.lei**: override de LEI europeo por ticker. Se siembra con `pnpm seed:lei`.
- **CompanyOverride**: correcciones manuales de mercado (acciones, deuda, dividendos).
  Se siembran con `pnpm seed:overrides` y se aplican con `pnpm apply:overrides`.

## Validación

- `pnpm validate:quality`: audita la calidad de todos los datos (identidad, unidades,
  rangos, variaciones) y reporta empresas con errores/advertencias.
- `pnpm audit:eu`: comprueba la cobertura ESEF de las empresas europeas.
- `pnpm discover:esef`: depuración de la extracción ESEF de un ticker.

## Scripts útiles

```bash
pnpm seed:overrides    # siembra correcciones (idempotente)
pnpm apply:overrides   # aplica correcciones a los datos
pnpm recompute:valuation
pnpm validate:quality
pnpm audit:eu
```
