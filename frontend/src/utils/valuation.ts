import type { CompanyProfile } from '../components/CompanyPage';

type Financial = CompanyProfile['financials'][0];
type BalanceSheet = CompanyProfile['balanceSheets'][0];
type Stock = CompanyProfile['stockMetrics'][0];

export interface ValuationInputData {
  label: string;
  value: string;
  rawValue: number;
}

export interface ValuationResult {
  id: string;
  name: string;
  description: string;
  explanation: string;
  formula: string;
  fairValue: number | null;
  confidence: 'high' | 'medium' | 'low' | 'na';
  confidenceReason: string;
  configurable: boolean;
  inputs: ValuationInputData[];
  negativeInputWarning?: string;
}

export interface ValuationInput {
  financials: Financial[];
  balanceSheets: BalanceSheet[];
  stock: Stock;
}

function latest<T extends { year: number }>(arr: T[]): T | undefined {
  return [...arr].sort((a, b) => b.year - a.year)[0];
}

function netDebt(bs: BalanceSheet | undefined): number {
  return (bs?.shortTermDebt ?? 0) + (bs?.longTermDebt ?? 0) - (bs?.cashAndCashEquivalents ?? 0);
}

function consistency(arr: number[]): number {
  if (arr.length < 2) return 0;
  let pos = 0;
  for (let i = 1; i < arr.length; i++) {
    if ((arr[i] > 0 && arr[i - 1] > 0) || (arr[i] < 0 && arr[i - 1] < 0)) pos++;
  }
  return pos / (arr.length - 1);
}

function sharesOf(stock: Stock): number {
  return stock.sharesOutstanding ?? 0;
}

// Sanity bound: if fair value is more than MAX_MULTIPLE × current price, demote confidence
const SANITY_MULTIPLE = 10;
function applySanityBound(result: ValuationResult, currentPrice: number): ValuationResult {
  if (result.fairValue == null || currentPrice <= 0) return result;
  if (result.fairValue > SANITY_MULTIPLE * currentPrice || result.fairValue < 0) {
    return { ...result, confidence: 'low', confidenceReason: `Valor (${result.fairValue.toFixed(0)}) > ${SANITY_MULTIPLE}x precio actual — resultado poco fiable` };
  }
  return result;
}

// ── DCF ──
export function computeDCF(input: ValuationInput, config: { growthRate: number; discountRate: number; horizonYears: number }): ValuationResult {
  const f = latest(input.financials);
  const { stock } = input;
  const shares = sharesOf(stock);
  if (!f || !stock || shares <= 0) {
    return { id: 'dcf', name: 'DCF (Flujo de Caja Descontado)', description: 'Valor intrínseco calculado con flujos de caja futuros descontados', explanation: 'Estima el valor de la empresa proyectando sus flujos de caja libres futuros y descontándolos al presente. Es el método más fundamental: una empresa vale la suma de todo el dinero que generará en el futuro, ajustado por riesgo y tiempo.', formula: 'Σ(FCF×(1+g)ⁿ/(1+r)ⁿ) + TV', fairValue: null, confidence: 'na', confidenceReason: 'Datos insuficientes', configurable: true, inputs: [] };
  }

  // Use average FCF across all available years (not just latest peak)
  const fcfValues = input.financials.map((x) => x.freeCashFlow ?? (x.operatingCashFlow != null ? x.operatingCashFlow - x.capex : null)).filter((v): v is number => v != null && v !== 0);
  if (fcfValues.length === 0) {
    return { id: 'dcf', name: 'DCF (Flujo de Caja Descontado)', description: 'Valor intrínseco calculado con flujos de caja futuros descontados', explanation: 'Estima el valor de la empresa proyectando sus flujos de caja libres futuros y descontándolos al presente. Es el método más fundamental: una empresa vale la suma de todo el dinero que generará en el futuro, ajustado por riesgo y tiempo.', formula: 'Σ(FCF×(1+g)ⁿ/(1+r)ⁿ) + TV', fairValue: null, confidence: 'na', confidenceReason: 'Sin datos de flujo de caja libre', configurable: true, inputs: [] };
  }
  const fcf = fcfValues.reduce((a, b) => a + b, 0) / fcfValues.length;
  const fcfWarning = fcf < 0
    ? 'FCF promedio negativo: la empresa invierte más de lo que genera en efectivo. Esto es común en empresas de infraestructura en fase de inversión, pero un DCF con FCF negativo produce un valor intrínseco negativo, lo que indica que la empresa no genera suficiente caja libre para sostener su valoración actual.'
    : undefined;

  const g = config.growthRate / 100;
  const r = config.discountRate / 100;
  const tg = 0.03;

  let totalPV = 0;
  for (let i = 1; i <= config.horizonYears; i++) {
    totalPV += (fcf * Math.pow(1 + g, i)) / Math.pow(1 + r, i);
  }
  const terminalValue = (fcf * Math.pow(1 + g, config.horizonYears) * (1 + tg)) / (r - tg);
  const terminalPV = terminalValue / Math.pow(1 + r, config.horizonYears);
  const fairValue = (totalPV + terminalPV) / shares;

  const conf = fcfValues.length >= 3 ? (consistency(fcfValues) > 0.6 ? 'high' : 'medium') : 'low';

  const fmtB = (n: number) => `$${(n / 1e9).toFixed(1)}B`;
  return {
    id: 'dcf', name: 'DCF (Flujo de Caja Descontado)',
    description: 'Valor intrínseco calculado con flujos de caja futuros descontados',
    explanation: 'Estima el valor de la empresa proyectando sus flujos de caja libres futuros y descontándolos al presente. Usa el FCF promedio de los últimos años para suavizar la volatilidad cíclica.',
    formula: `Σ(FCF_prom×(1+${config.growthRate}%)ⁿ/(1+${config.discountRate}%)ⁿ) + TV`,
    fairValue, confidence: conf,
    confidenceReason: `FCF promedio: ${fmtB(fcf)} (${fcfValues.length} años)`,
    configurable: true,
    negativeInputWarning: fcfWarning,
    inputs: [
      { label: 'FCF promedio', value: fmtB(fcf), rawValue: fcf },
      { label: 'Crecimiento anual', value: `${config.growthRate}%`, rawValue: config.growthRate },
      { label: 'Tasa de descuento', value: `${config.discountRate}%`, rawValue: config.discountRate },
      { label: 'Horizonte', value: `${config.horizonYears} años`, rawValue: config.horizonYears },
      { label: 'Terminal growth', value: `${(tg * 100).toFixed(0)}%`, rawValue: tg * 100 },
      { label: 'Valor presente FCF', value: fmtB(totalPV), rawValue: totalPV },
      { label: 'Valor terminal (PV)', value: fmtB(terminalPV), rawValue: terminalPV },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
    ],
  };
}

// ── PER ──
export function computePER(input: ValuationInput, config: { targetPE: number }): ValuationResult {
  const f = latest(input.financials);
  const { stock } = input;
  const shares = sharesOf(stock);
  if (!f || !stock || shares <= 0) {
    return { id: 'per', name: 'PER (Precio/Beneficio)', description: 'Valor basado en el beneficio neto por acción y el ratio P/E', explanation: 'Pregunta: "¿Cuánto pagarías por 1€ de beneficio?" Si la empresa gana $5 por acción y el P/E objetivo es 20x, el valor justo es $100. Es el método más utilizado por inversores institucionales. Un P/E bajo sugiere infravaloración; uno alto sobrevaloración o altas expectativas de crecimiento.', formula: 'EPS × Target P/E', fairValue: null, confidence: 'na', confidenceReason: 'Datos insuficientes', configurable: true, inputs: [], negativeInputWarning: undefined };
  }
  const eps = f.netIncome / shares;
  const fairValue = eps * config.targetPE;
  const currentPE = stock.peRatio ?? 0;
  const conf = currentPE > 0 && currentPE < 50 ? 'high' : currentPE > 0 ? 'medium' : 'low';
  const perWarning = f.netIncome <= 0
    ? 'Beneficio neto negativo: la empresa genera pérdidas. El PER no es un indicador válido para empresas con beneficios negativos.'
    : undefined;
  return {
    id: 'per', name: 'PER (Precio/Beneficio)',
    description: 'Valor basado en el beneficio neto por acción y el ratio P/E',
    explanation: 'Pregunta: "¿Cuánto pagarías por 1€ de beneficio?" Si la empresa gana $5 por acción y el P/E objetivo es 20x, el valor justo es $100. Es el método más utilizado por inversores institucionales. Un P/E bajo sugiere infravaloración; uno alto sobrevaloración o altas expectativas de crecimiento.',
    formula: `EPS($${eps.toFixed(2)}) × Target P/E(${config.targetPE})`,
    fairValue, confidence: conf,
    confidenceReason: currentPE > 0 ? `PER actual: ${currentPE.toFixed(1)}` : 'Sin PER disponible',
    configurable: true,
    negativeInputWarning: perWarning,
    inputs: [
      { label: 'Beneficio neto', value: `$${(f.netIncome / 1e9).toFixed(1)}B`, rawValue: f.netIncome },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'EPS', value: `$${eps.toFixed(2)}`, rawValue: eps },
      { label: 'Target P/E', value: `${config.targetPE}x`, rawValue: config.targetPE },
      { label: 'P/E actual', value: currentPE > 0 ? `${currentPE.toFixed(1)}x` : 'N/D', rawValue: currentPE },
    ],
  };
}

// ── P/B ──
export function computePB(input: ValuationInput, config: { targetPB: number }): ValuationResult {
  const bs = latest(input.balanceSheets);
  const { stock } = input;
  const shares = sharesOf(stock);
  const equity = bs?.totalStockholdersEquity;
  if (!stock || shares <= 0 || equity == null || equity === 0) {
    return { id: 'pb', name: 'P/B (Precio/Valor en Libro)', description: 'Patrimonio neto por acción multiplicado por P/B objetivo', explanation: 'Compara el precio de la acción con el valor contable de los activos netos (patrimonio). Un P/B de 1x significa que compras la empresa a precio de libros. Funciona mejor para bancos y empresas intensivas en activos. No es útil para empresas de servicios o tecnología donde los activos intangibles dominan.', formula: 'BVPS × Target P/B', fairValue: null, confidence: 'na', confidenceReason: 'Sin patrimonio neto', configurable: true, inputs: [], negativeInputWarning: undefined };
  }
  const bvps = equity / shares;
  const fairValue = bvps * config.targetPB;
  const currentPB = stock.pbRatio ?? 0;
  const conf = currentPB > 0 && currentPB < 10 ? 'high' : currentPB > 0 ? 'medium' : 'low';
  const pbWarning = equity < 0
    ? 'Patrimonio neto negativo: la empresa tiene más pasivos que activos. El P/B no es aplicable en este caso.'
    : undefined;
  return {
    id: 'pb', name: 'P/B (Precio/Valor en Libro)',
    description: 'Patrimonio neto por acción multiplicado por P/B objetivo',
    explanation: 'Compara el precio de la acción con el valor contable de los activos netos (patrimonio). Un P/B de 1x significa que compras la empresa a precio de libros. Funciona mejor para bancos y empresas intensivas en activos. No es útil para empresas de servicios o tecnología donde los activos intangibles dominan.',
    formula: `BVPS($${bvps.toFixed(2)}) × Target P/B(${config.targetPB})`,
    fairValue, confidence: conf,
    confidenceReason: currentPB > 0 ? `P/B actual: ${currentPB.toFixed(1)}` : 'Sin P/B disponible',
    configurable: true,
    negativeInputWarning: pbWarning,
    inputs: [
      { label: 'Patrimonio total', value: `$${(equity / 1e9).toFixed(1)}B`, rawValue: equity },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'BVPS', value: `$${bvps.toFixed(2)}`, rawValue: bvps },
      { label: 'Target P/B', value: `${config.targetPB}x`, rawValue: config.targetPB },
      { label: 'P/B actual', value: currentPB > 0 ? `${currentPB.toFixed(1)}x` : 'N/D', rawValue: currentPB },
    ],
  };
}

// ── P/S ──
export function computePS(input: ValuationInput, config: { targetPS: number }): ValuationResult {
  const f = latest(input.financials);
  const { stock } = input;
  const shares = sharesOf(stock);
  if (!f || !stock || shares <= 0 || f.revenue <= 0) {
    return { id: 'ps', name: 'P/S (Precio/Ventas)', description: 'Ingresos por acción multiplicado por P/S objetivo', explanation: 'Mide cuánto paga el mercado por cada euro de ingresos. Es útil para empresas que aún no generan beneficios (startups, empresas en crecimiento). A diferencia del PER, nunca es negativo porque los ingresos siempre son positivos, pero ignora completamente la rentabilidad.', formula: 'SPS × Target P/S', fairValue: null, confidence: 'na', confidenceReason: 'Sin ingresos', configurable: true, inputs: [] };
  }
  const sps = f.revenue / shares;
  const fairValue = sps * config.targetPS;
  const currentPS = stock.psRatio ?? 0;
  const conf = currentPS > 0 && currentPS < 20 ? 'high' : currentPS > 0 ? 'medium' : 'low';
  return {
    id: 'ps', name: 'P/S (Precio/Ventas)',
    description: 'Ingresos por acción multiplicado por P/S objetivo',
    explanation: 'Mide cuánto paga el mercado por cada euro de ingresos. Es útil para empresas que aún no generan beneficios (startups, empresas en crecimiento). A diferencia del PER, nunca es negativo porque los ingresos siempre son positivos, pero ignora completamente la rentabilidad.',
    formula: `SPS($${sps.toFixed(2)}) × Target P/S(${config.targetPS})`,
    fairValue, confidence: conf,
    confidenceReason: currentPS > 0 ? `P/S actual: ${currentPS.toFixed(1)}` : 'Sin P/S disponible',
    configurable: true,
    inputs: [
      { label: 'Ingresos totales', value: `$${(f.revenue / 1e9).toFixed(1)}B`, rawValue: f.revenue },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'SPS', value: `$${sps.toFixed(2)}`, rawValue: sps },
      { label: 'Target P/S', value: `${config.targetPS}x`, rawValue: config.targetPS },
      { label: 'P/S actual', value: currentPS > 0 ? `${currentPS.toFixed(1)}x` : 'N/D', rawValue: currentPS },
    ],
  };
}

// ── EV/EBITDA ──
export function computeEVEBITDA(input: ValuationInput, config: { targetMultiple: number }): ValuationResult {
  const f = latest(input.financials);
  const bs = latest(input.balanceSheets);
  const { stock } = input;
  const shares = sharesOf(stock);
  if (!f || !stock || shares <= 0 || !f.ebitda) {
    return { id: 'ev_ebitda', name: 'EV/EBITDA', description: 'Múltiplo de empresa sobre EBITDA', explanation: 'Valora la empresa entera (deuda incluida) en función de su capacidad operativa de generar beneficios antes de intereses, impuestos y amortizaciones. Es el múltiplo preferido en fusiones y adquisiciones porque es independiente de la estructura de capital y las políticas contables.', formula: '(EBITDA × Múltiplo − Net Debt) / Shares', fairValue: null, confidence: 'na', confidenceReason: 'Sin EBITDA', configurable: true, inputs: [], negativeInputWarning: undefined };
  }
  const ev = f.ebitda * config.targetMultiple;
  const nd = netDebt(bs);
  const fairValue = (ev - nd) / shares;
  const currentMult = stock.enterpriseValue && f.ebitda ? stock.enterpriseValue / f.ebitda : 0;
  const conf = currentMult > 0 && currentMult < 40 ? 'high' : currentMult > 0 ? 'medium' : 'low';
  const evEbitdaWarning = f.ebitda < 0
    ? 'EBITDA negativo: la operación no genera beneficio antes de intereses, impuestos y amortizaciones. El EV/EBITDA no es aplicable con EBITDA negativo.'
    : undefined;
  return {
    id: 'ev_ebitda', name: 'EV/EBITDA',
    description: 'Múltiplo de empresa sobre EBITDA',
    explanation: 'Valora la empresa entera (deuda incluida) en función de su capacidad operativa de generar beneficios antes de intereses, impuestos y amortizaciones. Es el múltiplo preferido en fusiones y adquisiciones porque es independiente de la estructura de capital y las políticas contables.',
    formula: `(EBITDA×${config.targetMultiple} − Net Debt) / Shares`,
    fairValue, confidence: conf,
    confidenceReason: currentMult > 0 ? `Múltiplo actual: ${currentMult.toFixed(1)}x` : 'Sin EV/EBITDA',
    configurable: true,
    negativeInputWarning: evEbitdaWarning,
    inputs: [
      { label: 'EBITDA', value: `$${(f.ebitda / 1e9).toFixed(1)}B`, rawValue: f.ebitda },
      { label: 'Múltiplo target', value: `${config.targetMultiple}x`, rawValue: config.targetMultiple },
      { label: 'EV implícito', value: `$${(ev / 1e9).toFixed(1)}B`, rawValue: ev },
      { label: 'Deuda neta', value: `$${(nd / 1e9).toFixed(1)}B`, rawValue: nd },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'Múltiplo actual', value: currentMult > 0 ? `${currentMult.toFixed(1)}x` : 'N/D', rawValue: currentMult },
    ],
  };
}

// ── EV/EBIT ──
export function computeEVEBIT(input: ValuationInput, config: { targetMultiple: number }): ValuationResult {
  const f = latest(input.financials);
  const bs = latest(input.balanceSheets);
  const { stock } = input;
  const shares = sharesOf(stock);
  const ebit = f?.ebit ?? (f ? (f.grossProfit ?? (f.revenue - f.costOfRevenue)) - f.operatingExpenses : null);
  if (!f || !stock || shares <= 0 || ebit == null || ebit === 0) {
    return { id: 'ev_ebit', name: 'EV/EBIT', description: 'Múltiplo de empresa sobre EBIT', explanation: 'Similar a EV/EBITDA pero sin añadir de nuevo la depreciación. Es más conservador porque refleja la necesidad real de reinvertir en activos. Ideal para comparar empresas dentro del mismo sector con diferentes intensidades de capital.', formula: '(EBIT × Múltiplo − Net Debt) / Shares', fairValue: null, confidence: 'na', confidenceReason: ebit === 0 ? 'EBIT es cero' : 'Sin EBIT', configurable: true, inputs: [], negativeInputWarning: undefined };
  }
  const evEbit = ebit * config.targetMultiple;
  const ndEbit = netDebt(bs);
  const fairValue = (evEbit - ndEbit) / shares;
  const currentMultEbit = stock.enterpriseValue && ebit ? stock.enterpriseValue / ebit : 0;
  const conf = currentMultEbit > 0 && currentMultEbit < 50 ? 'high' : currentMultEbit > 0 ? 'medium' : 'low';
  const evEbitWarning = ebit < 0
    ? 'EBIT negativo: la empresa tiene pérdidas operativas. El EV/EBIT no es aplicable con EBIT negativo.'
    : undefined;
  return {
    id: 'ev_ebit', name: 'EV/EBIT',
    description: 'Múltiplo de empresa sobre EBIT',
    explanation: 'Similar a EV/EBITDA pero sin añadir de nuevo la depreciación. Es más conservador porque refleja la necesidad real de reinvertir en activos. Ideal para comparar empresas dentro del mismo sector con diferentes intensidades de capital.',
    formula: `(EBIT×${config.targetMultiple} − Net Debt) / Shares`,
    fairValue, confidence: conf,
    confidenceReason: currentMultEbit > 0 ? `Múltiplo actual: ${currentMultEbit.toFixed(1)}x` : 'Sin EV/EBIT',
    configurable: true,
    negativeInputWarning: evEbitWarning,
    inputs: [
      { label: 'EBIT', value: `$${(ebit / 1e9).toFixed(1)}B`, rawValue: ebit },
      { label: 'Múltiplo target', value: `${config.targetMultiple}x`, rawValue: config.targetMultiple },
      { label: 'EV implícito', value: `$${(evEbit / 1e9).toFixed(1)}B`, rawValue: evEbit },
      { label: 'Deuda neta', value: `$${(ndEbit / 1e9).toFixed(1)}B`, rawValue: ndEbit },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'Múltiplo actual', value: currentMultEbit > 0 ? `${currentMultEbit.toFixed(1)}x` : 'N/D', rawValue: currentMultEbit },
    ],
  };
}

// ── Dividend Discount (DDM) ──
export function computeDDM(input: ValuationInput, config: { growthRate: number; requiredReturn: number }): ValuationResult {
  const f = latest(input.financials);
  const { stock } = input;
  const shares = sharesOf(stock);
  const divPerShare = f && shares > 0 && f.dividendsPaid ? Math.abs(f.dividendsPaid) / shares : 0;
  if (!stock || shares <= 0 || divPerShare <= 0) {
    return { id: 'ddm', name: 'DDM (Descuento de Dividendos)', description: 'Valor intrínseco por dividendos futuros descontados', explanation: 'Basado en la idea de que una acción vale la suma de todos sus dividendos futuros descontados. Funciona exclusivamente para empresas maduras con historial estable de dividendos (utilities, bancos). No es aplicable a empresas que no pagan dividendos o que reinvierten todo el beneficio.', formula: 'D₁ / (r − g)', fairValue: null, confidence: 'na', confidenceReason: 'Sin dividendos', configurable: true, inputs: [] };
  }
  const d1 = divPerShare * (1 + config.growthRate / 100);
  const r = config.requiredReturn / 100;
  const g = config.growthRate / 100;
  const fairValue = r > g ? d1 / (r - g) : null;
  const divYield = stock.dividendYield ?? 0;
  const conf = divYield > 0.02 && fairValue !== null ? 'high' : divYield > 0 ? 'medium' : 'low';
  return {
    id: 'ddm', name: 'DDM (Descuento de Dividendos)',
    description: 'Valor intrínseco por dividendos futuros descontados',
    explanation: 'Basado en la idea de que una acción vale la suma de todos sus dividendos futuros descontados. Funciona exclusivamente para empresas maduras con historial estable de dividendos (utilities, bancos). No es aplicable a empresas que no pagan dividendos o que reinvierten todo el beneficio.',
    formula: `D₁($${d1.toFixed(2)}) / (${config.requiredReturn}% − ${config.growthRate}%)`,
    fairValue, confidence: conf,
    confidenceReason: divYield > 0 ? `Yield: ${(divYield * 100).toFixed(1)}%` : 'Sin yield disponible',
    configurable: true,
    inputs: [
      { label: 'Dividendo total', value: `$${(Math.abs(f!.dividendsPaid ?? 0) / 1e9).toFixed(1)}B`, rawValue: Math.abs(f!.dividendsPaid ?? 0) },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'Div/acción', value: `$${divPerShare.toFixed(2)}`, rawValue: divPerShare },
      { label: 'D₁ (próximo año)', value: `$${d1.toFixed(2)}`, rawValue: d1 },
      { label: 'Crecimiento', value: `${config.growthRate}%`, rawValue: config.growthRate },
      { label: 'Retorno requerido', value: `${config.requiredReturn}%`, rawValue: config.requiredReturn },
      { label: 'Dividend yield', value: divYield > 0 ? `${(divYield * 100).toFixed(1)}%` : 'N/D', rawValue: divYield * 100 },
    ],
  };
}

// ── Graham Number ──
export function computeGrahamNumber(input: ValuationInput): ValuationResult {
  const f = latest(input.financials);
  const bs = latest(input.balanceSheets);
  const { stock } = input;
  const shares = sharesOf(stock);
  if (!f || !stock || shares <= 0) {
    return { id: 'graham', name: 'Número de Graham', description: 'Fórmula defensiva de Benjamin Graham', explanation: 'Fórmula defensiva creada por Benjamin Graham (mentor de Warren Buffett). Establece un tope máximo razonable para el precio de una acción basándose en su beneficio y patrimonio neto. Si la acción cuesta menos que el Número de Graham, se considera una ganga segura.', formula: '√(22.5 × EPS × BVPS)', fairValue: null, confidence: 'na', confidenceReason: 'Datos insuficientes', configurable: false, inputs: [] };
  }
  const eps = f.netIncome / shares;
  const equity = bs?.totalStockholdersEquity ?? f.totalEquity;
  const bvps = equity ? equity / shares : 0;
  if (eps <= 0 || bvps <= 0) {
    return { id: 'graham', name: 'Número de Graham', description: 'Fórmula defensiva de Benjamin Graham', explanation: 'Fórmula defensiva creada por Benjamin Graham (mentor de Warren Buffett). Establece un tope máximo razonable para el precio de una acción basándose en su beneficio y patrimonio neto. Si la acción cuesta menos que el Número de Graham, se considera una ganga segura.', formula: '√(22.5 × EPS × BVPS)', fairValue: null, confidence: 'na', confidenceReason: eps <= 0 ? 'EPS negativo' : 'Book Value negativo', configurable: false, inputs: [], negativeInputWarning: eps <= 0 ? 'El Número de Graham requiere beneficios positivos (EPS > 0). Con EPS negativo, la fórmula no aplica y el resultado no es significativo.' : 'El Número de Graham requiere patrimonio positivo (BVPS > 0).' };
  }
  const fairValue = Math.sqrt(22.5 * eps * bvps);
  return {
    id: 'graham', name: 'Número de Graham',
    description: 'Fórmula defensiva de Benjamin Graham',
    explanation: 'Fórmula defensiva creada por Benjamin Graham (mentor de Warren Buffett). Establece un tope máximo razonable para el precio de una acción basándose en su beneficio y patrimonio neto. Si la acción cuesta menos que el Número de Graham, se considera una ganga segura.',
    formula: `√(22.5 × $${eps.toFixed(2)} × $${bvps.toFixed(2)})`,
    fairValue, confidence: 'high',
    confidenceReason: `EPS: $${eps.toFixed(2)}, BVPS: $${bvps.toFixed(2)}`,
    configurable: false,
    inputs: [
      { label: 'Beneficio neto', value: `$${(f.netIncome / 1e9).toFixed(1)}B`, rawValue: f.netIncome },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'EPS', value: `$${eps.toFixed(2)}`, rawValue: eps },
      { label: 'Patrimonio', value: `$${((equity ?? 0) / 1e9).toFixed(1)}B`, rawValue: equity ?? 0 },
      { label: 'BVPS', value: `$${bvps.toFixed(2)}`, rawValue: bvps },
      { label: 'Constante Graham', value: '22.5', rawValue: 22.5 },
    ],
  };
}

// ── FCF Yield ──
export function computeFCFYield(input: ValuationInput, config: { targetYield: number }): ValuationResult {
  const f = latest(input.financials);
  const { stock } = input;
  const shares = sharesOf(stock);
  if (!f || !stock || shares <= 0) {
    return { id: 'fcf_yield', name: 'FCF Yield', description: 'Precio implícito dado un rendimiento de FCF objetivo', explanation: 'Invierte la lógica: dado un rendimiento objetivo del FCF, ¿cuál debería ser el precio? Si la empresa genera $10 de FCF por acción y quieres un 5% de rendimiento, el precio justo es $200. Es análogo al yield de un bono pero para acciones.', formula: 'FCF/Share ÷ Target Yield', fairValue: null, confidence: 'na', confidenceReason: 'Datos insuficientes', configurable: true, inputs: [] };
  }
  const fcf = f.freeCashFlow ?? (f.operatingCashFlow != null ? f.operatingCashFlow - f.capex : null);
  if (fcf == null) {
    return { id: 'fcf_yield', name: 'FCF Yield', description: 'Precio implícito dado un rendimiento de FCF objetivo', explanation: 'Invierte la lógica: dado un rendimiento objetivo del FCF, ¿cuál debería ser el precio? Si la empresa genera $10 de FCF por acción y quieres un 5% de rendimiento, el precio justo es $200. Es análogo al yield de un bono pero para acciones.', formula: 'FCF/Share ÷ Target Yield', fairValue: null, confidence: 'na', confidenceReason: 'Sin datos de FCF', configurable: true, inputs: [] };
  }
  const fcfPerShare = fcf / shares;
  const fairValue = config.targetYield > 0 ? fcfPerShare / (config.targetYield / 100) : null;
  const currentYield = stock.currentPrice > 0 ? fcfPerShare / stock.currentPrice : 0;
  const conf = currentYield > 0.05 ? 'high' : currentYield > 0.02 ? 'medium' : currentYield > 0 ? 'low' : 'na';
  const fcfYieldWarning = fcf < 0
    ? 'FCF negativo: la empresa genera un flujo de caja libre negativo. Un yield negativo produce un valor intrínseco negativo, indicando que la empresa destruye valor en efectivo.'
    : undefined;
  return {
    id: 'fcf_yield', name: 'FCF Yield',
    description: 'Precio implícito dado un rendimiento de FCF objetivo',
    explanation: 'Invierte la lógica: dado un rendimiento objetivo del FCF, ¿cuál debería ser el precio? Si la empresa genera $10 de FCF por acción y quieres un 5% de rendimiento, el precio justo es $200. Es análogo al yield de un bono pero para acciones.',
    formula: `FCF/Share($${fcfPerShare.toFixed(2)}) ÷ ${config.targetYield}%`,
    fairValue, confidence: conf,
    confidenceReason: currentYield > 0 ? `FCF yield actual: ${(currentYield * 100).toFixed(1)}%` : 'Sin FCF positivo',
    configurable: true,
    negativeInputWarning: fcfYieldWarning,
    inputs: [
      { label: 'FCF total', value: `$${(fcf / 1e9).toFixed(1)}B`, rawValue: fcf },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'FCF/acción', value: `$${fcfPerShare.toFixed(2)}`, rawValue: fcfPerShare },
      { label: 'Yield objetivo', value: `${config.targetYield}%`, rawValue: config.targetYield },
      { label: 'FCF yield actual', value: currentYield > 0 ? `${(currentYield * 100).toFixed(1)}%` : 'N/D', rawValue: currentYield * 100 },
    ],
  };
}

// ── Net-Net ──
export function computeNetNet(input: ValuationInput): ValuationResult {
  const bs = latest(input.balanceSheets);
  const { stock } = input;
  const shares = sharesOf(stock);
  if (!bs || !stock || shares <= 0 || bs.totalLiabilities == null) {
    return { id: 'netnet', name: 'Net-Net (NCAV)', description: 'Net Current Asset Value de Benjamin Graham', explanation: 'La fórmula más conservadora de Graham. Calcula el valor de liquidación de los activos corrientes (efectivo, cobros, inventario) menos toda la deuda. Si la acción cuesta menos que esto, estás comprando la empresa por debajo de su valor de liquidación — una oportunidad rara pero real.', formula: '(Cash + 0.5×AR + 0.5×Inv − Total Liabilities) / Shares', fairValue: null, confidence: 'na', confidenceReason: bs.totalLiabilities == null ? 'Sin datos de pasivos totales' : 'Sin balance sheet', configurable: false, inputs: [] };
  }
  const ncav = (bs.cashAndCashEquivalents ?? 0) + 0.5 * (bs.accountsReceivable ?? 0) + 0.5 * (bs.inventory ?? 0) - (bs.totalLiabilities ?? 0);
  const fairValue = ncav / shares;
  const conf = fairValue > stock.currentPrice ? 'high' : fairValue > 0 ? 'medium' : 'low';
  const fmtB = (n: number) => `$${(n / 1e9).toFixed(1)}B`;
  const netnetWarning = ncav < 0
    ? 'NCAV negativo: los pasivos totales superan los activos corrientes ajustados. El valor de liquidación neto es negativo, lo que indica que la empresa tiene más deudas que activos líquidos.'
    : undefined;
  return {
    id: 'netnet', name: 'Net-Net (NCAV)',
    description: 'Net Current Asset Value de Benjamin Graham',
    explanation: 'La fórmula más conservadora de Graham. Calcula el valor de liquidación de los activos corrientes (efectivo, cobros, inventario) menos toda la deuda. Si la acción cuesta menos que esto, estás comprando la empresa por debajo de su valor de liquidación — una oportunidad rara pero real.',
    formula: `(Cash + 0.5×AR + 0.5×Inv − Liabilities) / Shares`,
    fairValue, confidence: conf,
    confidenceReason: `NCAV: $${(ncav / 1e9).toFixed(1)}B`,
    configurable: false,
    negativeInputWarning: netnetWarning,
    inputs: [
      { label: 'Cash & equivalents', value: fmtB(bs.cashAndCashEquivalents ?? 0), rawValue: bs.cashAndCashEquivalents ?? 0 },
      { label: 'Cuentas por cobrar', value: fmtB(bs.accountsReceivable ?? 0), rawValue: bs.accountsReceivable ?? 0 },
      { label: 'AR × 0.5', value: fmtB(0.5 * (bs.accountsReceivable ?? 0)), rawValue: 0.5 * (bs.accountsReceivable ?? 0) },
      { label: 'Inventarios', value: fmtB(bs.inventory ?? 0), rawValue: bs.inventory ?? 0 },
      { label: 'Inv × 0.5', value: fmtB(0.5 * (bs.inventory ?? 0)), rawValue: 0.5 * (bs.inventory ?? 0) },
      { label: 'Total liabilities', value: fmtB(bs.totalLiabilities ?? 0), rawValue: bs.totalLiabilities ?? 0 },
      { label: 'NCAV total', value: fmtB(ncav), rawValue: ncav },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
    ],
  };
}

export function computeAll(input: ValuationInput, configs: {
  dcf: { growthRate: number; discountRate: number; horizonYears: number };
  per: { targetPE: number };
  pb: { targetPB: number };
  ps: { targetPS: number };
  evEbitda: { targetMultiple: number };
  evEbit: { targetMultiple: number };
  ddm: { growthRate: number; requiredReturn: number };
  fcfYield: { targetYield: number };
}): ValuationResult[] {
  const currentPrice = input.stock?.currentPrice ?? 0;
  const results = [
    computeDCF(input, configs.dcf),
    computePER(input, configs.per),
    computePB(input, configs.pb),
    computePS(input, configs.ps),
    computeEVEBITDA(input, configs.evEbitda),
    computeEVEBIT(input, configs.evEbit),
    computeDDM(input, configs.ddm),
    computeGrahamNumber(input),
    computeFCFYield(input, configs.fcfYield),
    computeNetNet(input),
  ];
  return results.map((r) => applySanityBound(r, currentPrice));
}

const CONFIDENCE_WEIGHT: Record<string, number> = {
  high: 1.0,
  medium: 0.7,
  low: 0.4,
  na: 0,
};

export function weightedAverage(results: ValuationResult[]): number | null {
  let totalWeight = 0;
  let weightedSum = 0;
  for (const r of results) {
    if (r.fairValue != null && r.fairValue > 0) {
      const w = CONFIDENCE_WEIGHT[r.confidence] ?? 0;
      weightedSum += r.fairValue * w;
      totalWeight += w;
    }
  }
  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

export type Verdict = 'buy' | 'hold' | 'sell' | 'na';

export function getVerdict(fairValue: number | null, currentPrice: number): { verdict: Verdict; upside: number | null; label: string } {
  if (fairValue == null || currentPrice <= 0) {
    return { verdict: 'na', upside: null, label: 'Sin datos' };
  }
  const upside = (fairValue - currentPrice) / currentPrice;
  if (upside > 0.15) return { verdict: 'buy', upside, label: 'Subvalorada' };
  if (upside < -0.15) return { verdict: 'sell', upside, label: 'Sobrevalorada' };
  return { verdict: 'hold', upside, label: 'Justa' };
}

export const VERDICT_COLORS: Record<Verdict, string> = {
  buy: '#059669',
  hold: '#d97706',
  sell: '#dc2626',
  na: '#94a3b8',
};

export const VERDICT_BG: Record<Verdict, string> = {
  buy: '#ecfdf5',
  hold: '#fffbeb',
  sell: '#fef2f2',
  na: '#f8fafc',
};

export const VERDICT_BORDER: Record<Verdict, string> = {
  buy: '#a7f3d0',
  hold: '#fde68a',
  sell: '#fecaca',
  na: '#e2e8f0',
};

export const DEFAULT_CONFIGS = {
  dcf: { growthRate: 5, discountRate: 10, horizonYears: 10 },
  per: { targetPE: 20 },
  pb: { targetPB: 3 },
  ps: { targetPS: 5 },
  evEbitda: { targetMultiple: 15 },
  evEbit: { targetMultiple: 18 },
  ddm: { growthRate: 3, requiredReturn: 10 },
  fcfYield: { targetYield: 5 },
};

// Sector-aware default configs: key is sector name (case-insensitive partial match)
const AIRLINE_CONFIGS: typeof DEFAULT_CONFIGS = {
  dcf: { growthRate: 3, discountRate: 12, horizonYears: 10 },
  per: { targetPE: 10 },
  pb: { targetPB: 1.5 },
  ps: { targetPS: 0.5 },
  evEbitda: { targetMultiple: 6 },
  evEbit: { targetMultiple: 8 },
  ddm: { growthRate: 0, requiredReturn: 12 },
  fcfYield: { targetYield: 8 },
};

const SECTOR_CONFIGS: Record<string, typeof DEFAULT_CONFIGS> = {
  airlines: AIRLINE_CONFIGS,
  'air transport': AIRLINE_CONFIGS,
  airline: AIRLINE_CONFIGS,
  'passenger airlines': AIRLINE_CONFIGS,
  banking: {
    dcf: { growthRate: 3, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 12 },
    pb: { targetPB: 1.5 },
    ps: { targetPS: 3 },
    evEbitda: { targetMultiple: 10 },
    evEbit: { targetMultiple: 12 },
    ddm: { growthRate: 3, requiredReturn: 10 },
    fcfYield: { targetYield: 5 },
  },
  'financial services': {
    dcf: { growthRate: 3, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 12 },
    pb: { targetPB: 1.5 },
    ps: { targetPS: 3 },
    evEbitda: { targetMultiple: 10 },
    evEbit: { targetMultiple: 12 },
    ddm: { growthRate: 3, requiredReturn: 10 },
    fcfYield: { targetYield: 5 },
  },
  insurance: {
    dcf: { growthRate: 3, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 12 },
    pb: { targetPB: 1.5 },
    ps: { targetPS: 3 },
    evEbitda: { targetMultiple: 10 },
    evEbit: { targetMultiple: 12 },
    ddm: { growthRate: 3, requiredReturn: 10 },
    fcfYield: { targetYield: 5 },
  },
  technology: {
    dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 25 },
    pb: { targetPB: 8 },
    ps: { targetPS: 8 },
    evEbitda: { targetMultiple: 20 },
    evEbit: { targetMultiple: 25 },
    ddm: { growthRate: 5, requiredReturn: 10 },
    fcfYield: { targetYield: 4 },
  },
  'consumer electronics': {
    dcf: { growthRate: 6, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 25 },
    pb: { targetPB: 8 },
    ps: { targetPS: 8 },
    evEbitda: { targetMultiple: 20 },
    evEbit: { targetMultiple: 25 },
    ddm: { growthRate: 4, requiredReturn: 10 },
    fcfYield: { targetYield: 4 },
  },
  semiconductors: {
    dcf: { growthRate: 10, discountRate: 11, horizonYears: 10 },
    per: { targetPE: 25 },
    pb: { targetPB: 10 },
    ps: { targetPS: 12 },
    evEbitda: { targetMultiple: 22 },
    evEbit: { targetMultiple: 28 },
    ddm: { growthRate: 5, requiredReturn: 11 },
    fcfYield: { targetYield: 3 },
  },
  'internet content': {
    dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 25 },
    pb: { targetPB: 6 },
    ps: { targetPS: 7 },
    evEbitda: { targetMultiple: 18 },
    evEbit: { targetMultiple: 22 },
    ddm: { growthRate: 5, requiredReturn: 10 },
    fcfYield: { targetYield: 4 },
  },
  utilities: {
    dcf: { growthRate: 2, discountRate: 8, horizonYears: 10 },
    per: { targetPE: 16 },
    pb: { targetPB: 2 },
    ps: { targetPS: 3 },
    evEbitda: { targetMultiple: 9 },
    evEbit: { targetMultiple: 11 },
    ddm: { growthRate: 3, requiredReturn: 8 },
    fcfYield: { targetYield: 5 },
  },
  'drug manufacturers': {
    dcf: { growthRate: 5, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 18 },
    pb: { targetPB: 4 },
    ps: { targetPS: 5 },
    evEbitda: { targetMultiple: 14 },
    evEbit: { targetMultiple: 18 },
    ddm: { growthRate: 4, requiredReturn: 10 },
    fcfYield: { targetYield: 4 },
  },
  energy: {
    dcf: { growthRate: 2, discountRate: 12, horizonYears: 10 },
    per: { targetPE: 10 },
    pb: { targetPB: 1.5 },
    ps: { targetPS: 1.5 },
    evEbitda: { targetMultiple: 6 },
    evEbit: { targetMultiple: 8 },
    ddm: { growthRate: 3, requiredReturn: 12 },
    fcfYield: { targetYield: 8 },
  },
  reit: {
    dcf: { growthRate: 3, discountRate: 8, horizonYears: 10 },
    per: { targetPE: 20 },
    pb: { targetPB: 1.5 },
    ps: { targetPS: 5 },
    evEbitda: { targetMultiple: 14 },
    evEbit: { targetMultiple: 16 },
    ddm: { growthRate: 3, requiredReturn: 8 },
    fcfYield: { targetYield: 5 },
  },
  'auto - manufacturers': {
    dcf: { growthRate: 5, discountRate: 11, horizonYears: 10 },
    per: { targetPE: 15 },
    pb: { targetPB: 3 },
    ps: { targetPS: 1.5 },
    evEbitda: { targetMultiple: 8 },
    evEbit: { targetMultiple: 12 },
    ddm: { growthRate: 2, requiredReturn: 11 },
    fcfYield: { targetYield: 6 },
  },
  'auto manufacturers': {
    dcf: { growthRate: 5, discountRate: 11, horizonYears: 10 },
    per: { targetPE: 15 },
    pb: { targetPB: 3 },
    ps: { targetPS: 1.5 },
    evEbitda: { targetMultiple: 8 },
    evEbit: { targetMultiple: 12 },
    ddm: { growthRate: 2, requiredReturn: 11 },
    fcfYield: { targetYield: 6 },
  },
  'drug manufacturers - general': {
    dcf: { growthRate: 5, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 18 },
    pb: { targetPB: 4 },
    ps: { targetPS: 5 },
    evEbitda: { targetMultiple: 14 },
    evEbit: { targetMultiple: 18 },
    ddm: { growthRate: 4, requiredReturn: 10 },
    fcfYield: { targetYield: 4 },
  },
  'internet - content': {
    dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 25 },
    pb: { targetPB: 6 },
    ps: { targetPS: 7 },
    evEbitda: { targetMultiple: 18 },
    evEbit: { targetMultiple: 22 },
    ddm: { growthRate: 5, requiredReturn: 10 },
    fcfYield: { targetYield: 4 },
  },
  'internet content & information': {
    dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 25 },
    pb: { targetPB: 6 },
    ps: { targetPS: 7 },
    evEbitda: { targetMultiple: 18 },
    evEbit: { targetMultiple: 22 },
    ddm: { growthRate: 5, requiredReturn: 10 },
    fcfYield: { targetYield: 4 },
  },
  'internet retail': {
    dcf: { growthRate: 10, discountRate: 11, horizonYears: 10 },
    per: { targetPE: 30 },
    pb: { targetPB: 10 },
    ps: { targetPS: 3 },
    evEbitda: { targetMultiple: 20 },
    evEbit: { targetMultiple: 25 },
    ddm: { growthRate: 0, requiredReturn: 11 },
    fcfYield: { targetYield: 3 },
  },
  'specialty retail': {
    dcf: { growthRate: 4, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 15 },
    pb: { targetPB: 3 },
    ps: { targetPS: 1 },
    evEbitda: { targetMultiple: 10 },
    evEbit: { targetMultiple: 12 },
    ddm: { growthRate: 3, requiredReturn: 10 },
    fcfYield: { targetYield: 5 },
  },
};

export function getSectorConfigs(sector: string | null | undefined, industry?: string | null): typeof DEFAULT_CONFIGS {
  const text = `${sector || ''} ${industry || ''}`.toLowerCase();
  // Check industry first (more specific), then sector
  for (const [key, config] of Object.entries(SECTOR_CONFIGS)) {
    if (text.includes(key)) return config;
  }
  return DEFAULT_CONFIGS;
}

export const SECTOR_RECOMMENDED_MODEL: Record<string, string> = {
  banking: 'pb',
  'financial services': 'pb',
  insurance: 'pb',
  utilities: 'ddm',
  energy: 'ev_ebitda',
  'oil & gas': 'ev_ebitda',
  airlines: 'ev_ebitda',
  'air transport': 'ev_ebitda',
  'auto - manufacturers': 'ev_ebitda',
  'auto manufacturers': 'ev_ebitda',
  reit: 'fcf_yield',
  'real estate': 'fcf_yield',
  technology: 'dcf',
  semiconductors: 'dcf',
  'internet content': 'ps',
  'internet - content': 'ps',
  'internet content & information': 'ps',
  'internet retail': 'ps',
  'consumer electronics': 'ps',
  'drug manufacturers': 'dcf',
  'specialty retail': 'pe',
  default: 'dcf',
};

export function getRecommendedModel(sector: string | null | undefined, industry?: string | null): string {
  const text = `${sector || ''} ${industry || ''}`.toLowerCase();
  for (const [key, modelId] of Object.entries(SECTOR_RECOMMENDED_MODEL)) {
    if (key !== 'default' && text.includes(key)) return modelId;
  }
  return SECTOR_RECOMMENDED_MODEL.default;
}
