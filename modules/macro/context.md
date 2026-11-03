# Módulo: Datos Macro

## Propósito

Mostrar la evolución de los principales índices bursátiles del mundo con un selector de periodo y una minigráfica por índice.

## Acceso

- Ruta frontend: `/macro`.
- Enlace visible en la navbar para todos los usuarios.
- Sección exclusiva del plan **Premium**.
- Los usuarios Free/Pro ven una previsualización bloqueada con CTA a `/plans`.
- Los usuarios sin sesión ven el bloqueo con CTA a login (`redirect=/macro`).
- El rol `admin` tiene acceso aunque su `subscriptionTier` sea `free`.

## Datos

- Fuente: Yahoo Finance (`query1.finance.yahoo.com/v8/finance/chart`).
- Índices agrupados en:
  - EE. UU.
  - Europa.
  - Asia-Pacífico.
  - América.
- Periodos y resolución:

| Periodo | range | interval |
|---|---|---|
| 1D | `1d` | `1m` |
| 1S | `5d` | `15m` |
| 1M | `1mo` | `1d` |
| 3M | `3mo` | `1d` |
| 6M | `6mo` | `1d` |
| YTD | `ytd` | `1d` |
| 1A | `1y` | `1d` |
| 5A | `5y` | `1wk` |

- La variación de `1D` se calcula contra `chartPreviousClose`; el resto contra el primer cierre del rango.
- Las series se reducen a un máximo de 200 puntos para las minigráficas.
- Caché en memoria por periodo: 3 minutos.
- Si falla la actualización, se sirve la caché anterior durante un máximo de 15 minutos y se marca como `stale`.

## Seguridad

- El backend valida el plan antes de devolver datos.
- La previsualización bloqueada no consulta Yahoo Finance.

## Archivos

- `backend/src/services/macroService.ts`
- `backend/src/routes/macro.ts`
- `backend/src/services/yahoo.ts` (`fetchYahooChartSeries`)
- `frontend/src/pages/MacroPage.tsx`
- `frontend/src/components/macro/MacroPeriodSelector.tsx`
- `frontend/src/components/macro/MacroIndexCard.tsx`
- `frontend/src/components/macro/MacroPremiumGate.tsx`
- `frontend/src/services/macroService.ts`
- `frontend/src/styles/macro.css`
