const API_BASE = import.meta.env.VITE_API_URL || '/api';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export const analyticsAPI = {
  async getOverview(): Promise<{
    today: { events: number; pageViews: number; companyViews: number };
    week: { events: number; pageViews: number; companyViews: number };
    month: { events: number; pageViews: number; companyViews: number };
  }> {
    const res = await fetch(`${API_BASE}/analytics/overview`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  async getTopEvents(days = 7): Promise<{ event: string; count: number }[]> {
    const res = await fetch(`${API_BASE}/analytics/top-events?days=${days}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch top events');
    return res.json();
  },

  async getDaily(days = 30): Promise<{ date: string; count: number }[]> {
    const res = await fetch(`${API_BASE}/analytics/daily?days=${days}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch daily counts');
    return res.json();
  },
};
