# Mapping

## Objetivo

Convertir cualquier proveedor al modelo interno.

## Flujo

Proveedor → Adapter → Modelo interno

## Reglas

- Un adaptador por proveedor.
- El mapeo debe ser determinista.
- No modificar el modelo interno para adaptarse a una API.
- Las diferencias entre proveedores se resuelven en el adaptador.

## Adaptadores

- SEC Adapter
- ESEF Adapter
- Yahoo Finance Adapter