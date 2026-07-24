# Coding Style

## General

* Seguir los principios SOLID.
* Evitar duplicación de código (DRY).
* Mantener las soluciones simples (KISS).
* Priorizar reutilización antes que crear código nuevo.
* Un archivo, una responsabilidad.

## Frontend

* Mobile First.
* Tailwind para el layout y la estructura de los componentes.
* CSS Modules para estilos específicos (padding, margin, border, colores, animaciones...).
* Componentes pequeños y reutilizables.
* Un componente por archivo.
* Separar la lógica de la presentación.

## CSS

* Utilizar variables CSS para colores y tamaños.
* Priorizar Flexbox frente a Grid cuando ambos resuelvan el problema.
* Evitar `!important`.
* No duplicar estilos.
* Mantener un diseño responsive.
* Reutilizar clases y componentes visuales.

## Backend

* Controllers sin lógica de negocio.
* Toda la lógica de negocio en Services.
* Acceso a datos mediante Repositories.
* Métodos pequeños y con una única responsabilidad.
* Evitar dependencias entre módulos.

## Base de datos

* Utilizar Prisma ORM.
* Todas las modificaciones mediante migraciones.
* No modificar migraciones ya aplicadas.
* Mantener las entidades desacopladas de la lógica de negocio.
