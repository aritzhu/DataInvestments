# Arquitectura

## Patrón

- Clean Architecture

## Objetivo

- Proyecto reutilizable.
- Arquitectura modular.
- Diseñado para ser clonado como plantilla.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Base de datos: PostgreSQL

## Desarrollo

- Frontend: Vite
- Backend: Docker
- Base de datos: Docker
- Comunicación mediante API REST

## Producción

- Frontend: Docker
- Backend: Docker
- Base de datos: Docker
- Docker Compose
- Red Docker privada
- Nginx (Reverse Proxy)

## CI/CD

- Push o merge a `dev` → GitHub Actions → Despliegue automático en VPS

## Flujo de datos

APIs → Normalización → PostgreSQL → Modelos de valoración → API → Frontend

## Fuentes de datos

- SEC
- ESEF
- Otras APIs financieras

## Objetivo funcional

- Obtener datos financieros.
- Normalizar la información.
- Almacenar la información.
- Calcular el Fair Value mediante distintos modelos.
- Mostrar métricas e indicadores al usuario.
- Facilitar la toma de decisiones de inversión.

## Restricciones

- Mantener la Clean Architecture.
- Evitar dependencias circulares.
- Reutilizar componentes antes de crear nuevos.
- No duplicar lógica de negocio.
- La lógica financiera reside en el backend.
- El frontend solo consume la API.
- Todas las fuentes de datos deben normalizarse al mismo modelo.