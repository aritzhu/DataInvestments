import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
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

interface AuthContextType {
  user: User | null;
  favorites: Favorite[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  addFavorite: (companyId: string) => Promise<void>;
  removeFavorite: (companyId: string) => Promise<void>;
  isFavorite: (companyId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        setUser(data);
        if (data) loadFavorites();
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const loadFavorites = async () => {
    try {
      const res = await fetch('/api/favorites', { credentials: 'include' });
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
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    setUser(data);
    await loadFavorites();
  };

  const register = async (email: string, name: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, name, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    const data = await res.json();
    setUser(data);
    setFavorites([]);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    setFavorites([]);
  };

  const addFavorite = async (companyId: string) => {
    const res = await fetch(`/api/favorites/${companyId}`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const fav = await res.json();
      setFavorites((prev) => [fav, ...prev]);
    }
  };

  const removeFavorite = async (companyId: string) => {
    const res = await fetch(`/api/favorites/${companyId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      setFavorites((prev) => prev.filter((f) => f.companyId !== companyId));
    }
  };

  const isFavorite = (companyId: string) => favorites.some((f) => f.companyId === companyId);

  return (
    <AuthContext.Provider value={{ user, favorites, loading, login, register, logout, addFavorite, removeFavorite, isFavorite }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
