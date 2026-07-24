# Internal Model

## Objetivo

Definir un modelo único para toda la aplicación.

## Principios

- Independiente del proveedor.
- Independiente del formato original.
- Utilizado por todos los módulos.

## Flujo

API → Normalización → Modelo interno → PostgreSQL → Backend → Frontend

## Reglas

- Todos los proveedores se adaptan al mismo esquema.
- La lógica de negocio solo utiliza el modelo interno.
- El frontend nunca consume datos sin normalizar.