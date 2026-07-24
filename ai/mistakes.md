# AI Mistakes

## Arquitectura

* No romper la Clean Architecture.
* No mezclar responsabilidades.
* No introducir dependencias innecesarias.

## Backend

* No colocar lógica de negocio en Controllers.
* No acceder a la base de datos desde Controllers.
* No duplicar lógica entre Services.

## Frontend

* No crear componentes demasiado grandes.
* No duplicar estilos.
* No mezclar Tailwind y CSS Modules para la misma responsabilidad.

## Base de datos

* No modificar migraciones existentes.
* No acceder directamente a la base de datos sin Prisma.

## Datos

* No depender del formato original de una API.
* Normalizar siempre antes de almacenar.
* No asumir que todos los datos financieros están disponibles.

## General

* Leer el contexto antes de implementar.
* Reutilizar código existente.
* Limitar los cambios al alcance de la tarea.
* Actualizar la documentación cuando sea necesario.
