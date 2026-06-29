/**
 * Caloriq — Navigation bar component.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Flame, LogOut, Sun, Moon, User, Menu, X } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate('/');
  };

  const closeMenu = () => setMobileOpen(false);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="navbar-brand" onClick={closeMenu}>
            <Flame size={24} className="brand-icon" />
            <span className="brand-text">Caloriq</span>
          </Link>

          {/* Desktop nav actions */}
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

            {/* Hamburger — visible on mobile only */}
            <button
              className="navbar-hamburger"
              onClick={() => setMobileOpen(v => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile overlay backdrop */}
      <div
        className={`navbar-overlay${mobileOpen ? ' open' : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      {/* Mobile drawer menu */}
      <div className={`navbar-mobile-menu${mobileOpen ? ' open' : ''}`} role="dialog" aria-label="Mobile navigation">
        {isAuthenticated ? (
          <>
            {user?.has_profile && (
              <Link to="/dashboard" className="nav-link" onClick={closeMenu}>Dashboard</Link>
            )}
            <Link to="/log" className="nav-link" onClick={closeMenu}>Log Meal</Link>
            <Link to="/meals" className="nav-link" onClick={closeMenu}>History</Link>
            {user?.has_profile && (
              <Link to="/analytics" className="nav-link" onClick={closeMenu}>Analytics</Link>
            )}
            <Link to="/profile" className="nav-link" onClick={closeMenu} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={16} /> Profile
            </Link>
            <div className="mobile-menu-bottom">
              <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ gap: '6px' }}>
                <LogOut size={15} /> Log Out
              </button>
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link" onClick={closeMenu}>Login</Link>
            <Link to="/register" className="btn btn-primary" onClick={closeMenu} style={{ marginTop: '8px' }}>
              Get Started
            </Link>
          </>
        )}
      </div>
    </>
  );
}

