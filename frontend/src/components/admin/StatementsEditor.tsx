import { useState } from 'react';
import { RefreshCw, Plus, Pencil, Trash2, Save, X, Search, Loader2 } from 'lucide-react';
import { statementsApi, type CompanyStatements } from '../../utils/api';

type RowType = 'financial' | 'balance';

interface FieldDef {
  key: string;
  label: string;
}

const FINANCIAL_FIELDS: FieldDef[] = [
  { key: 'revenue', label: 'Ingresos' },
  { key: 'costOfRevenue', label: 'Coste de Ventas' },
  { key: 'grossProfit', label: 'Beneficio Bruto' },
  { key: 'operatingExpenses', label: 'Gastos Operativos' },
  { key: 'sgaExpense', label: 'Gastos SG&A' },
  { key: 'rdExpense', label: 'I+D' },
  { key: 'interestExpense', label: 'Gastos Financieros' },
  { key: 'taxExpense', label: 'Impuestos' },
  { key: 'ebitda', label: 'EBITDA' },
  { key: 'ebit', label: 'EBIT' },
  { key: 'capex', label: 'CapEx' },
  { key: 'depreciation', label: 'Depreciación' },
  { key: 'operatingCashFlow', label: 'Flujo Operativo' },
  { key: 'investingCashFlow', label: 'Flujo Inversión' },
  { key: 'financingCashFlow', label: 'Flujo Financiación' },
  { key: 'freeCashFlow', label: 'Flujo Libre (FCF)' },
  { key: 'dividendsPaid', label: 'Dividendos Pagados' },
  { key: 'shareRepurchases', label: 'Recompra de Acciones' },
  { key: 'totalAssets', label: 'Activo Total' },
  { key: 'totalLiabilities', label: 'Pasivo Total' },
  { key: 'totalEquity', label: 'Fondos Propios' },
  { key: 'netIncome', label: 'Beneficio Neto' },
];

const BALANCE_FIELDS: FieldDef[] = [
  { key: 'cashAndCashEquivalents', label: 'Efectivo' },
  { key: 'shortTermInvestments', label: 'Inv. Corto Plazo' },
  { key: 'accountsReceivable', label: 'Cuentas a Cobrar' },
  { key: 'inventory', label: 'Inventario' },
  { key: 'totalCurrentAssets', label: 'Activo Corriente' },
  { key: 'propertyPlantEquipment', label: 'PP&E' },
  { key: 'goodwill', label: 'Fondo de Comercio' },
  { key: 'intangibleAssets', label: 'Intangibles' },
  { key: 'totalNonCurrentAssets', label: 'Activo No Corriente' },
  { key: 'totalAssets', label: 'Activo Total' },
  { key: 'accountsPayable', label: 'Cuentas a Pagar' },
  { key: 'shortTermDebt', label: 'Deuda Corto Plazo' },
  { key: 'totalCurrentLiabilities', label: 'Pasivo Corriente' },
  { key: 'longTermDebt', label: 'Deuda Largo Plazo' },
  { key: 'totalNonCurrentLiabilities', label: 'Pasivo No Corriente' },
  { key: 'totalLiabilities', label: 'Pasivo Total' },
  { key: 'totalStockholdersEquity', label: 'Fondos Propios' },
  { key: 'retainedEarnings', label: 'Beneficios Retenidos' },
  { key: 'treasuryStock', label: 'Acciones Propias' },
];

interface EditorState {
  type: RowType;
  rowId: string | null;
  year: string;
  quarter: string;
  values: Record<string, string>;
}

const EMPTY_EDITOR: EditorState = {
  type: 'financial',
  rowId: null,
  year: '',
  quarter: '0',
  values: {},
};

function numToInput(v: number | null | undefined): string {
  return v === null || v === undefined ? '' : String(v);
}

export function StatementsEditor() {
  const [ticker, setTicker] = useState('');
  const [loadedTicker, setLoadedTicker] = useState('');
  const [data, setData] = useState<CompanyStatements | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(''), 4000);
  };

  const load = async () => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    setLoading(true);
    setError('');
    setEditor(null);
    try {
      const res = await statementsApi.getCompany(t);
      setData(res);
      setLoadedTicker(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando la empresa');
    } finally {
      setLoading(false);
    }
  };

  const fieldsFor = (type: RowType) => (type === 'financial' ? FINANCIAL_FIELDS : BALANCE_FIELDS);
  const rowsFor = (type: RowType) => (type === 'financial' ? data?.financials ?? [] : data?.balanceSheets ?? []);

  const openCreate = (type: RowType) => {
    setEditor({ ...EMPTY_EDITOR, type });
  };

  const openEdit = (type: RowType, row: Record<string, unknown>) => {
    const values: Record<string, string> = {};
    for (const f of fieldsFor(type)) values[f.key] = numToInput(row[f.key] as number | null | undefined);
    setEditor({
      type,
      rowId: row.id as string,
      year: String(row.year ?? ''),
      quarter: String(row.quarter ?? 0),
      values,
    });
  };

  const saveRow = async () => {
    if (!editor || !data) return;
    const year = Number(editor.year);
    if (!Number.isInteger(year)) {
      setError('El año debe ser un número entero');
      return;
    }
    const payload: Record<string, unknown> = {
      companyId: data.company.id,
      year,
      quarter: Number(editor.quarter),
    };
    for (const f of fieldsFor(editor.type)) {
      const v = editor.values[f.key];
      payload[f.key] = v === '' ? null : Number(v);
    }
    setSaving(true);
    setError('');
    try {
      if (editor.rowId) {
        if (editor.type === 'financial') await statementsApi.updateFinancial(editor.rowId, payload);
        else await statementsApi.updateBalance(editor.rowId, payload);
        showNotice('Fila actualizada (marcada como manual)');
      } else {
        if (editor.type === 'financial') await statementsApi.createFinancial(payload);
        else await statementsApi.createBalance(payload);
        showNotice('Fila creada');
      }
      setEditor(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (type: RowType, row: Record<string, unknown>) => {
    if (!window.confirm('¿Eliminar esta fila?')) return;
    setError('');
    try {
      if (type === 'financial') await statementsApi.deleteFinancial(row.id as string);
      else await statementsApi.deleteBalance(row.id as string);
      showNotice('Fila eliminada');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error eliminando');
    }
  };

  const recompute = async () => {
    setRecomputing(true);
    setError('');
    try {
      await statementsApi.recompute(loadedTicker);
      showNotice('Valoración recalculada');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error recalculando');
    } finally {
      setRecomputing(false);
    }
  };

  const fmt = (v: unknown): string => {
    const n = v as number | null | undefined;
    if (n === null || n === undefined) return '—';
    return Number(n).toLocaleString('es-ES');
  };

  const renderRows = (type: RowType) => {
    const rows = rowsFor(type);
    const isFin = type === 'financial';
    return (
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-secondary)' }}>
            {isFin ? 'Cuenta de Resultados (FinancialData)' : 'Balance (BalanceSheet)'}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginLeft: '0.5rem' }}>
              ({rows.length} filas)
            </span>
          </h3>
          <button onClick={() => openCreate(type)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.8rem', background: 'var(--teal)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
            <Plus size={14} /> Nueva fila
          </button>
        </div>
        {rows.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Sin datos todavía.</p>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid var(--white-mid)', borderRadius: '0.75rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '640px' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: 'var(--white-soft)' }}>
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 700 }}>Año</th>
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 700 }}>Trim</th>
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 700 }}>Fuente</th>
                  {isFin ? (
                    <>
                      <th style={{ padding: '0.5rem 0.6rem', fontWeight: 700 }}>Ingresos</th>
                      <th style={{ padding: '0.5rem 0.6rem', fontWeight: 700 }}>EBITDA</th>
                      <th style={{ padding: '0.5rem 0.6rem', fontWeight: 700 }}>FCF</th>
                      <th style={{ padding: '0.5rem 0.6rem', fontWeight: 700 }}>B. Neto</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '0.5rem 0.6rem', fontWeight: 700 }}>Efectivo</th>
                      <th style={{ padding: '0.5rem 0.6rem', fontWeight: 700 }}>Deuda LP</th>
                      <th style={{ padding: '0.5rem 0.6rem', fontWeight: 700 }}>Deuda CP</th>
                      <th style={{ padding: '0.5rem 0.6rem', fontWeight: 700 }}>Fondos Propios</th>
                    </>
                  )}
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 700 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const source = row.source as string;
                  const isManual = source === 'manual';
                  return (
                    <tr key={row.id as string} style={{ borderTop: '1px solid var(--white-mid)' }}>
                      <td style={{ padding: '0.5rem 0.6rem', fontWeight: 600 }}>{String(row.year)}</td>
                      <td style={{ padding: '0.5rem 0.6rem' }}>{Number(row.quarter) === 0 ? 'Anual' : `Q${row.quarter}`}</td>
                      <td style={{ padding: '0.5rem 0.6rem' }}>
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 700, background: isManual ? 'rgba(20, 184, 166, 0.15)' : 'var(--white-mid)', color: isManual ? 'var(--teal)' : 'var(--text-tertiary)' }}>
                          {isManual ? 'MANUAL' : 'AUTO'}
                        </span>
                      </td>
                      {isFin ? (
                        <>
                          <td style={{ padding: '0.5rem 0.6rem' }}>{fmt(row.revenue)}</td>
                          <td style={{ padding: '0.5rem 0.6rem' }}>{fmt(row.ebitda)}</td>
                          <td style={{ padding: '0.5rem 0.6rem' }}>{fmt(row.freeCashFlow)}</td>
                          <td style={{ padding: '0.5rem 0.6rem' }}>{fmt(row.netIncome)}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '0.5rem 0.6rem' }}>{fmt(row.cashAndCashEquivalents)}</td>
                          <td style={{ padding: '0.5rem 0.6rem' }}>{fmt(row.longTermDebt)}</td>
                          <td style={{ padding: '0.5rem 0.6rem' }}>{fmt(row.shortTermDebt)}</td>
                          <td style={{ padding: '0.5rem 0.6rem' }}>{fmt(row.totalStockholdersEquity)}</td>
                        </>
                      )}
                      <td style={{ padding: '0.5rem 0.6rem', whiteSpace: 'nowrap' }}>
                        <button onClick={() => openEdit(type, row)} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.2rem', marginRight: '0.4rem' }}>
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => deleteRow(type, row)} title="Eliminar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: '0.2rem' }}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderEditor = () => {
    if (!editor || !data) return null;
    const isFin = editor.type === 'financial';
    return (
      <div style={{ border: '1px solid var(--pink-pale)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', background: 'var(--white-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '0.95rem', margin: 0, color: 'var(--pink-deep)' }}>
            {editor.rowId ? 'Editar fila' : 'Nueva fila'} — {isFin ? 'Cuenta de Resultados' : 'Balance'}
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginLeft: '0.5rem' }}>Se guardará como fuente MANUAL</span>
          </h3>
          <button onClick={() => setEditor(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
            Año
            <input
              type="number"
              value={editor.year}
              onChange={(e) => setEditor((s) => (s ? { ...s, year: e.target.value } : s))}
              style={{ display: 'block', marginTop: '0.25rem', padding: '0.35rem 0.5rem', border: '1px solid var(--white-mid)', borderRadius: '0.4rem', width: '90px', fontSize: '0.85rem' }}
            />
          </label>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
            Trimestre
            <select
              value={editor.quarter}
              onChange={(e) => setEditor((s) => (s ? { ...s, quarter: e.target.value } : s))}
              style={{ display: 'block', marginTop: '0.25rem', padding: '0.35rem 0.5rem', border: '1px solid var(--white-mid)', borderRadius: '0.4rem', fontSize: '0.85rem' }}
            >
              <option value="0">Anual</option>
              <option value="1">Q1</option>
              <option value="2">Q2</option>
              <option value="3">Q3</option>
              <option value="4">Q4</option>
            </select>
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem', marginBottom: '1rem' }}>
          {fieldsFor(editor.type).map((f) => (
            <label key={f.key} style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
              {f.label}
              <input
                type="number"
                step="any"
                placeholder="0"
                value={editor.values[f.key] ?? ''}
                onChange={(e) => setEditor((s) => (s ? { ...s, values: { ...s.values, [f.key]: e.target.value } } : s))}
                style={{ display: 'block', marginTop: '0.2rem', padding: '0.35rem 0.5rem', border: '1px solid var(--white-mid)', borderRadius: '0.4rem', width: '100%', boxSizing: 'border-box', fontSize: '0.85rem' }}
              />
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button onClick={saveRow} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 1rem', background: 'var(--teal)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? <Loader2 size={14} className="spinning" /> : <Save size={14} />} Guardar
          </button>
          <button onClick={() => setEditor(null)} style={{ padding: '0.45rem 1rem', background: 'var(--white-mid)', color: 'var(--text-secondary)', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
          placeholder="Ticker (ej. VOW3.DE, GRF.MC, MRK.DE)"
          style={{ flex: 1, maxWidth: '320px', padding: '0.45rem 0.7rem', border: '1px solid var(--white-mid)', borderRadius: '0.5rem', fontSize: '0.85rem' }}
        />
        <button onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 1rem', background: 'var(--pink)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? <Loader2 size={14} className="spinning" /> : <Search size={14} />} Cargar
        </button>
      </div>

      {error && <p style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</p>}
      {notice && <p style={{ color: 'var(--teal)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{notice}</p>}

      {data && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <strong style={{ fontSize: '1.05rem' }}>{data.company.name}</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginLeft: '0.5rem' }}>{data.company.ticker} · {data.company.sector ?? 'sin sector'}</span>
            </div>
            <button onClick={recompute} disabled={recomputing} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 1rem', background: 'var(--pink-deep)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', opacity: recomputing ? 0.6 : 1 }}>
              {recomputing ? <Loader2 size={14} className="spinning" /> : <RefreshCw size={14} />} Recalcular valoración
            </button>
          </div>

          {renderEditor()}
          {renderRows('financial')}
          {renderRows('balance')}
        </>
      )}
    </div>
  );
}
