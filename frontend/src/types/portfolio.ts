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
  country: string | null;
  segments: Array<{
    id: string;
    year: number;
    quarter: number | null;
    segmentName: string;
    segmentType: string;
    revenue: number;
    percentage: number | null;
  }>;
  quantity: number;
  averageCost: number;
  currentPrice: number | null;
  totalInvested: number;
  totalValue: number | null;
  pl: number | null;
  plPercent: number | null;
  fairValue: number | null;
  recommendedFairValue: number | null;
  recommendedModel: string;
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
    undervaluedCount: number;
    fairValueTotal: number;
    valuationGapPct: number | null;
  };
  stats: {
    verdictCounts: { buy: number; hold: number; sell: number; na: number };
    bySector: Array<{ name: string; count: number; value: number }>;
    byCountry: Array<{ name: string; count: number; value: number }>;
    bySegment: Array<{ name: string; value: number }>;
    byGeography: Array<{ name: string; value: number }>;
  };
  holdings: PortfolioValuationHolding[];
}

export interface PortfolioHistory {
  portfolioId: string;
  months: number;
  points: Array<{
    date: string;
    marketValue: number;
    targetValue: number;
    undervaluedCount: number;
    holdings: Array<{ ticker: string; marketValue: number; targetValue: number; price?: number }> | null;
  }>;
}
