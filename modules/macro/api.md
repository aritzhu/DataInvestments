# API — Datos Macro

## `GET /api/macro/indices`

Requiere autenticación (`Authorization: Bearer <token>`) y plan Premium o rol admin.

### Query params

| Parámetro | Tipo | Por defecto | Valores |
|---|---|---|---|
| `period` | string | `1m` | `1d`, `1w`, `1m`, `3m`, `6m`, `ytd`, `1y`, `5y` |

### Respuesta `200`

```json
{
  "period": "1m",
  "updatedAt": "2026-11-03T10:00:00.000Z",
  "source": "Yahoo Finance",
  "stale": false,
  "indices": [
    {
      "symbol": "^GSPC",
      "name": "S&P 500",
      "region": "us",
      "country": "EE. UU.",
      "price": 7570.16,
      "change": 45.2,
      "changePercent": 0.6,
      "high": 7600.1,
      "low": 7500.4,
      "points": [
        { "t": 1730000000000, "c": 7524.9 }
      ],
      "available": true
    }
  ]
}
```

- `stale` solo aparece cuando se devuelve la caché antigua tras un fallo.
- Si un índice no tiene datos, se devuelve con `available: false` y campos numéricos a `null`.

### Errores

| Código | Motivo |
|---|---|
| `400` | `period` inválido. |
| `401` | Falta el token o no es válido. |
| `403` | El usuario no tiene plan Premium (`{ "error": "premium_required" }`). |
| `500` | Error inesperado al obtener los datos. |
