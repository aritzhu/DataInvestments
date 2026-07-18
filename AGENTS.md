# AGENTS.md - DataInvestments

## Project Overview
Visor de datos de inversión para analizar el valor intrínseco de empresas mediante gráficos Sankey.

## Tech Stack
- **Backend**: Express.js + Prisma + PostgreSQL
- **Frontend**: React + Vite + Tailwind CSS 4
- **Docker**: 2 containers local (db, backend), 3 producción (+ frontend)

## Commands

### Backend
```bash
cd backend
pnpm install
pnpm run db:generate    # Generate Prisma client
pnpm run db:push        # Push schema to DB
pnpm run db:seed        # Seed sample data
pnpm run dev            # Start dev server on port 3001
pnpm run build          # Build for production
```

### Frontend
```bash
cd frontend
pnpm install
pnpm run dev            # Start dev server on port 5173
pnpm run build          # Build for production
```

### Docker (Local)
```bash
docker compose up -d    # Start db (5435) + backend (3005)
docker compose down     # Stop all services
```

### Docker (Production)
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## Project Structure
```
DataInvestments/
├── backend/
│   ├── src/
│   │   ├── server.ts              # Express app entry
│   │   └── infrastructure/prisma/
│   │       ├── schema.prisma      # Database schema
│   │       └── seed.ts            # Sample data
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Landing.tsx        # Landing page
│   │   │   ├── CashFlowView.tsx   # Ingresos/Gastos Sankey
│   │   │   └── StockValueView.tsx # Valoración Sankey
│   │   └── App.tsx
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml          # Local (db + backend)
└── docker-compose.prod.yml     # Production (+ frontend)
```

## API Endpoints
- `GET /health` - Health check
- `GET /api/companies` - List all companies
- `GET /api/companies/:ticker` - Get company by ticker
- `POST /api/companies` - Create company
- `GET /api/companies/:ticker/financials` - Get financial data
- `POST /api/companies/:ticker/financials` - Add financial data
- `GET /api/companies/:ticker/stock` - Get stock metrics
- `POST /api/companies/:ticker/stock` - Add stock metric
- `GET /api/companies/:ticker/sankey/cashflow` - Cash flow Sankey data
- `GET /api/companies/:ticker/sankey/valuation` - Valuation Sankey data

## Database Models
- **Company**: ticker, name, sector, industry
- **FinancialData**: revenue, costs, expenses, net income (by year/quarter)
- **StockMetric**: price, ratios, market cap, intrinsic value

## Conventions
- Use pnpm for package management
- Tailwind CSS 4 for styling (no custom CSS unless necessary)
- TypeScript strict mode
- Express 5 patterns
- Prisma for database access
