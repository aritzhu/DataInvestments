# Design

## Entidades

Wallet

- id
- userId
- name

Position

- companyId
- shares
- averagePrice

## Relaciones

Wallet

1:N Position

Position

1:1 Company

## Flujo

Usuario

↓

Wallet

↓

Positions

↓

Company

↓

Valuation

↓

Frontend