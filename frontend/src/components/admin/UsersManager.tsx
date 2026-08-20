import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Trash2, Loader2, CheckCircle, AlertCircle, Crown } from 'lucide-react';
import { apiFetch } from '../../utils/api';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  subscriptionTier: string;
  subscriptionStart: string | null;
  trialUsed: boolean;
  createdAt: string;
  _count: { favorites: number; portfolios: number; alarms: number };
}

interface PaginatedResponse {
  data: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const TIER_COLORS: Record<string, { bg: string; color: string }> = {
  free: { bg: 'var(--surface-2)', color: 'var(--text-tertiary)' },
  pro: { bg: 'var(--blue-bg, rgba(59,130,246,0.15))', color: 'var(--blue, #3b82f6)' },
  premium: { bg: 'var(--amber-bg, rgba(245,158,11,0.15))', color: 'var(--amber, #f59e0b)' },
};

export function UsersManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [updatingTier, setUpdatingTier] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const fetchUsers = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: '20' });
      if (q.trim()) params.set('search', q.trim());
      const res = await apiFetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data: PaginatedResponse = await res.json();
        setUsers(data.data);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch { setMsg({ type: 'err', text: 'Error al cargar usuarios del servidor' }); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(page, search); }, [page, fetchUsers]);

  const handleSearch = () => {
    setPage(1);
    fetchUsers(1, search);
  };

  const handleChangeTier = async (userId: string, newTier: string) => {
    setUpdatingTier(userId);
    setMsg(null);
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/tier`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: newTier }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, subscriptionTier: newTier } : u));
        setMsg({ type: 'ok', text: 'Plan actualizado correctamente' });
      } else {
        const err = await res.json();
        setMsg({ type: 'err', text: err.error || 'Error al actualizar' });
      }
    } catch {
      setMsg({ type: 'err', text: 'Error de conexión' });
    }
    setUpdatingTier(null);
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`¿Eliminar al usuario "${name}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(userId);
    setMsg(null);
    try {
      const res = await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setTotal((prev) => prev - 1);
        setMsg({ type: 'ok', text: 'Usuario eliminado' });
      } else {
        const err = await res.json();
        setMsg({ type: 'err', text: err.error || 'Error al eliminar' });
      }
    } catch {
      setMsg({ type: 'err', text: 'Error de conexión' });
    }
    setDeleting(null);
  };

  return (
    <div className="admin-section">
      <div className="admin-form-section">
        <h3 className="admin-form-title">Gestión de Usuarios</h3>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {total} usuarios registrados
        </p>
      </div>

      {msg && (
        <div className={`admin-form-message ${msg.type === 'ok' ? 'admin-form-message--success' : 'admin-form-message--error'}`} style={{ marginBottom: '1rem' }}>
          {msg.type === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {msg.text}
        </div>
      )}

      <div className="admin-form-row" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-form-input-group" style={{ flex: 1, maxWidth: '400px' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} className="admin-form-input-icon" />
              <input
                className="admin-form-input"
                placeholder="Buscar por email o nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
            <button className="admin-form-btn" onClick={handleSearch}>
              Buscar
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">Cargando usuarios...</div>
      ) : users.length === 0 ? (
        <div className="admin-empty">No se encontraron usuarios</div>
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Plan</th>
                  <th>Favoritos</th>
                  <th>Portfolios</th>
                  <th>Alarmas</th>
                  <th>Creado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const tierStyle = TIER_COLORS[user.subscriptionTier] || TIER_COLORS.free;
                  return (
                    <tr key={user.id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{user.email}</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {user.role === 'admin' && <Crown size={12} style={{ color: 'var(--amber)' }} />}
                          <select
                            value={user.subscriptionTier}
                            onChange={(e) => handleChangeTier(user.id, e.target.value)}
                            disabled={updatingTier === user.id}
                            style={{
                              background: tierStyle.bg,
                              color: tierStyle.color,
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.3rem 0.5rem',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                          >
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="premium">Premium</option>
                          </select>
                          {updatingTier === user.id && <Loader2 size={12} className="animate-spin" />}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{user._count.favorites}</td>
                      <td style={{ fontSize: '0.8rem' }}>{user._count.portfolios}</td>
                      <td style={{ fontSize: '0.8rem' }}>{user._count.alarms}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        {new Date(user.createdAt).toLocaleDateString('es-ES')}
                      </td>
                      <td>
                        <button
                          className="admin-btn-delete"
                          onClick={() => handleDelete(user.id, user.name)}
                          disabled={deleting === user.id || user.role === 'admin'}
                          title={user.role === 'admin' ? 'No se puede eliminar un admin' : 'Eliminar usuario'}
                          style={{ padding: '0.3rem' }}
                        >
                          {deleting === user.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <div className="admin-pagination-nav">
                <button className="admin-pagination-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                  Página {page} de {totalPages}
                </span>
                <button className="admin-pagination-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
