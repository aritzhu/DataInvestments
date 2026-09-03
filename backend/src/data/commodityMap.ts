export interface CommodityMapping {
  companyTicker: string;
  commoditySymbol: string;
  commodityName: string;
  elasticity: number;
  defaultOptimisticPct: number;
  defaultPessimisticPct: number;
  pctMP?: number;
  taxRate?: number;
}

export const COMMODITY_MAP: CommodityMapping[] = [
  { companyTicker: 'BAS.DE', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.6, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'LIN.DE', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.3, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: '1COV.DE', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.6, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'SZU.DE', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.4, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'BNR.DE', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.3, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'KCO.DE', commoditySymbol: 'HRC=F', commodityName: 'Acero', elasticity: 0.8, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'TKA.DE', commoditySymbol: 'HRC=F', commodityName: 'Acero', elasticity: 0.8, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'SDF.DE', commoditySymbol: 'HG=F', commodityName: 'Potasa', elasticity: 0.7, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'SGO.PA', commoditySymbol: 'CL=F', commodityName: 'Energía', elasticity: 0.4, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'CRDA.L', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.4, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'GLEN.L', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.65, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'RIO.L', commoditySymbol: 'HRC=F', commodityName: 'Mineral de hierro', elasticity: 0.7, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'ACX.MC', commoditySymbol: 'HRC=F', commodityName: 'Acero', elasticity: 0.75, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'MTS.MC', commoditySymbol: 'HRC=F', commodityName: 'Acero', elasticity: 0.8, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'STEEL.AS', commoditySymbol: 'HRC=F', commodityName: 'Acero', elasticity: 0.8, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'AKZA.AS', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.5, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'DSM.AS', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.3, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'BZU.MI', commoditySymbol: 'CL=F', commodityName: 'Energía', elasticity: 0.4, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'SIKA.SW', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.4, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'CLN.SW', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.5, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'GIVN.SW', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.3, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'SOL.BR', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.5, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'UMP.BR', commoditySymbol: 'SI=F', commodityName: 'Plata', elasticity: 0.6, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'VOE.VI', commoditySymbol: 'HRC=F', commodityName: 'Acero', elasticity: 0.8, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'WIE.VI', commoditySymbol: 'CL=F', commodityName: 'Energía', elasticity: 0.4, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'BOL.ST', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.7, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'SSAB-A.ST', commoditySymbol: 'HRC=F', commodityName: 'Acero', elasticity: 0.8, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'SSAB.HE', commoditySymbol: 'HRC=F', commodityName: 'Acero', elasticity: 0.8, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'YAR.OL', commoditySymbol: 'HG=F', commodityName: 'Fertilizantes', elasticity: 0.7, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'UPM.HE', commoditySymbol: 'LBS=F', commodityName: 'Madera', elasticity: 0.5, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'CRH.IR', commoditySymbol: 'CL=F', commodityName: 'Energía', elasticity: 0.4, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'SMDS.IR', commoditySymbol: 'LBS=F', commodityName: 'Pulpa', elasticity: 0.5, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
];

interface CommodityByIndustryRule {
  match: RegExp;
  commoditySymbol: string;
  commodityName: string;
  elasticity: number;
  pctMP: number;
}

const COMMODITY_BY_INDUSTRY: CommodityByIndustryRule[] = [
  { match: /steel|iron|ferro/i, commoditySymbol: 'HRC=F', commodityName: 'Acero', elasticity: 0.8, pctMP: 0.7 },
  { match: /copper|red metal/i, commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.6, pctMP: 0.6 },
  { match: /alumin/i, commoditySymbol: 'ALI=F', commodityName: 'Aluminio', elasticity: 0.6, pctMP: 0.6 },
  { match: /gold|precious/i, commoditySymbol: 'GC=F', commodityName: 'Oro', elasticity: 0.7, pctMP: 0.6 },
  { match: /silver/i, commoditySymbol: 'SI=F', commodityName: 'Plata', elasticity: 0.6, pctMP: 0.6 },
  { match: /paper|pulp|forest|lumber|packaging/i, commoditySymbol: 'LBS=F', commodityName: 'Pulpa/Madera', elasticity: 0.5, pctMP: 0.5 },
  { match: /oil ?[&and] ?gas|petroleum|energy/i, commoditySymbol: 'CL=F', commodityName: 'Energía', elasticity: 0.4, pctMP: 0.5 },
];

const DEFAULT_PCT_MP_BY_SYMBOL: Record<string, number> = {
  'HRC=F': 0.7,
  'HG=F': 0.6,
  'ALI=F': 0.6,
  'GC=F': 0.6,
  'SI=F': 0.6,
  'LBS=F': 0.5,
  'CL=F': 0.5,
};

export function getMappedCommodity(ticker: string, industry?: string | null, sector?: string | null): CommodityMapping | null {
  const normalized = ticker.toUpperCase();
  const explicit = COMMODITY_MAP.find((m) => m.companyTicker.toUpperCase() === normalized);
  if (explicit) {
    return {
      ...explicit,
      pctMP: explicit.pctMP ?? DEFAULT_PCT_MP_BY_SYMBOL[explicit.commoditySymbol] ?? 0.5,
      taxRate: explicit.taxRate ?? 0.25,
    };
  }
  if (sector && sector.toLowerCase() !== 'basic materials') return null;
  if (!industry) return null;
  const rule = COMMODITY_BY_INDUSTRY.find((r) => r.match.test(industry));
  if (!rule) return null;
  return {
    companyTicker: normalized,
    commoditySymbol: rule.commoditySymbol,
    commodityName: rule.commodityName,
    elasticity: rule.elasticity,
    defaultOptimisticPct: 20,
    defaultPessimisticPct: 20,
    pctMP: rule.pctMP,
    taxRate: 0.25,
  };
}
