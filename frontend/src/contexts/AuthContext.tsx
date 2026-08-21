import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { setTheme } from '../utils/theme';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  theme: 'dark' | 'light';
  subscriptionTier: 'free' | 'pro' | 'premium';
  trialUsed: boolean;
}

export interface Favorite {
  id: string;
  companyId: string;
  company: {
    id: string;
    ticker: string;
    name: string;
    sector: string | null;
    industry: string | null;
    website: string | null;
    logoUrl: string | null;
    stockMetrics: Array<{
      currentPrice: number;
      intrinsicValue: number | null;
      marginOfSafety: number | null;
      peRatio: number | null;
      pbRatio: number | null;
      marketCap: number | null;
    }>;
    financialData: Array<{
      revenue: number;
      netIncome: number;
      freeCashFlow: number | null;
    }>;
  };
}

export interface PlanLimits {
  companyViews: number;
  favorites: number;
  portfolios: number;
  screening: boolean;
  compare: boolean;
  exportData: boolean;
  priceMonthly: number;
  name: string;
}

export interface UsageInfo {
  views: number;
  limit: number;
  remaining: number;
  tier: string;
  canView?: boolean;
  favorites: number;
  portfolios: number;
}

export interface PlanInfo {
  tier: string;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  limits: PlanLimits;
  usage: { companyViews: number; favorites: number; portfolios: number };
  canViewCompany: boolean;
  canAddFavorite: boolean;
  canCreatePortfolio: boolean;
  visitedTickers: string[];
}

interface AuthContextType {
  user: User | null;
  favorites: Favorite[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  addFavorite: (companyId: string) => Promise<void>;
  removeFavorite: (companyId: string) => Promise<void>;
  isFavorite: (companyId: string) => boolean;
  updateProfile: (name: string, email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateTheme: (theme: 'dark' | 'light') => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateUserTier: (tier: string) => void;
  usage: UsageInfo | null;
  planLimits: PlanLimits | null;
  planInfo: PlanInfo | null;
  loadUsage: () => Promise<void>;
  recordCompanyView: (ticker: string) => Promise<UsageInfo>;
  canViewCompany: boolean;
  canAddFavorite: boolean;
  canCreatePortfolio: boolean;
  visitedTickers: string[];
  isCompanyVisited: (ticker: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [visitedTickers, setVisitedTickers] = useState<string[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (res.ok) return res.json();
        localStorage.removeItem('token');
        return null;
      })
      .then((data) => {
        setUser(data);
        if (data) {
          loadFavorites();
          loadUsage();
        }
        else setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('token');
        setLoading(false);
      });
  }, []);

  const loadFavorites = async () => {
    try {
      const res = await fetch('/api/favorites', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setFavorites(data);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    setUser(data.user);
    await loadFavorites();
    await loadUsage();
  };

  const register = async (email: string, name: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setFavorites([]);
    await loadUsage();
  };

  const loginWithGoogle = async (idToken: string) => {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al iniciar sesión con Google');
    }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    setUser(data.user);
    await loadFavorites();
    await loadUsage();
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('token');
    setUser(null);
    setFavorites([]);
    setUsage(null);
    setPlanLimits(null);
    setPlanInfo(null);
  };

  const addFavorite = async (companyId: string) => {
    const res = await fetch(`/api/favorites/${companyId}`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (res.ok) {
      const fav = await res.json();
      setFavorites((prev) => [fav, ...prev]);
      await loadUsage();
    }
  };

  const removeFavorite = async (companyId: string) => {
    const res = await fetch(`/api/favorites/${companyId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      setFavorites((prev) => prev.filter((f) => f.companyId !== companyId));
      await loadUsage();
    }
  };

  const isFavorite = (companyId: string) => favorites.some((f) => f.companyId === companyId);

  const updateProfile = async (name: string, email: string) => {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name, email }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al actualizar el perfil');
    }
    const updated = await res.json();
    setUser(updated);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const res = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al cambiar la contraseña');
    }
  };

  const updateTheme = async (theme: 'dark' | 'light') => {
    setTheme(theme);
    if (!user) return;
    try {
      const res = await fetch('/api/auth/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ theme }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
      }
    } catch {
      // tema aplicado localmente de todas formas
    }
  };

  const deleteAccount = async () => {
    const res = await fetch('/api/auth/account', { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al eliminar la cuenta');
    }
    localStorage.removeItem('token');
    setUser(null);
    setFavorites([]);
    setUsage(null);
    setPlanLimits(null);
    setPlanInfo(null);
    setVisitedTickers([]);
  };

  const updateUserTier = (tier: string) => {
    if (user) {
      setUser({ ...user, subscriptionTier: tier as User['subscriptionTier'] });
    }
  };

  const loadUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/subscription/plan-info', { headers: authHeaders() });
      if (res.ok) {
        const data: PlanInfo = await res.json();
        setPlanInfo(data);
        setPlanLimits(data.limits);
        setVisitedTickers(data.visitedTickers ?? []);
        setUsage({
          views: data.usage.companyViews,
          limit: data.limits.companyViews === -1 ? -1 : data.limits.companyViews,
          remaining: data.limits.companyViews === -1 ? -1 : Math.max(0, data.limits.companyViews - data.usage.companyViews),
          tier: data.tier,
          canView: data.canViewCompany,
          favorites: data.usage.favorites,
          portfolios: data.usage.portfolios,
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const recordCompanyView = useCallback(async (ticker: string): Promise<UsageInfo> => {
    const res = await fetch('/api/subscription/track-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ ticker }),
    });
    if (res.ok) {
      const data = await res.json();
      if (!data.visited) {
        setVisitedTickers((prev) => prev.includes(ticker) ? prev : [...prev, ticker]);
      }
      const newUsage: UsageInfo = {
        views: data.views,
        limit: data.limit,
        remaining: data.remaining,
        tier: data.tier,
        canView: data.canView,
        favorites: usage?.favorites ?? 0,
        portfolios: usage?.portfolios ?? 0,
      };
      setUsage(newUsage);
      return newUsage;
    }
    const fallback: UsageInfo = { views: 0, limit: 3, remaining: 3, tier: 'free', favorites: 0, portfolios: 0 };
    setUsage(fallback);
    return fallback;
  }, [usage]);

  const canViewCompany = user
    ? user.subscriptionTier === 'premium' || (usage !== null && usage.remaining !== 0)
    : true;

  const canAddFavorite = planInfo
    ? planInfo.canAddFavorite
    : true;

  const canCreatePortfolio = planInfo
    ? planInfo.canCreatePortfolio
    : true;

  const isCompanyVisited = useCallback((ticker: string) => {
    return visitedTickers.includes(ticker);
  }, [visitedTickers]);

  return (
    <AuthContext.Provider value={{ user, favorites, loading, login, register, loginWithGoogle, logout, addFavorite, removeFavorite, isFavorite, updateProfile, changePassword, updateTheme, deleteAccount, updateUserTier, usage, planLimits, planInfo, loadUsage, recordCompanyView, canViewCompany, canAddFavorite, canCreatePortfolio, visitedTickers, isCompanyVisited }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
