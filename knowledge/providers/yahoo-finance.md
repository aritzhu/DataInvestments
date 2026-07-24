# Yahoo Finance

## Objetivo

Proporcionar información de mercado y complementar los datos obtenidos desde las fuentes oficiales.

## Tipo

Fuente complementaria.

## Cobertura

* Empresas cotizadas.
* Información de mercado.
* Datos generales de la empresa.

## Datos utilizados

### Mercado

* Precio actual.
* Precio histórico.
* Capitalización bursátil (Market Cap).
* Enterprise Value.
* Volumen.
* Divisa.

### Empresa

* Nombre.
* Ticker.
* Sector.
* Industria.
* País.
* Bolsa (Exchange).

## Uso

Yahoo Finance se utiliza para:

* Obtener el precio de cotización.
* Completar información general de la empresa.
* Calcular métricas dependientes del precio de mercado.
* Actualizar datos de mercado con mayor frecuencia que las fuentes oficiales.

## No utilizar para

* Estados financieros.
* Balance Sheet.
* Income Statement.
* Cash Flow Statement.
* Cálculos contables cuando existan datos oficiales.

## Prioridad

* Información financiera → SEC / ESEF.
* Información de mercado → Yahoo Finance.

## Flujo

Yahoo Finance → Adaptador → Modelo interno → PostgreSQL

## Restricciones

* Nunca exponer directamente el modelo de Yahoo Finance.
* Todos los datos deben convertirse al modelo interno.
* Mantener el proveedor desacoplado del resto de la aplicación.
* Debe poder sustituirse por otro proveedor sin modificar la lógica de negocio.
