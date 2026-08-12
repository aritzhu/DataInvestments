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
