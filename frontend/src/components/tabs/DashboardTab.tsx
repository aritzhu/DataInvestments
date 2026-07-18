import { TrendingUp, BarChart3, DollarSign, Landmark, Shield, PieChart } from 'lucide-react';
import type { CompanyProfile } from '../CompanyPage';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { SectionReveal } from '../ui/SectionReveal';
import { formatPct, safeDiv } from '../../utils/format';
import { computeAll, weightedAverage, getVerdict, VERDICT_COLORS, VERDICT_BG, VERDICT_BORDER, type ValuationInput, getSectorConfigs } from '../../utils/valuation';
import '../../styles/dashboard.css';

interface Props {
  company: CompanyProfile['company'];
  financial: CompanyProfile['financials'][0] | undefined;
  financials: CompanyProfile['financials'];
  balanceSheets: CompanyProfile['balanceSheets'];
  stock: CompanyProfile['stockMetrics'][0] | null;
}

export function DashboardTab({ company, financial, financials, balanceSheets, stock }: Props) {
  if (!financial) {
    return <div className="dash-empty">Sin datos financieros disponibles</div>;
  }

  const marketCap = stock?.marketCap;
  const ev = stock?.enterpriseValue;
  const grossMargin = safeDiv(financial.grossProfit ?? 0, financial.revenue);
  const netMargin = safeDiv(financial.netIncome, financial.revenue);
  const ebitdaMargin = safeDiv(financial.ebitda ?? 0, financial.revenue);

  // Fair value computation
  const valInput: ValuationInput = { financials, balanceSheets, stock: stock! };
  const valResults = stock ? computeAll(valInput, getSectorConfigs(company.sector, company.industry)) : [];
  const avgFair = weightedAverage(valResults);
  const { verdict, upside, label: verdictLabel } = getVerdict(avgFair, stock?.currentPrice ?? 0);
  const validCount = valResults.filter(r => r.fairValue != null && r.fairValue > 0).length;

  return (
    <div className="dash-grid">
      {/* Price & Market */}
      <SectionReveal delay={0}>
        <div className="dash-card dash-card--hero">
          <div className="dash-card-icon dash-card-icon--blue"><DollarSign size={22} /></div>
          <div className="dash-card-body">
            <span className="dash-card-label">Precio actual</span>
            <span className="dash-card-value">
              $<AnimatedNumber value={stock?.currentPrice ?? 0} format={(n) => n.toFixed(2)} />
            </span>
          </div>
          <div className="dash-card-sub">
            {marketCap && <span>Market Cap: <AnimatedNumber value={marketCap} /></span>}
            {ev && <span>EV: <AnimatedNumber value={ev} /></span>}
          </div>
        </div>
      </SectionReveal>

      {/* Fair Value Verdict */}
      {avgFair != null && (
        <SectionReveal delay={40}>
          <div className="dash-card dash-card--verdict" style={{ background: VERDICT_BG[verdict], borderColor: VERDICT_BORDER[verdict] }}>
            <div className="dash-verdict-header">
              <span className="dash-verdict-dot" style={{ background: VERDICT_COLORS[verdict] }} />
              <span className="dash-verdict-label" style={{ color: VERDICT_COLORS[verdict] }}>{verdictLabel}</span>
              {upside != null && (
                <span className="dash-verdict-pct" style={{ color: VERDICT_COLORS[verdict] }}>
                  {upside > 0 ? '+' : ''}{(upside * 100).toFixed(1)}%
                </span>
              )}
            </div>
            <div className="dash-verdict-body">
              <div className="dash-verdict-row">
                <span className="dash-verdict-row-label">Valor intrínseco</span>
                <span className="dash-verdict-row-value">${avgFair.toFixed(2)}</span>
              </div>
              <div className="dash-verdict-row">
                <span className="dash-verdict-row-label">Precio actual</span>
                <span className="dash-verdict-row-value">${(stock?.currentPrice ?? 0).toFixed(2)}</span>
              </div>
              <div className="dash-verdict-row">
                <span className="dash-verdict-row-label">Métodos usados</span>
                <span className="dash-verdict-row-value">{validCount} / 10</span>
              </div>
            </div>
            <p className="verdict-explanation">
              Este valor ponderado combina <strong>10 métodos de valoración</strong> (DCF, PER, P/B, EV/EBITDA, etc.) para estimar cuánto debería costar realmente la acción. Si el valor intrínseco es <strong>mayor que el precio</strong>, la empresa está <strong>infravalorada</strong> (compramos barato). Si es menor, está <strong>sobrevalorada</strong> (pagamos de más).
            </p>
          </div>
        </SectionReveal>
      )}

      {/* Revenue */}
      <SectionReveal delay={60}>
        <div className="dash-card">
          <div className="dash-card-icon dash-card-icon--emerald"><BarChart3 size={22} /></div>
          <div className="dash-card-body">
            <span className="dash-card-label">Ingresos ({financial.year})</span>
            <span className="dash-card-value"><AnimatedNumber value={financial.revenue} /></span>
          </div>
        </div>
      </SectionReveal>

      {/* Net Income */}
      <SectionReveal delay={120}>
        <div className="dash-card">
          <div className="dash-card-icon dash-card-icon--violet"><TrendingUp size={22} /></div>
          <div className="dash-card-body">
            <span className="dash-card-label">Beneficio Neto</span>
            <span className="dash-card-value"><AnimatedNumber value={financial.netIncome} /></span>
          </div>
        </div>
      </SectionReveal>

      {/* Free Cash Flow */}
      <SectionReveal delay={180}>
        <div className="dash-card">
          <div className="dash-card-icon dash-card-icon--amber"><PieChart size={22} /></div>
          <div className="dash-card-body">
            <span className="dash-card-label">Free Cash Flow</span>
            <span className="dash-card-value"><AnimatedNumber value={financial.freeCashFlow ?? 0} /></span>
          </div>
        </div>
      </SectionReveal>

      {/* Margins */}
      <SectionReveal delay={240}>
        <div className="dash-card">
          <div className="dash-card-icon dash-card-icon--rose"><Shield size={22} /></div>
          <div className="dash-card-body">
            <span className="dash-card-label">Márgenes</span>
            <div className="dash-margins">
              <div className="dash-margin-item">
                <span className="dash-margin-label">Bruto</span>
                <span className="dash-margin-value">{grossMargin != null ? formatPct(grossMargin) : '—'}</span>
              </div>
              <div className="dash-margin-item">
                <span className="dash-margin-label">Neto</span>
                <span className="dash-margin-value">{netMargin != null ? formatPct(netMargin) : '—'}</span>
              </div>
              <div className="dash-margin-item">
                <span className="dash-margin-label">EBITDA</span>
                <span className="dash-margin-value">{ebitdaMargin != null ? formatPct(ebitdaMargin) : '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </SectionReveal>

      {/* Ratios */}
      <SectionReveal delay={300}>
        <div className="dash-card">
          <div className="dash-card-icon dash-card-icon--cyan"><Landmark size={22} /></div>
          <div className="dash-card-body">
            <span className="dash-card-label">Ratios Clave</span>
            <div className="dash-ratios">
              {stock?.peRatio != null && (
                <div className="dash-ratio">
                  <span className="dash-ratio-label">P/E</span>
                  <span className="dash-ratio-value">{stock.peRatio.toFixed(1)}</span>
                </div>
              )}
              {stock?.pbRatio != null && (
                <div className="dash-ratio">
                  <span className="dash-ratio-label">P/B</span>
                  <span className="dash-ratio-value">{stock.pbRatio.toFixed(1)}</span>
                </div>
              )}
              {stock?.roe != null && (
                <div className="dash-ratio">
                  <span className="dash-ratio-label">ROE</span>
                  <span className="dash-ratio-value">{formatPct(stock.roe)}</span>
                </div>
              )}
              {stock?.roa != null && (
                <div className="dash-ratio">
                  <span className="dash-ratio-label">ROA</span>
                  <span className="dash-ratio-value">{formatPct(stock.roa)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionReveal>

      {/* Company Info */}
      <SectionReveal delay={360}>
        <div className="dash-card dash-card--wide">
          <div className="dash-card-body">
            <span className="dash-card-label">Información de la empresa</span>
            <div className="dash-info-grid">
              {company.ceo && (
                <div className="dash-info-item">
                  <span className="dash-info-label">CEO</span>
                  <span className="dash-info-value">{company.ceo}</span>
                </div>
              )}
              {company.employees && (
                <div className="dash-info-item">
                  <span className="dash-info-label">Empleados</span>
                  <span className="dash-info-value">{company.employees.toLocaleString()}</span>
                </div>
              )}
              {company.country && (
                <div className="dash-info-item">
                  <span className="dash-info-label">País</span>
                  <span className="dash-info-value">{company.country}</span>
                </div>
              )}
              {company.exchange && (
                <div className="dash-info-item">
                  <span className="dash-info-label">Bolsa</span>
                  <span className="dash-info-value">{company.exchange}</span>
                </div>
              )}
              {company.website && (
                <div className="dash-info-item">
                  <span className="dash-info-label">Web</span>
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="dash-info-link">{company.website.replace(/^https?:\/\//, '')}</a>
                </div>
              )}
            </div>
            {company.description && (
              <p className="dash-description">{company.description}</p>
            )}
          </div>
        </div>
      </SectionReveal>
    </div>
  );
}
