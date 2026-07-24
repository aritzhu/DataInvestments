export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  holdings?: Holding[];
  _count?: { holdings: number };
  totalInvested?: number;
}

export interface Holding {
  id: string;
  portfolioId: string;
  companyId: string;
  quantity: number;
  averageCost: number;
  createdAt: string;
  updatedAt: string;
  company: {
    id: string;
    ticker: string;
    name: string;
    sector: string | null;
    industry: string | null;
    stockMetrics?: {
      currentPrice: number;
    }[];
    financialData?: {
      revenue: number;
      netIncome: number;
    }[];
  };
}

export interface PortfolioValuationHolding {
  holdingId: string;
  ticker: string;
  companyName: string;
  sector: string | null;
  quantity: number;
  averageCost: number;
  currentPrice: number | null;
  totalInvested: number;
  totalValue: number | null;
  pl: number | null;
  plPercent: number | null;
  fairValue: number | null;
  marginOfSafety: number | null;
  verdict: string;
  valuationMethods: any[];
}

export interface PortfolioValuation {
  portfolioId: string;
  portfolioName: string;
  currency: string;
  summary: {
    totalInvested: number;
    totalValue: number;
    totalPL: number;
    totalPLPercent: number | null;
    holdingCount: number;
  };
  holdings: PortfolioValuationHolding[];
}
