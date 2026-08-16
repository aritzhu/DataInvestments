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

function sortPeriodDesc<T extends { year: number; quarter?: number | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return (b.quarter ?? 0) - (a.quarter ?? 0);
  });
}

function emptyTags(): RawTags {
  return { sec: [], european: [], yahoo: [] };
}

interface Props {
  ticker: string;
  isAdmin: boolean;
  selectedPeriod: 'ttm' | number | null;
  pills: Array<'ttm' | number>;
  ttmLabel: string;
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

export function RawDataTab({ ticker, isAdmin, selectedPeriod, pills, ttmLabel }: Props) {
  const [data, setData] = useState<RawResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'ttm' | number | null>(selectedPeriod);

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
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [ticker, isAdmin]);

  useEffect(() => {
    if (!data) return;
    setPeriod((prev) => (prev != null && pills.includes(prev) ? prev : (pills[0] ?? null)));
  }, [data, pills]);

  useEffect(() => {
    if (selectedPeriod != null) setPeriod(selectedPeriod);
  }, [selectedPeriod]);

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

  const annualEntries = sortPeriodDesc(data.years.filter((y) => (y.quarter ?? 0) === 0));
  const latestAnnual = annualEntries[0];
  const quarterEntries = data.years.filter((y) => (y.quarter ?? 0) > 0);
  const byQuarter = new Map(quarterEntries.map((y) => [`${y.year}-${y.quarter}`, y]));
  const latestQuarter = sortPeriodDesc(quarterEntries)[0];

  // Walk back 4 consecutive quarters with a financial block (mirrors the TTM
  // logic used on the rest of the page).
  const ttmQuarters: RawYear[] = [];
  if (latestQuarter) {
    let y = latestQuarter.year;
    let q = latestQuarter.quarter ?? 4;
    for (let i = 0; i < 4; i++) {
      const rec = byQuarter.get(`${y}-${q}`);
      if (!rec || !rec.financial) break;
      ttmQuarters.push(rec);
      q -= 1;
      if (q === 0) {
        q = 4;
        y -= 1;
      }
    }
  }
  const ttmFull = ttmQuarters.length === 4;

  const ttmFinancialBlock: RawBlock | null = ttmFull
    ? (() => {
        const blocks = ttmQuarters.map((y) => y.financial).filter((b): b is RawBlock => b != null);
        const skeleton = blocks[0].rows;
        const annualRows = latestAnnual?.financial?.rows ?? [];
        const rows = skeleton.map((row) => {
          const values = blocks.map((b) => b.rows.find((r) => r.field === row.field)?.value ?? null);
          const allPresent = values.every((v) => v != null);
          const fallback = annualRows.find((r) => r.field === row.field)?.value ?? null;
          return {
            field: row.field,
            label: row.label,
            category: row.category,
            value: allPresent ? values.reduce((s, v) => s + (v ?? 0), 0) : fallback,
            tags: emptyTags(),
            winningTag: null,
          };
        });
        const from = ttmQuarters[3];
        const to = ttmQuarters[0];
        return { source: `TTM · suma 4 trimestres (Q${from.quarter} ${from.year}–Q${to.quarter} ${to.year})`, tier: blocks[0].tier, rows };
      })()
    : null;

  let financialBlock: RawBlock | null = null;
  let balanceBlock: RawBlock | null = null;
  let financialTitle = '';
  let balanceTitle = '';
  let emptyYear: number | null = null;

  if (period === 'ttm') {
    if (ttmFull) {
      financialBlock = ttmFinancialBlock;
      balanceBlock = ttmQuarters[0].balance;
      financialTitle = `Resultado — ${ttmLabel}`;
      balanceTitle = `Balance — ${ttmLabel}`;
    } else if (latestAnnual) {
      financialBlock = latestAnnual.financial;
      balanceBlock = latestAnnual.balance;
      financialTitle = `Resultado — ${latestAnnual.year}`;
      balanceTitle = `Balance — ${latestAnnual.year}`;
    }
  } else {
    const yearEntries = data.years.filter((y) => y.year === period);
    const current = yearEntries.find((y) => (y.quarter ?? 0) === 0) ?? yearEntries[0] ?? null;
    if (current) {
      financialBlock = current.financial;
      balanceBlock = current.balance;
      const suffix = current.quarter != null && current.quarter !== 0 ? ` Q${current.quarter}` : '';
      financialTitle = `Resultado — ${current.year}${suffix}`;
      balanceTitle = `Balance — ${current.year}${suffix}`;
      emptyYear = current.year;
    }
  }

  return (
    <div className="raw-tab">
      {pills.length > 1 && (
        <div className="cp-year-bar">
          <Calendar size={16} />
          <span className="cp-year-label">Año fiscal:</span>
          <div className="cp-year-pills">
            {pills.map((p) => (
              <button
                key={p === 'ttm' ? 'ttm' : p}
                className={`cp-year-pill ${period === p ? 'cp-year-pill--active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p === 'ttm' ? ttmLabel : p}
              </button>
            ))}
          </div>
        </div>
      )}
      {financialBlock || balanceBlock ? (
        <>
          {financialBlock && <RawBlockTable block={financialBlock} title={financialTitle} />}
          {balanceBlock && <RawBlockTable block={balanceBlock} title={balanceTitle} />}
        </>
      ) : (
        <div className="raw-empty-banner">
          {emptyYear != null ? `Sin datos raw para ${emptyYear}.` : 'Selecciona un periodo para ver los datos raw.'}
        </div>
      )}
    </div>
  );
}
