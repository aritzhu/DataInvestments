export function apiFetch(url: string, opts?: RequestInit) {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...opts,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
}

async function handleRes<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

const jsonHeaders = { 'Content-Type': 'application/json' };

export interface CompanyStatements {
  company: {
    id: string;
    ticker: string;
    name: string;
    sector: string | null;
    industry: string | null;
  };
  financials: Array<Record<string, unknown>>;
  balanceSheets: Array<Record<string, unknown>>;
}

export const statementsApi = {
  getCompany: (ticker: string) =>
    apiFetch(`/api/admin/statements/companies/${encodeURIComponent(ticker)}`).then((r) =>
      handleRes<CompanyStatements>(r),
    ),
  createFinancial: (payload: Record<string, unknown>) =>
    apiFetch('/api/admin/statements/financial', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }).then((r) => handleRes<{ row: Record<string, unknown> }>(r)),
  updateFinancial: (id: string, payload: Record<string, unknown>) =>
    apiFetch(`/api/admin/statements/financial/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }).then((r) => handleRes<{ row: Record<string, unknown> }>(r)),
  deleteFinancial: (id: string) =>
    apiFetch(`/api/admin/statements/financial/${encodeURIComponent(id)}`, { method: 'DELETE' }).then((r) =>
      handleRes<{ success: boolean }>(r),
    ),
  createBalance: (payload: Record<string, unknown>) =>
    apiFetch('/api/admin/statements/balance', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }).then((r) => handleRes<{ row: Record<string, unknown> }>(r)),
  updateBalance: (id: string, payload: Record<string, unknown>) =>
    apiFetch(`/api/admin/statements/balance/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }).then((r) => handleRes<{ row: Record<string, unknown> }>(r)),
  deleteBalance: (id: string) =>
    apiFetch(`/api/admin/statements/balance/${encodeURIComponent(id)}`, { method: 'DELETE' }).then((r) =>
      handleRes<{ success: boolean }>(r),
    ),
  recompute: (ticker: string) =>
    apiFetch(`/api/admin/statements/recompute/${encodeURIComponent(ticker)}`, { method: 'POST' }).then((r) =>
      handleRes<{ success: boolean }>(r),
    ),
};
