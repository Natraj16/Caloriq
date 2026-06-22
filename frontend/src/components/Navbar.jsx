/**
 * Caloriq — Navigation bar component.
 */

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Flame, LogOut, UtensilsCrossed, Sun, Moon } from 'lucide-react';
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
              <Link to="/log" className="btn btn-accent btn-sm">
                <UtensilsCrossed size={16} />
                Log Meal
              </Link>
              <Link to="/meals" className="nav-link">History</Link>
              <div className="navbar-user">
                <span className="user-email">{user?.email}</span>
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
