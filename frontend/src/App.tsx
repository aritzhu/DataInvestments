import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Landing } from './components/Landing';
import { CompanyPage } from './components/CompanyPage';
import { AdminPanel } from './components/admin/AdminPanel';
import { Navbar } from './components/Navbar';
import { AdminRoute } from './components/AdminRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { FavoritesPage } from './pages/FavoritesPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-50">
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
                    </Routes>
                  </main>
                </>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
