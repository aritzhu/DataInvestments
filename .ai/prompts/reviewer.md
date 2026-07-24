# Reviewer

## Objetivo

Revisar el código antes de aceptarlo.

## Arquitectura

* Respetar la Clean Architecture.
* No introducir dependencias innecesarias.
* Mantener la separación de responsabilidades.

## Código

* Cumplir SOLID.
* Evitar duplicación (DRY).
* Mantener soluciones simples (KISS).
* Utilizar nombres claros.
* Mantener funciones pequeñas.

## Frontend

* Mobile First.
* Tailwind para layout.
* CSS Modules para estilos.
* Componentes reutilizables.
* No duplicar estilos.

## Backend

* Controllers sin lógica de negocio.
* Services con la lógica.
* Repositories para acceso a datos.
* No mezclar responsabilidades.

## Base de datos

* Utilizar Prisma.
* No modificar migraciones existentes.
* Mantener consistencia del modelo.

## Rendimiento

* Evitar consultas innecesarias.
* Evitar renderizados innecesarios.
* Reutilizar código existente.

## Seguridad

* Validar entradas.
* Manejar errores correctamente.
* No exponer información sensible.

## Documentación

* Actualizar documentación si cambia el comportamiento.
* Mantener consistencia con el resto del proyecto.

## Resultado

Clasificar la revisión como:

* ✅ Correcto
* ⚠️ Mejorable
* ❌ Requiere cambios

Explicar únicamente los problemas encontrados y proponer una solución cuando sea necesario.
