# XBRL

## Objetivo

Utilizar un formato estándar para interpretar y normalizar la información financiera de cualquier proveedor.

## ¿Qué es?

XBRL (eXtensible Business Reporting Language) es un estándar internacional para representar información financiera mediante taxonomías y etiquetas.

## Uso en el proyecto

XBRL se utiliza para:

* Leer estados financieros.
* Identificar conceptos contables.
* Mapear datos al modelo interno.
* Mantener compatibilidad entre distintos proveedores.

## Proveedores

* SEC
* ESEF

## Flujo

XBRL → Parser → Mapping → Modelo interno → PostgreSQL

## Principios

* El parser debe ser independiente del proveedor.
* El modelo interno nunca depende de etiquetas XBRL.
* Las diferencias entre taxonomías se resuelven durante el mapeo.

## Restricciones

* No utilizar etiquetas XBRL directamente en la lógica de negocio.
* Todo dato debe convertirse al modelo interno antes de almacenarse.
* Mantener el parser desacoplado del resto del sistema.
