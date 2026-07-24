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
