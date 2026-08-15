import { useEffect, useMemo, useState } from 'react';
import { Loader2, AlertTriangle, Calendar } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { formatNum } from '../../utils/format';

interface RawTags {
  sec: string[];
  european: string[];
  yahoo: string[];
}

interface RawRow {
  field: string;
  label: string;
  category: string;
  value: number | null;
  tags: RawTags;
  winningTag: string | null;
}

interface RawBlock {
  source: string;
  tier: string | null;
  rows: RawRow[];
}

interface RawYear {
  year: number;
  quarter: number | null;
  financial: RawBlock | null;
  balance: RawBlock | null;
}

interface RawResponse {
  ticker: string;
  name: string;
  years: RawYear[];
}

const SOURCE_LABELS: Record<keyof RawTags, string> = {
  sec: 'SEC',
  european: 'ESEF',
  yahoo: 'Yahoo',
};

const CATEGORY_TITLES: Record<string, string> = {
  income_statement: 'Cuenta de resultados',
  cash_flow: 'Flujo de caja',
  balance_sheet_assets: 'Balance — Activo',
  balance_sheet_liabilities: 'Balance — Pasivo',
  balance_sheet_equity: 'Balance — Fondos Propios',
  shares_eps: 'Acciones y EPS',
  other: 'Otros',
};

interface Props {
  ticker: string;
  isAdmin: boolean;
  selectedYear: number | null;
}

function RawBlockTable({ block, title }: { block: RawBlock | null; title: string }) {
  if (!block) return null;

  const groups = useMemo(() => {
    const map = new Map<string, RawRow[]>();
    for (const row of block.rows) {
      const list = map.get(row.category) ?? [];
      list.push(row);
      map.set(row.category, list);
    }
    return [...map.entries()];
  }, [block]);

  const srcKey = block.source.includes('sec')
    ? 'sec'
    : block.source.includes('esef')
      ? 'european'
      : 'yahoo';

  const totalTags = (row: RawRow) =>
    row.tags.sec.length + row.tags.european.length + row.tags.yahoo.length;

  return (
    <section className="raw-block">
      <div className="raw-block-header">
        <h3 className="raw-block-title">{title}</h3>
        <span className="raw-block-meta">
          Fuente: <strong>{block.source}</strong>
          {block.tier != null && <> · Tier <strong>{block.tier}</strong></>}
        </span>
      </div>
      {groups.length === 0 ? (
        <p className="raw-empty">Sin datos</p>
      ) : (
        <div className="raw-table-wrap">
          <table className="raw-table">
            <thead>
              <tr className="raw-header-row">
                <th className="raw-label">Campo</th>
                <th className="raw-value">Valor</th>
                <th className="raw-tags">Etiquetas (tags)</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(([category, rows]) => (
                <RawCategoryGroup key={category} title={CATEGORY_TITLES[category] ?? category} rows={rows} totalTags={totalTags} srcKey={srcKey} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RawCategoryGroup({
  title,
  rows,
  totalTags,
  srcKey,
}: {
  title: string;
  rows: RawRow[];
  totalTags: (row: RawRow) => number;
  srcKey: keyof RawTags;
}) {
  return (
    <>
      <tr className="raw-cat-row">
        <td colSpan={3} className="raw-cat-title">{title}</td>
      </tr>
      {rows.map((row) => (
        <tr key={row.field} className="raw-row">
          <td className="raw-label">{row.label}</td>
          <td className="raw-value">
            {formatNum(row.value)}
            {row.winningTag && (
              <div className={`raw-winning-tag raw-winning-tag--${srcKey}`} title="Etiqueta usada para extraer este valor">
                ✓ Tag usado: <code>{row.winningTag}</code>
              </div>
            )}
          </td>
          <td className="raw-tags">
            {totalTags(row) === 0 ? (
              <span className="raw-no-tags">Sin etiquetas</span>
            ) : (
              <div className="raw-tag-list">
                {(Object.keys(SOURCE_LABELS) as Array<keyof RawTags>).map((src) =>
                  row.tags[src].length > 0 ? (
                    <span key={src} className={`raw-tag-group raw-tag-group--${src}`}>
                      <span className="raw-tag-src">{SOURCE_LABELS[src]}</span>
                      {row.tags[src].map((tag) => (
                        <span key={tag} className="raw-tag">{tag}</span>
                      ))}
                    </span>
                  ) : null,
                )}
              </div>
            )}
          </td>
        </tr>
      ))}
    </>
  );
}

export function RawDataTab({ ticker, isAdmin, selectedYear }: Props) {
  const [data, setData] = useState<RawResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(selectedYear);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    apiFetch(`/api/admin/companies/${encodeURIComponent(ticker)}/raw`)
      .then(async (res) => {
        if (!res.ok) {
          let msg = `Error ${res.status}`;
          try {
            const d = await res.json();
            if (d?.error) msg = d.error;
          } catch {
            /* ignore */
          }
          throw new Error(msg);
        }
        return res.json() as Promise<RawResponse>;
      })
      .then((d) => {
        setData(d);
        const years = [...new Set(d.years.map((y) => y.year))];
        setYear((prev) => (prev != null && years.includes(prev) ? prev : (years[0] ?? null)));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [ticker, isAdmin]);

  useEffect(() => {
    if (selectedYear != null) setYear(selectedYear);
  }, [selectedYear]);

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="raw-loading">
        <Loader2 size={20} className="raw-spin" />
        <span>Cargando datos raw…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="raw-error">
        <AlertTriangle size={18} />
        <span>{error}</span>
      </div>
    );
  }

  if (!data || data.years.length === 0) {
    return <div className="raw-empty-banner">Sin datos raw disponibles para esta empresa.</div>;
  }

  const availableYears = [...new Set(data.years.map((y) => y.year))];
  const yearEntries = data.years.filter((y) => y.year === year);
  const current = yearEntries.find((y) => y.quarter == null) ?? yearEntries[0] ?? null;

  return (
    <div className="raw-tab">
      {availableYears.length > 1 && (
        <div className="cp-year-bar">
          <Calendar size={16} />
          <span className="cp-year-label">Año:</span>
          <div className="cp-year-pills">
            {availableYears.map((y) => (
              <button
                key={y}
                className={`cp-year-pill ${year === y ? 'cp-year-pill--active' : ''}`}
                onClick={() => setYear(y)}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      )}
      {current ? (
        <>
          {current.financial && (
            <RawBlockTable block={current.financial} title={`Resultado — ${current.year}${current.quarter != null ? ` Q${current.quarter}` : ''}`} />
          )}
          {current.balance && (
            <RawBlockTable block={current.balance} title={`Balance — ${current.year}${current.quarter != null ? ` Q${current.quarter}` : ''}`} />
          )}
          {!current.financial && !current.balance && (
            <div className="raw-empty-banner">Sin datos raw para {current.year}.</div>
          )}
        </>
      ) : (
        <div className="raw-empty-banner">Selecciona un año para ver los datos raw.</div>
      )}
    </div>
  );
}
