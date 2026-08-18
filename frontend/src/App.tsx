import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useInitAnalytics, usePageTracking } from './hooks/useAnalytics';
import { Navbar } from './components/Navbar';
import { AdminRoute } from './components/AdminRoute';
import { ProtectedRoute } from './components/ProtectedRoute';

const Landing = lazy(() => import('./components/Landing').then(m => ({ default: m.Landing })));
const CompanyPage = lazy(() => import('./components/CompanyPage').then(m => ({ default: m.CompanyPage })));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel').then(m => ({ default: m.AdminPanel })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage').then(m => ({ default: m.FavoritesPage })));
const AccountSettingsPage = lazy(() => import('./pages/AccountSettingsPage').then(m => ({ default: m.AccountSettingsPage })));
const PortfoliosPage = lazy(() => import('./pages/PortfoliosPage').then(m => ({ default: m.PortfoliosPage })));
const PortfolioDetailPage = lazy(() => import('./pages/PortfolioDetailPage').then(m => ({ default: m.PortfolioDetailPage })));
const LegalPage = lazy(() => import('./pages/LegalPage').then(m => ({ default: m.LegalPage })));
const FormacionPage = lazy(() => import('./pages/FormacionPage').then(m => ({ default: m.FormacionPage })));
const CursoDetallePage = lazy(() => import('./pages/CursoDetallePage').then(m => ({ default: m.CursoDetallePage })));

function App() {
  useInitAnalytics();

  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

function AppRoutes() {
  usePageTracking();

  return (
    <div className="min-h-screen flex flex-col app-shell">
      <Suspense>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
        <Route
          path="*"
          element={
            <>
              <Navbar />
              <main className="flex-1 flex flex-col">
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/empresa/:ticker" element={<CompanyPage />} />
                  <Route path="/cashflow/:ticker" element={<CompanyPage />} />
                  <Route path="/valuation/:ticker" element={<CompanyPage />} />
                  <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><AccountSettingsPage /></ProtectedRoute>} />
                  <Route path="/portfolios" element={<ProtectedRoute><PortfoliosPage /></ProtectedRoute>} />
                  <Route path="/portfolios/:id" element={<ProtectedRoute><PortfolioDetailPage /></ProtectedRoute>} />
                  <Route path="/legal" element={<Navigate to="/legal/terminos" replace />} />
                  <Route path="/legal/:slug" element={<LegalPage />} />
                  <Route path="/formacion" element={<FormacionPage />} />
                  <Route path="/formacion/:id" element={<CursoDetallePage />} />
                </Routes>
              </main>
            </>
          }
        />
      </Routes>
      </Suspense>
    </div>
  );
}

export default App;
