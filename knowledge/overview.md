# APIs Overview

## Objetivo

Centralizar toda la información financiera utilizando un modelo de datos interno independiente de los proveedores.

Cada fuente tiene una responsabilidad específica dentro del sistema y todos los datos deben normalizarse antes de ser utilizados por la aplicación.

## Arquitectura

```text
                 ┌──────────────┐
                 │     SEC      │
                 └──────┬───────┘
                        │
                 ┌──────▼───────┐
                 │     ESEF     │
                 └──────┬───────┘
                        │
                 ┌──────▼──────────────┐
                 │   Yahoo Finance     │
                 └─────────┬───────────┘
                           │
                   Normalización
                           │
                    Modelo Interno
                           │
                     PostgreSQL
                           │
                    Backend (API)
                           │
                       Frontend
```

## Responsabilidades

### SEC

Fuente oficial para empresas estadounidenses.

Se utiliza para:

* Estados financieros.
* Filings.
* Taxonomía XBRL.
* Modelo de referencia del proyecto.

---

### ESEF

Fuente oficial para empresas europeas.

Se utiliza para:

* Estados financieros.
* Informes XBRL.
* Adaptación al modelo interno.

---

### Yahoo Finance

Fuente complementaria.

Se utiliza para:

* Precio de cotización.
* Market Cap.
* Enterprise Value.
* Información general de la empresa.
* Datos de mercado.

No debe utilizarse como fuente principal de información contable.

---

## Modelo interno

Toda la información obtenida desde cualquier proveedor debe convertirse al mismo modelo antes de almacenarse.

Ningún módulo de negocio puede depender de la estructura original de una API externa.

---

## Flujo de datos

1. Obtener información desde una API.
2. Validar los datos recibidos.
3. Normalizar al modelo interno.
4. Almacenar en PostgreSQL.
5. Realizar cálculos financieros.
6. Exponer los datos mediante la API.
7. Mostrar la información en el frontend.

---

## Principios

* Las fuentes de datos son intercambiables.
* El modelo interno es la única fuente de verdad.
* La lógica de negocio nunca depende de un proveedor externo.
* Toda transformación se realiza en el backend.
* El frontend solo consume el modelo interno.
* Los nuevos proveedores deben integrarse mediante adaptadores sin modificar la lógica existente.
