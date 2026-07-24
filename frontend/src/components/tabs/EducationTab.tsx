import type { CompanyProfile } from '../CompanyPage';
import { SectionReveal } from '../ui/SectionReveal';
import { formatNum } from '../../utils/format';
import '../../styles/education.css';

interface Props {
  financial: CompanyProfile['financials'][0] | undefined;
  balanceSheet: CompanyProfile['balanceSheets'][0] | null;
  stock: CompanyProfile['stockMetrics'][0] | null;
}

export function EducationTab({ financial, balanceSheet, stock }: Props) {
  if (!financial) {
    return <div className="tab-empty">Sin datos financieros disponibles</div>;
  }

  const f = financial;
  const grossProfit = f.grossProfit ?? (f.revenue - f.costOfRevenue);
  const otherOpex = Math.max(0, f.operatingExpenses - f.sgaExpense - f.rdExpense);

  const per100 = [
    { label: 'Ingresos por ventas', value: 100, color: '#2563eb', type: 'total' as const },
    { label: 'Costos directos (COGS)', value: -((f.costOfRevenue / f.revenue) * 100), color: '#ef4444', type: 'expense' as const },
    { label: 'Beneficio bruto', value: (grossProfit / f.revenue) * 100, color: '#10b981', type: 'subtotal' as const },
    { label: 'Gastos comerciales (SGA)', value: -((f.sgaExpense / f.revenue) * 100), color: '#f97316', type: 'expense' as const },
    { label: 'I+D', value: -((f.rdExpense / f.revenue) * 100), color: '#f59e0b', type: 'expense' as const },
    { label: 'Otros gastos operativos', value: -((otherOpex / f.revenue) * 100), color: '#fb923c', type: 'expense' as const },
    { label: 'Intereses', value: -((f.interestExpense / f.revenue) * 100), color: '#ef4444', type: 'expense' as const },
    { label: 'Impuestos', value: -((f.taxExpense / f.revenue) * 100), color: '#ef4444', type: 'expense' as const },
    { label: 'Beneficio neto', value: (f.netIncome / f.revenue) * 100, color: '#10b981', type: 'total' as const },
  ];

  const netMargin = (f.netIncome / f.revenue) * 100;

  // --- "Qué compra tu acción" data ---
  const shares = stock?.sharesOutstanding ?? null;
  const price = stock?.currentPrice ?? null;
  const equity = balanceSheet?.totalStockholdersEquity ?? f.totalEquity ?? null;
  const totalAssets = balanceSheet?.totalAssets ?? f.totalAssets ?? null;

  const pricePerShare = price;
  const equityPerShare = (shares && equity) ? equity / shares : null;
  const ownershipOfCompany = (shares && equity && price) ? (equityPerShare! / price) * 100 : null;

  const assetBreakdown = shares ? [
    { label: 'Caja y efectivo', value: (balanceSheet?.cashAndCashEquivalents ?? 0) / shares, total: balanceSheet?.cashAndCashEquivalents ?? 0, color: '#2563eb' },
    { label: 'Fábricas y equipos', value: (balanceSheet?.propertyPlantEquipment ?? 0) / shares, total: balanceSheet?.propertyPlantEquipment ?? 0, color: '#6366f1' },
    { label: 'Patentes e intangibles', value: (balanceSheet?.intangibleAssets ?? 0) / shares, total: balanceSheet?.intangibleAssets ?? 0, color: '#a855f7' },
    { label: 'Inventarios', value: (balanceSheet?.inventory ?? 0) / shares, total: balanceSheet?.inventory ?? 0, color: '#f59e0b' },
    { label: 'Otros activos', value: ((totalAssets ?? 0) - (balanceSheet?.cashAndCashEquivalents ?? 0) - (balanceSheet?.propertyPlantEquipment ?? 0) - (balanceSheet?.intangibleAssets ?? 0) - (balanceSheet?.inventory ?? 0)) / shares, total: ((totalAssets ?? 0) - (balanceSheet?.cashAndCashEquivalents ?? 0) - (balanceSheet?.propertyPlantEquipment ?? 0) - (balanceSheet?.intangibleAssets ?? 0) - (balanceSheet?.inventory ?? 0)), color: '#64748b' },
  ].filter(a => a.total > 0) : [];

  const maxAssetValue = Math.max(...assetBreakdown.map(a => a.value), 0);
  const earningsPerShare = shares ? f.netIncome / shares : null;
  const fcfPerShare = (shares && f.freeCashFlow != null) ? f.freeCashFlow / shares : null;
  const pbPerShare = (price && equityPerShare) ? price / equityPerShare : null;

  const hasOwnershipData = shares && price && equity;

  return (
    <div className="edu-tab">
      {/* === Section 1: Per €100 Waterfall === */}
      <SectionReveal delay={0}>
        <div className="edu-hero">
          <h3 className="edu-title">Por cada 100 € que entran en la empresa</h3>
          <p className="edu-subtitle">Una forma intuitiva de entender la rentabilidad de {financial.year}</p>
        </div>
      </SectionReveal>

      <SectionReveal delay={100}>
        <div className="edu-waterfall">
          {per100.map((row, i) => {
            const absVal = Math.abs(row.value);
            const widthPct = absVal;
            return (
              <div key={i} className={`edu-row edu-row--${row.type}`}>
                <span className="edu-label">{row.label}</span>
                <div className="edu-bar-area">
                  <div
                    className={`edu-bar edu-bar--${row.type}`}
                    style={{ width: `${widthPct}%`, background: row.color }}
                  />
                </div>
                <span className={`edu-value edu-value--${row.type}`}>
                  {row.value < 0 ? '−' : ''}{Math.abs(row.value).toFixed(1)} €
                </span>
              </div>
            );
          })}
        </div>
      </SectionReveal>

      <SectionReveal delay={200}>
        <div className="edu-insight">
          <h4>¿Qué significa esto?</h4>
          <p>
            Por cada <strong>100 €</strong> que la empresa ingresa por ventas,{' '}
            <strong>{((f.costOfRevenue / f.revenue) * 100).toFixed(0)} €</strong> se van en costos directos,{' '}
            <strong>{((f.sgaExpense / f.revenue) * 100).toFixed(0)} €</strong> en gastos comerciales y administrativos,{' '}
            <strong>{((f.rdExpense / f.revenue) * 100).toFixed(0)} €</strong> en investigación y desarrollo,{' '}
            y <strong>{((f.taxExpense / f.revenue) * 100).toFixed(0)} €</strong> en impuestos.
          </p>
          <p>
            Al final, por cada 100 € de ingresos, la empresa conserva <strong>{netMargin.toFixed(1)} €</strong> como beneficio neto.
            {netMargin > 20 ? ' Es una empresa con márgenes muy saludables.' :
             netMargin > 10 ? ' Tiene márgenes razonables para su sector.' :
             ' Tiene márgenes ajustados, algo a tener en cuenta.'}
          </p>
        </div>
      </SectionReveal>

      {/* === Section 2: Qué compra tu acción === */}
      {hasOwnershipData && (
        <SectionReveal delay={100}>
          <div className="edu-ownership-card">
            <div className="edu-ownership-hero">
              <h3 className="edu-ownership-title">Qué compra tu acción</h3>
              <p className="edu-ownership-subtitle">
                Una forma intuitiva de entender qué posees al invertir en 1 acción de {financial.year}
              </p>
            </div>

            {/* Vertical Cascade */}
            <div className="edu-ownership-flow">
              {/* Empresa */}
              <div className="edu-ownership-node">
                <span className="edu-ownership-node-label">Empresa</span>
                <span className="edu-ownership-node-value">{financial.year}</span>
                <span className="edu-ownership-node-desc">Patrimonio neto total</span>
              </div>

              <div className="edu-ownership-arrow">
                <div className="edu-ownership-arrow-line" />
                <span className="edu-ownership-arrow-icon">↓</span>
              </div>

              {/* Patrimonio */}
              <div className="edu-ownership-node">
                <span className="edu-ownership-node-label">Patrimonio neto</span>
                <span className="edu-ownership-node-value">{formatNum(equity)}</span>
                <span className="edu-ownership-node-desc">Total assets − total liabilities</span>
              </div>

              <div className="edu-ownership-arrow">
                <div className="edu-ownership-arrow-line" />
                <span className="edu-ownership-arrow-icon">↓</span>
              </div>

              {/* Número de acciones */}
              <div className="edu-ownership-node">
                <span className="edu-ownership-node-label">Acciones en circulación</span>
                <span className="edu-ownership-node-value">{shares != null ? `${(shares / 1e6).toFixed(1)} M` : '—'}</span>
                <span className="edu-ownership-node-desc">Cada una representa una fracción del patrimonio</span>
              </div>

              <div className="edu-ownership-arrow">
                <div className="edu-ownership-arrow-line" />
                <span className="edu-ownership-arrow-icon">↓</span>
              </div>

              {/* 1 Acción */}
              <div className="edu-ownership-node edu-ownership-node--highlight">
                <span className="edu-ownership-node-label">1 acción</span>
                <span className="edu-ownership-node-value">${pricePerShare?.toFixed(2)}</span>
                <span className="edu-ownership-node-desc">
                  {ownershipOfCompany != null ? `${ownershipOfCompany.toFixed(4)}% de la empresa` : 'Equity por acción: ' + formatNum(equityPerShare)}
                </span>
              </div>
            </div>

            {/* Asset Breakdown */}
            {assetBreakdown.length > 0 && (
              <div className="edu-ownership-breakdown">
                <div className="edu-ownership-breakdown-title">Lo que posee tu acción</div>
                <div className="edu-ownership-asset-list">
                  {assetBreakdown.map((asset) => (
                    <div key={asset.label} className="edu-ownership-asset">
                      <div className="edu-ownership-asset-row">
                        <span className="edu-ownership-asset-label">{asset.label}</span>
                        <span>
                          <span className="edu-ownership-asset-value">${asset.value.toFixed(2)}</span>
                          <span className="edu-ownership-asset-pct">
                            ({totalAssets ? ((asset.total / totalAssets) * 100).toFixed(1) : '0'}%)
                          </span>
                        </span>
                      </div>
                      <div className="edu-ownership-asset-bar-track">
                        <div
                          className="edu-ownership-asset-bar"
                          style={{
                            width: `${maxAssetValue > 0 ? (asset.value / maxAssetValue) * 100 : 0}%`,
                            background: asset.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  <hr className="edu-ownership-divider" />

                  {/* Beneficio y FCF */}
                  <div className="edu-ownership-asset">
                    <div className="edu-ownership-asset-row">
                      <span className="edu-ownership-asset-label" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Beneficio neto</span>
                      <span className="edu-ownership-asset-value" style={{ color: '#10b981' }}>
                        ${earningsPerShare?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {fcfPerShare != null && (
                    <div className="edu-ownership-asset">
                      <div className="edu-ownership-asset-row">
                        <span className="edu-ownership-asset-label" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Free Cash Flow</span>
                        <span className="edu-ownership-asset-value" style={{ color: '#2563eb' }}>
                          ${fcfPerShare.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Per-share metrics */}
                <div className="edu-ownership-metrics">
                  <div className="edu-ownership-metric">
                    <span className="edu-ownership-metric-label">P/B implícito</span>
                    <span className="edu-ownership-metric-value">{pbPerShare?.toFixed(2) ?? '—'}</span>
                  </div>
                  <div className="edu-ownership-metric">
                    <span className="edu-ownership-metric-label">Beneficio / acción</span>
                    <span className="edu-ownership-metric-value">${earningsPerShare?.toFixed(2) ?? '—'}</span>
                  </div>
                  <div className="edu-ownership-metric">
                    <span className="edu-ownership-metric-label">FCF / acción</span>
                    <span className="edu-ownership-metric-value">${fcfPerShare?.toFixed(2) ?? '—'}</span>
                  </div>
                </div>

                {/* Asset-Based Verdict */}
                {equityPerShare != null && pricePerShare != null && (
                  <div className="edu-ownership-verdict">
                    <div className="edu-ownership-verdict-title">¿Estás pagando un precio justo por los activos?</div>
                    <div className="edu-ownership-verdict-grid">
                      <div className="edu-ownership-verdict-item">
                        <span className="edu-ownership-verdict-label">Valor en libros por acción</span>
                        <span className="edu-ownership-verdict-value">${equityPerShare.toFixed(2)}</span>
                      </div>
                      <div className="edu-ownership-verdict-item">
                        <span className="edu-ownership-verdict-label">Precio que pagas</span>
                        <span className="edu-ownership-verdict-value">${pricePerShare.toFixed(2)}</span>
                      </div>
                      <div className="edu-ownership-verdict-item">
                        <span className="edu-ownership-verdict-label">P/B implícito</span>
                        <span className="edu-ownership-verdict-value">{(pricePerShare / equityPerShare).toFixed(2)}x</span>
                      </div>
                    </div>
                    <div className="edu-ownership-verdict-signal">
                      {(pricePerShare / equityPerShare) <= 1 ? (
                        <>
                          <span className="edu-signal edu-signal--buy">INFRVALORADA por activos</span>
                          <span className="edu-signal-desc">Pagas menos del valor contable de los activos netos</span>
                        </>
                      ) : (pricePerShare / equityPerShare) <= 3 ? (
                        <>
                          <span className="edu-signal edu-signal--hold">JUSTA por activos</span>
                          <span className="edu-signal-desc">El precio es razonable respecto al patrimonio neto</span>
                        </>
                      ) : (
                        <>
                          <span className="edu-signal edu-signal--sell">SOBREVALORADA por activos</span>
                          <span className="edu-signal-desc">Pagas {((pricePerShare / equityPerShare)).toFixed(1)}x el valor contable — la prima es alta</span>
                        </>
                      )}
                    </div>
                    <p className="verdict-explanation">
                      El <strong>valor en libros</strong> es lo que quedaría si la empresa vendiera todos sus activos y pagara todas sus deudas hoy. El ratio <strong>P/B</strong> compara el precio que pagas con ese valor contable. Un P/B de 1x significa que compras la empresa a precio de libros; por debajo de 1x es una ganga potencial. Empresas tecnológicas suelen tener P/B alto porque sus activos más valiosos (marcas, patentes) no siempre se reflejan en los libros.
                    </p>
                  </div>
                )}

                {/* Liquidation Value */}
                {shares && balanceSheet && (
                  <div className="edu-ownership-verdict">
                    <div className="edu-ownership-verdict-title">¿Cuánto valdría si la empresa se liquidara?</div>
                    <div className="edu-ownership-verdict-grid">
                      <div className="edu-ownership-verdict-item">
                        <span className="edu-ownership-verdict-label">Valor de liquidación / acción</span>
                        <span className="edu-ownership-verdict-value">${((balanceSheet.cashAndCashEquivalents ?? 0) + 0.5 * (balanceSheet.accountsReceivable ?? 0) + 0.5 * (balanceSheet.inventory ?? 0) - (balanceSheet.totalLiabilities ?? 0)).toFixed(2)}</span>
                      </div>
                      <div className="edu-ownership-verdict-item">
                        <span className="edu-ownership-verdict-label">Efectivo por acción</span>
                        <span className="edu-ownership-verdict-value">${((balanceSheet.cashAndCashEquivalents ?? 0) / shares).toFixed(2)}</span>
                      </div>
                      <div className="edu-ownership-verdict-item">
                        <span className="edu-ownership-verdict-label">Deuda neta / acción</span>
                        <span className="edu-ownership-verdict-value">${(((balanceSheet.shortTermDebt ?? 0) + (balanceSheet.longTermDebt ?? 0) - (balanceSheet.cashAndCashEquivalents ?? 0)) / shares).toFixed(2)}</span>
                      </div>
                    </div>
                    <p className="verdict-explanation">
                      El <strong>valor de liquidación</strong> es la estimación más conservadora: cuánto valdría cada acción si la empresa se disolviera mañana, vendiera efectivo y cobros al 100%, inventarios al 50%, y pagara toda la deuda. Si el precio actual es <strong>inferior al valor de liquidación</strong>, estás comprando por debajo del valor más pesimista posible — algo que raramente ocurre con empresas sanas.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </SectionReveal>
      )}
    </div>
  );
}
