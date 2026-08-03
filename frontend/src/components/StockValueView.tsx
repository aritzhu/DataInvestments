import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Shield, AlertTriangle, TrendingUp, BarChart3, Settings, DollarSign } from 'lucide-react';
import '../styles/stockvalue.css';

interface ValuationData {
  company: { ticker: string; name: string };
  market: {
    currentPrice: number;
    marketCap: number;
    sharesOutstanding: number;
    currency: string;
    exchange: string;
  };
  financials: {
    fcf: number;
    revenue: number;
    netIncome: number;
    depreciation: number;
    capex: number;
  };
  dcf: {
    growthRate: number;
    discountRate: number;
    years: number;
    terminalGrowth: number;
    intrinsicValuePerShare: number;
    intrinsicValueTotal: number;
    marginOfSafety: number;
  };
}

function formatValue(value: number): string {
  if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

export function StockValueView() {
  const { ticker } = useParams<{ ticker: string }>();
  const [data, setData] = useState<ValuationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [growthRate, setGrowthRate] = useState(5);
  const [discountRate, setDiscountRate] = useState(10);
  const [years, setYears] = useState(10);

  const fetchValuation = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        growth: (growthRate / 100).toString(),
        discount: (discountRate / 100).toString(),
        years: years.toString(),
      });
      const res = await fetch(`/api/companies/${ticker}/valuation?${params}`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Error loading valuation data');
        return;
      }
      const valData = await res.json();
      setData(valData);
    } catch {
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  }, [ticker, growthRate, discountRate, years]);

  useEffect(() => {
    fetchValuation();
  }, [fetchValuation]);

  if (loading) {
    return (
      <div className="sv-loading">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className="sv-spinner" />
          <p style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>Calculando valoración...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="sv-empty">
        <div className="sv-empty-icon">
          <BarChart3 size={32} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Sin datos de mercado</h2>
          <p style={{ color: 'var(--text-tertiary)' }}>{error || `No se pudieron obtener datos para ${ticker}`}</p>
        </div>
        <button onClick={() => window.history.back()} className="cf-back-btn">
          <ArrowLeft size={18} />
          Volver al Flujo de Caja
        </button>
      </div>
    );
  }

  const { market, financials, dcf } = data;
  const isUndervalued = dcf.intrinsicValuePerShare > market.currentPrice;
  const diffPercent = ((dcf.intrinsicValuePerShare - market.currentPrice) / market.currentPrice * 100);

  return (
    <div className="sv-content">
      {/* Header */}
      <div className="sv-header">
        <div className="sv-header-inner">
          <Link to="/" className="sv-back-link">
            <ArrowLeft size={16} />
            Volver al inicio
          </Link>
          <div className="sv-header-title-row">
            <div className="sv-header-avatar">
              {data.company.ticker.slice(0, 2)}
            </div>
            <div>
              <h1 className="sv-header-ticker">
                {data.company.ticker}
                <span className="sv-header-label">Valoración</span>
              </h1>
              <p className="sv-header-subtitle">{data.company.name}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="sv-tabs">
            <Link to={`/cashflow/${ticker}`} className="sv-tab sv-tab--inactive">
              <DollarSign size={16} />
              Flujo de Caja
            </Link>
            <Link to={`/valuation/${ticker}`} className="sv-tab sv-tab--active">
              <Shield size={16} />
              Valoración
            </Link>
          </div>
        </div>
      </div>

      <div className="sv-content-inner">
        {/* Comparison cards */}
        <div className="sv-cards-grid">
          <div className="sv-card" style={{ animationDelay: '0s' }}>
            <p className="sv-card-label">Precio Actual</p>
            <p className="sv-card-value">${market.currentPrice.toFixed(2)}</p>
            <div className="sv-card-footer" style={{ color: 'var(--text-tertiary)' }}>
              <TrendingUp size={14} />
              <span>{market.exchange}</span>
            </div>
          </div>

          <div className={`sv-card ${isUndervalued ? 'sv-card--emerald' : 'sv-card--red'}`} style={{ animationDelay: '0.1s' }}>
            <p className="sv-card-label">Valor Intrínseco (DCF)</p>
            <p className={`sv-card-value ${isUndervalued ? 'sv-card-value--emerald' : 'sv-card-value--red'}`}>
              ${dcf.intrinsicValuePerShare.toFixed(2)}
            </p>
            <div className={`sv-card-footer ${isUndervalued ? 'sv-card-footer--emerald' : 'sv-card-footer--red'}`}>
              <Shield size={14} />
              <span>{isUndervalued ? 'Potencial de subida' : 'Posible sobrevaloración'}</span>
            </div>
          </div>

          <div className={`sv-margin-card ${isUndervalued ? 'sv-margin-card--undervalued' : 'sv-margin-card--overvalued'}`} style={{ animationDelay: '0.2s' }}>
            <div className="sv-margin-header">
              {isUndervalued ? <Shield size={20} style={{ color: 'var(--blue-light)' }} /> : <AlertTriangle size={20} style={{ color: 'var(--amber)' }} />}
              <span className="sv-margin-title">Margen de Seguridad</span>
            </div>
            <p className={`sv-margin-value ${isUndervalued ? 'sv-margin-value--green' : 'sv-margin-value--amber'}`}>
              {diffPercent > 0 ? '+' : ''}{diffPercent.toFixed(1)}%
            </p>
            <p className={`sv-margin-desc ${isUndervalued ? 'sv-margin-desc--green' : 'sv-margin-desc--amber'}`}>
              {isUndervalued
                ? `El mercado subestima un ${Math.abs(diffPercent).toFixed(1)}%`
                : `El mercado sobreestima un ${Math.abs(diffPercent).toFixed(1)}%`
              }
            </p>
          </div>
        </div>

        {/* DCF Formula */}
        <div className="sv-formula-card">
          <h2 className="sv-formula-title">Cómo se calcula el Valor Intrínseco</h2>
          <p className="sv-formula-subtitle">How Intrinsic Value is Calculated</p>

          <div className="sv-formula-grid">
            <div>
              <div className="sv-formula-group">
                <p className="sv-formula-label">1. Flujo de Caja Libre / Free Cash Flow (FCF)</p>
                <code className="sv-formula-code">FCF = Beneficio Neto + Amortizaciones − CAPEX</code>
                <code className="sv-formula-code sv-formula-code--sub">FCF = Net Income + Depreciation − Capital Expenditures</code>
              </div>

              <div className="sv-formula-group">
                <p className="sv-formula-label">2. Valor Actual de los Flujos / Present Value (DCF)</p>
                <code className="sv-formula-code">Valor = Σ [ FCF × (1+g)ⁿ / (1+r)ⁿ ]</code>
                <code className="sv-formula-code sv-formula-code--sub">Sum of projected FCFs discounted to present value</code>
              </div>

              <div className="sv-formula-group">
                <p className="sv-formula-label">3. Valor Terminal / Terminal Value (Gordon Growth)</p>
                <code className="sv-formula-code">TV = FCF<sub>N</sub> × (1 + 3%) / (r − 3%)</code>
                <code className="sv-formula-code sv-formula-code--sub">Terminal value assumes 3% perpetual growth</code>
              </div>
            </div>

            <div>
              <p className="sv-params-title">Parámetros / Parameters</p>
              <div className="sv-params-list">
                <div className="sv-param-item">
                  <span className="sv-param-symbol sv-param-symbol--blue">g</span>
                  <span className="sv-param-desc">Crecimiento anual del FCF / Annual FCF growth</span>
                </div>
                <div className="sv-param-item">
                  <span className="sv-param-symbol sv-param-symbol--purple">r</span>
                  <span className="sv-param-desc">Tasa de descuento (WACC) / Discount rate (WACC)</span>
                </div>
                <div className="sv-param-item">
                  <span className="sv-param-symbol sv-param-symbol--emerald">N</span>
                  <span className="sv-param-desc">Horizonte de proyección / Projection horizon</span>
                </div>
                <div className="sv-param-item">
                  <span className="sv-param-symbol sv-param-symbol--amber">3%</span>
                  <span className="sv-param-desc">Crecimiento terminal (basado en PIB) / Terminal growth (GDP-based)</span>
                </div>
              </div>
              <p className="sv-data-source">
                Datos financieros: <strong>SEC EDGAR</strong> (último 10-K) · Precio: <strong>Yahoo Finance</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Comparison bars */}
        <div className="sv-comparison-section">
          <h2 className="sv-comparison-title">Comparativa de Valoración</h2>
          <p className="sv-comparison-subtitle">Precio de mercado vs valor intrínseco estimado</p>
          <div className="sv-comparison-container">
            <ValuationComparison
              currentPrice={market.currentPrice}
              intrinsicValue={dcf.intrinsicValuePerShare}
              isUndervalued={isUndervalued}
              diffPercent={diffPercent}
            />
          </div>
        </div>

        {/* DCF Calculator */}
        <div className="sv-calculator-section">
          <div className="sv-calculator-header">
            <Settings size={20} style={{ color: 'var(--text-secondary)' }} />
            <h2 className="sv-calculator-title">Calculadora DCF</h2>
          </div>

          <div className="sv-calculator-grid">
            {/* Growth Rate */}
            <div className="sv-slider-group">
              <div className="sv-slider-header">
                <label className="sv-slider-label">Tasa de Crecimiento</label>
                <span className="sv-slider-value sv-slider-value--blue">{growthRate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="0.5"
                value={growthRate}
                onChange={(e) => setGrowthRate(parseFloat(e.target.value))}
                className="sv-slider-input sv-slider-input--blue"
              />
              <div className="sv-slider-range">
                <span>0%</span>
                <span>15%</span>
              </div>
              <p className="sv-slider-hint">Crecimiento anual esperado del FCF</p>
            </div>

            {/* Discount Rate */}
            <div className="sv-slider-group">
              <div className="sv-slider-header">
                <label className="sv-slider-label">Tasa de Descuento</label>
                <span className="sv-slider-value sv-slider-value--purple">{discountRate}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="20"
                step="0.5"
                value={discountRate}
                onChange={(e) => setDiscountRate(parseFloat(e.target.value))}
                className="sv-slider-input sv-slider-input--purple"
              />
              <div className="sv-slider-range">
                <span>5%</span>
                <span>20%</span>
              </div>
              <p className="sv-slider-hint">WACC o tasa de retorno requerida</p>
            </div>

            {/* Years */}
            <div className="sv-slider-group">
              <div className="sv-slider-header">
                <label className="sv-slider-label">Horizonte</label>
                <span className="sv-slider-value sv-slider-value--emerald">{years} años</span>
              </div>
              <input
                type="range"
                min="3"
                max="20"
                step="1"
                value={years}
                onChange={(e) => setYears(parseInt(e.target.value))}
                className="sv-slider-input sv-slider-input--emerald"
              />
              <div className="sv-slider-range">
                <span>3</span>
                <span>20</span>
              </div>
              <p className="sv-slider-hint">Años de proyección</p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="sv-financial-section">
          <h2 className="sv-financial-title">Datos Financieros Base</h2>
          <div className="sv-financial-grid">
            <div className="sv-financial-item sv-financial-item--blue">
              <p className="sv-financial-label">Free Cash Flow</p>
              <p className="sv-financial-value sv-financial-value--blue">{formatValue(financials.fcf)}</p>
            </div>
            <div className="sv-financial-item sv-financial-item--emerald">
              <p className="sv-financial-label">Ingresos</p>
              <p className="sv-financial-value sv-financial-value--emerald">{formatValue(financials.revenue)}</p>
            </div>
            <div className="sv-financial-item sv-financial-item--purple">
              <p className="sv-financial-label">Beneficio Neto</p>
              <p className="sv-financial-value sv-financial-value--purple">{formatValue(financials.netIncome)}</p>
            </div>
            <div className="sv-financial-item sv-financial-item--amber">
              <p className="sv-financial-label">Market Cap</p>
              <p className="sv-financial-value sv-financial-value--amber">{formatValue(market.marketCap)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValuationComparison({
  currentPrice,
  intrinsicValue,
  isUndervalued,
  diffPercent,
}: {
  currentPrice: number;
  intrinsicValue: number;
  isUndervalued: boolean;
  diffPercent: number;
}) {
  const maxVal = Math.max(currentPrice, intrinsicValue);
  const priceWidth = maxVal > 0 ? (currentPrice / maxVal) * 100 : 0;
  const intrinsicWidth = maxVal > 0 ? (intrinsicValue / maxVal) * 100 : 0;

  return (
    <div>
      {/* Current Price Bar */}
      <div className="sv-bar-group">
        <div className="sv-bar-header">
          <span className="sv-bar-label">Precio Actual</span>
          <span className="sv-bar-value">${currentPrice.toFixed(2)}</span>
        </div>
        <div className="sv-bar-track">
          <div
            className="sv-bar-fill sv-bar-fill--gray"
            style={{ width: `${Math.max(priceWidth, 5)}%` }}
          >
            {priceWidth > 20 && <span className="sv-bar-fill-text">${currentPrice.toFixed(2)}</span>}
          </div>
        </div>
      </div>

      {/* Intrinsic Value Bar */}
      <div className="sv-bar-group">
        <div className="sv-bar-header">
          <span className="sv-bar-label">Valor Intrínseco (DCF)</span>
          <span className="sv-bar-value" style={{ color: isUndervalued ? 'var(--blue-light)' : 'var(--red)' }}>
            ${intrinsicValue.toFixed(2)}
          </span>
        </div>
        <div className="sv-bar-track">
          <div
            className={`sv-bar-fill ${isUndervalued ? 'sv-bar-fill--green' : 'sv-bar-fill--red'}`}
            style={{ width: `${Math.max(intrinsicWidth, 5)}%` }}
          >
            {intrinsicWidth > 20 && <span className="sv-bar-fill-text">${intrinsicValue.toFixed(2)}</span>}
          </div>
        </div>
      </div>

      {/* Difference Indicator */}
      <div className={`sv-diff-indicator ${isUndervalued ? 'sv-diff-indicator--green' : 'sv-diff-indicator--red'}`}>
        <div className="sv-diff-left">
          <div className={`sv-diff-icon ${isUndervalued ? 'sv-diff-icon--green' : 'sv-diff-icon--red'}`}>
            {isUndervalued ? <TrendingUp size={20} /> : <AlertTriangle size={20} />}
          </div>
          <div>
            <p className={`sv-diff-title ${isUndervalued ? 'sv-diff-title--green' : 'sv-diff-title--red'}`}>
              {isUndervalued ? 'Infravalorada' : 'Sobrevalorada'}
            </p>
            <p className="sv-diff-desc">
              {isUndervalued ? 'El mercado subestima esta acción' : 'El mercado sobreestima esta acción'}
            </p>
          </div>
        </div>
        <div className="sv-diff-right">
          <p className={`sv-diff-percent ${isUndervalued ? 'sv-diff-percent--green' : 'sv-diff-percent--red'}`}>
            {diffPercent > 0 ? '+' : ''}{diffPercent.toFixed(1)}%
          </p>
          <p className="sv-diff-label">diferencia</p>
        </div>
      </div>
    </div>
  );
}
