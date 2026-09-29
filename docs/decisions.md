# Decisions

## Arquitectura

* Clean Architecture.
* Backend desacoplado del frontend.
* Toda la lógica de negocio reside en el backend.
* Frontend únicamente consume la API.

## Datos

* Modelo financiero basado en la SEC.
* Empresas europeas se normalizan al mismo modelo.
* Las fuentes de datos deben ser intercambiables.

## Valoración DCF

* Los importes de `g`, `r` y `tg` son **fracciones decimales**; los porcentajes de WACC (`Ke`, `Kd`, `tax`) son **números de porcentaje**. Mezclar ambas escalas produce WACC y valores terminales absurdos.
* La tasa de descuento se calcula por WACC CAPM (`Ke = rf 3% + β×5%`), no por config de sector, salvo override manual del usuario.
* La deuda que pondera en el WACC es **neta**: bruta (`shortTermDebt + longTermDebt`) menos efectivo. El efectivo compensa deuda.
* `Kd` se calcula sobre el gasto de intereses **TTM** (4 trimestres) o el último ejercicio anual, nunca sobre un trimestre suelto: un flujo trimestral contra deuda de cierre anualizada produce Kd ~4x bajo.
* **Suelo de coherencia de `Kd`**: si queda por debajo del risk-free (3%) o por encima del 50%, no es información sino un dato roto, y se sustituye por el 5% con aviso. Causa típica: `LongTermDebt` incluye obligaciones de arrendamiento, que no devengan interés registrado.
* **Suelo de WACC del 5%**: el apalancamiento nunca reduce el coste de capital por debajo del coste sin deuda. Alineado con el `min={5}` del slider para que backend y UI no diverjan.
* El crecimiento terminal `tg` es fijo al 3% y **no configurable**: mantiene el modelo simple y comparable entre empresas. Se acota a `r − 0.5pp` para que el spread nunca se estreche hasta multiplicar el valor terminal.
* El crecimiento proyectado `g` se acota a `r − 1pp`: con `g ≥ r` el valor presente diverge.
* El **peso del valor terminal no se selecciona, se emerge** de `g`, `r`, horizonte y `tg`. Se expone en `ValuationResult.terminalValue` como campo estructurado para que el frontend no lo deduzca parseando etiquetas.
* El horizonte es la palanca más potente sobre ese peso: 5 años ~73%, 10 años ~54%, 20 años ~31%.
* `npm run audit:dcf` lista las empresas con supuestos dudosos (Kd bajo el risk-free, WACC bajo el suelo, peso del terminal excessive).

## Calidad de datos

* Cada fila de `FinancialData` y `BalanceSheet` registra su `source` y `tier`.
* `tier 1`: informe auditado (XBRL SEC o ESEF). `tier 2`: Yahoo Finance rellena huecos.
* `source = 'manual'`: fila editada desde el editor admin; la sincronización nunca la sobrescribe.
* Una fuente de menor tier no pisa datos de mayor tier: los valores vacíos (`null`) no destruyen datos existentes.
* Los campos numéricos usan `null` cuando el dato no existe, nunca `0` ficticios.
* Los mapeos de etiquetas XBRL → campo son configurables (`XbrlTagMapping`) con prioridad.
* El LEI europeo se resuelve con override en `Company.lei` (más fiable que la búsqueda GLEIF).
* Correcciones de mercado (acciones en circulación, deuda, dividendos) se aplican como overrides en BD y son idempotentes.

## Tecnologías

* React para el frontend.
* Node.js + Express para el backend.
* PostgreSQL como base de datos.
* Prisma como ORM.
* Docker para desarrollo y producción.

## Desarrollo

* El proyecto debe ser fácilmente clonable.
* Los módulos deben ser reutilizables.
* Priorizar soluciones simples frente a soluciones complejas.
* Evitar dependencias innecesarias.

## IA

* La documentación debe optimizarse para agentes.
* Cada archivo debe tener una única responsabilidad.
* Minimizar el contexto enviado a los modelos.
* Evitar información duplicada entre documentos.

## Restricciones

* No cambiar la arquitectura sin justificación.
* No introducir dependencias sin aportar un beneficio claro.
* Mantener compatibilidad con la estructura actual del proyecto.
