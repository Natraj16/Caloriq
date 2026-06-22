/**
 * Caloriq — Main application with routing.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import AuthPage from './pages/Auth';
import MealLog from './pages/MealLog';
import MealHistory from './pages/MealHistory';

/**
 * Wraps routes that require authentication.
 * Redirects to /login if user is not authenticated.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

/**
 * Redirects authenticated users away from auth pages.
 */
function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;
  return isAuthenticated ? <Navigate to="/log" replace /> : children;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route path="/login" element={
          <GuestRoute>
            <AuthPage mode="login" />
          </GuestRoute>
        } />

        <Route path="/register" element={
          <GuestRoute>
            <AuthPage mode="register" />
          </GuestRoute>
        } />

        <Route path="/log" element={
          <ProtectedRoute>
            <MealLog />
          </ProtectedRoute>
        } />

        <Route path="/meals" element={
          <ProtectedRoute>
            <MealHistory />
          </ProtectedRoute>
        } />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
