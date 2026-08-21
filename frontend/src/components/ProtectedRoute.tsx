import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) {
    const target = location.pathname + location.search;
    return <Navigate to={`/login?redirect=${encodeURIComponent(target)}`} replace />;
  }

  return <>{children}</>;
}
