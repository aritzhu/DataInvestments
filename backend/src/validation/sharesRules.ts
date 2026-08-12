import { StockRow, ValidationResult, isNum } from './types';

const ABSURD_SHARES_MAX = 25_000_000_000; // no listed company exceeds this; x1000 scale errors do
const ABSURD_SHARES_MIN = 1_000_000;
const MCAP_VS_IMPLIED_TOL = [0.5, 2];
const PS_ERROR = 50;
const PS_WARN = 20;

export function checkSharesRules(stock: StockRow, latestRevenue: number | null): ValidationResult[] {
  const out: ValidationResult[] = [];
  const { sharesOutstanding, currentPrice, marketCap } = stock;

  if (isNum(sharesOutstanding)) {
    const s = sharesOutstanding!;
    if (s > ABSURD_SHARES_MAX) {
      out.push({
        rule: 'shares_absurd',
        severity: 'error',
        message: `sharesOutstanding=${(s / 1e9).toFixed(2)}B > ${ABSURD_SHARES_MAX / 1e9}B: probable error de escala x1000`,
        field: 'sharesOutstanding',
      });
    } else if (s < ABSURD_SHARES_MIN) {
      out.push({
        rule: 'shares_absurd',
        severity: 'warn',
        message: `sharesOutstanding=${(s / 1e6).toFixed(2)}M < ${ABSURD_SHARES_MIN / 1e6}M, inusualmente bajo`,
        field: 'sharesOutstanding',
      });
    }

    if (isNum(marketCap) && isNum(currentPrice)) {
      const implied = s * currentPrice!;
      const ratio = implied / marketCap!;
      if (ratio < MCAP_VS_IMPLIED_TOL[0] || ratio > MCAP_VS_IMPLIED_TOL[1]) {
        out.push({
          rule: 'mcap_shares_price',
          severity: 'error',
          message: `marketCap=${(marketCap! / 1e9).toFixed(1)}B vs shares*precio=${(implied / 1e9).toFixed(1)}B (x${ratio.toFixed(2)}), fuera de [${MCAP_VS_IMPLIED_TOL}]`,
          field: 'marketCap',
        });
      }
    }
  }

  if (isNum(marketCap) && isNum(latestRevenue)) {
    const ps = marketCap! / latestRevenue!;
    if (ps > PS_ERROR) {
      out.push({
        rule: 'ps_sanity',
        severity: 'error',
        message: `mcap/revenue=${ps.toFixed(1)} > ${PS_ERROR}: imposible salvo revenue roto (ver range/unit rules)`,
        field: 'marketCap',
      });
    } else if (ps > PS_WARN) {
      out.push({
        rule: 'ps_sanity',
        severity: 'warn',
        message: `mcap/revenue=${ps.toFixed(1)} > ${PS_WARN}, revisar revenue`,
        field: 'marketCap',
      });
    }
  }

  return out;
}
