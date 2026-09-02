import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import { useInitAnalytics, usePageTracking } from './hooks/useAnalytics';
import { Navbar } from './components/Navbar';
import { AdminRoute } from './components/AdminRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CookieConsentBanner } from './components/CookieConsentBanner';

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
const PlanSelectionPage = lazy(() => import('./pages/PlanSelectionPage').then(m => ({ default: m.PlanSelectionPage })));
const CheckoutResultPage = lazy(() => import('./pages/CheckoutResultPage').then(m => ({ default: m.CheckoutResultPage })));

function App() {
  useInitAnalytics();

  return (
    <HelmetProvider>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </GoogleOAuthProvider>
    </HelmetProvider>
  );
}

function AppRoutes() {
  usePageTracking();

  return (
    <div className="min-h-screen flex flex-col app-shell">
      <a href="#main-content" className="skip-to-content">
        Saltar al contenido principal
      </a>
      <Suspense fallback={
        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <div className="ui-skeleton" style={{ width: '200px', height: '24px', borderRadius: '8px' }} />
        </div>
      }>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
        <Route
          path="*"
          element={
            <>
              <Navbar />
              <main id="main-content" className="flex-1 flex flex-col">
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
                  <Route path="/plans" element={<PlanSelectionPage />} />
                  <Route path="/subscription/result" element={<CheckoutResultPage />} />
                </Routes>
              </main>
            </>
          }
        />
      </Routes>
      </Suspense>
      <CookieConsentBanner />
    </div>
  );
}

export default App;
