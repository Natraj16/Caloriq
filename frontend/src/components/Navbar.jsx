/**
 * Caloriq — Navigation bar component.
 */

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Flame, LogOut, Sun, Moon, User } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <Flame size={24} className="brand-icon" />
          <span className="brand-text">Caloriq</span>
        </Link>

        <div className="navbar-actions">
          <button 
            onClick={toggleTheme} 
            className="btn btn-ghost btn-sm btn-icon theme-toggle" 
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {isAuthenticated ? (
            <>
              {user?.has_profile && (
                <Link to="/dashboard" className="nav-link">Dashboard</Link>
              )}
              <Link to="/log" className="nav-link">Log Meal</Link>
              <Link to="/meals" className="nav-link">History</Link>
              {user?.has_profile && (
                <Link to="/analytics" className="nav-link">Analytics</Link>
              )}
              <div className="navbar-user">
                <Link to="/profile" className="nav-link profile-link" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={16} />
                  <span>Profile</span>
                </Link>
                <button onClick={handleLogout} className="btn btn-ghost btn-sm btn-icon" title="Logout">
                  <LogOut size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
