import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, mealsAPI } from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [recentMeals, setRecentMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // If user has no profile, direct to onboarding
    if (user && !user.has_profile) {
      navigate('/onboarding');
      return;
    }

    async function loadData() {
      try {
        const [sumRes, mealsRes] = await Promise.all([
          dashboardAPI.summary(),
          mealsAPI.list(1, 5)
        ]);
        setSummary(sumRes.data);
        setRecentMeals(mealsRes.data.meals || []);
      } catch (err) {
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="page page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page page-content">
        <div className="error-text" style={{ textAlign: 'center', fontSize: '18px', marginTop: '40px' }}>{error}</div>
      </div>
    );
  }

  const { targets, totals, remaining, streak } = summary;

  // Calculate percentages for bars/dial
  const calPercent = Math.min(100, Math.round((totals.calories / targets.calories) * 100)) || 0;
  const proPercent = Math.min(100, Math.round((totals.protein / targets.protein) * 100)) || 0;
  const carbPercent = Math.min(100, Math.round((totals.carbs / targets.carbs) * 100)) || 0;
  const fatPercent = Math.min(100, Math.round((totals.fat / targets.fat) * 100)) || 0;

  // SVG Dial Config
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (calPercent / 100) * circumference;

  return (
    <div className="page page-content animate-fade-in">
      <div className="dashboard-grid">
        
        {/* Hero Card */}
        <div className="dashboard-hero-card">
          <div className="dashboard-hero-text">
            <h1>Hello, {user?.name || 'Friend'}</h1>
            <p>Welcome back. Here is your nutrition dashboard for today.</p>
          </div>
          <div className="streak-display">
            <span className="streak-fire-icon">🔥</span>
            <span>{streak} Day Streak</span>
          </div>
        </div>

        {/* Main Section */}
        <div className="dashboard-main">
          
          {/* Calorie & Macro Progress */}
          <div className="card progress-card">
            <h3 style={{ marginBottom: '24px' }}>Daily Energy Summary</h3>
            
            <div className="calorie-summary">
              
              {/* SVG Radial Progress Dial */}
              <div className="calorie-dial">
                <svg>
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="var(--color-bone)"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="var(--color-calories)"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="calorie-dial-value">{Math.round(totals.calories)}</div>
                <div className="calorie-dial-label">kcal</div>
              </div>

              {/* Stats Table */}
              <div className="calorie-stats-list">
                <div className="calorie-stat-item">
                  <span className="calorie-stat-label">Daily Target</span>
                  <span className="calorie-stat-val">{targets.calories} kcal</span>
                </div>
                <div className="calorie-stat-item">
                  <span className="calorie-stat-label">Logged Today</span>
                  <span className="calorie-stat-val">{Math.round(totals.calories)} kcal</span>
                </div>
                <div className="calorie-stat-item" style={{ borderBottom: 'none' }}>
                  <span className="calorie-stat-label">Remaining</span>
                  <span className="calorie-stat-val remaining">{Math.round(remaining.calories)} kcal</span>
                </div>
              </div>

            </div>

            {/* Macro Progress Bars */}
            <h3 style={{ borderTop: '1px solid var(--color-silver)', paddingTop: '24px', marginBottom: '16px' }}>Macro Breakdown</h3>
            <div className="macros-progress-grid">
              
              {/* Protein */}
              <div className="macro-progress-bar">
                <div className="macro-bar-label">
                  <span style={{ color: 'var(--color-protein)' }}>Protein</span>
                  <span>{Math.round(totals.protein)} / {targets.protein}g</span>
                </div>
                <div className="macro-bar-track">
                  <div
                    className="macro-bar-fill"
                    style={{ width: `${proPercent}%`, background: 'var(--color-protein)' }}
                  />
                </div>
              </div>

              {/* Carbs */}
              <div className="macro-progress-bar">
                <div className="macro-bar-label">
                  <span style={{ color: 'var(--color-carbs)' }}>Carbs</span>
                  <span>{Math.round(totals.carbs)} / {targets.carbs}g</span>
                </div>
                <div className="macro-bar-track">
                  <div
                    className="macro-bar-fill"
                    style={{ width: `${carbPercent}%`, background: 'var(--color-carbs)' }}
                  />
                </div>
              </div>

              {/* Fat */}
              <div className="macro-progress-bar">
                <div className="macro-bar-label">
                  <span style={{ color: 'var(--color-fat)' }}>Fat</span>
                  <span>{Math.round(totals.fat)} / {targets.fat}g</span>
                </div>
                <div className="macro-bar-track">
                  <div
                    className="macro-bar-fill"
                    style={{ width: `${fatPercent}%`, background: 'var(--color-fat)' }}
                  />
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Sidebar */}
        <div className="dashboard-sidebar">
          
          {/* Shortcuts */}
          <div className="card actions-card">
            <h3>Quick Actions</h3>
            <Link to="/log" className="btn btn-primary">
              📝 Log a Meal
            </Link>
            <Link to="/meals" className="btn btn-ghost">
              📋 View History Feed
            </Link>
            <Link to="/analytics" className="btn btn-accent">
              📈 View Analytics
            </Link>
          </div>

          {/* Recent Meals list */}
          <div className="card summary-card">
            <h3 className="summary-title">Recent Activity</h3>
            {recentMeals.length === 0 ? (
              <p style={{ color: 'var(--color-slate)', fontSize: '14px' }}>No meals logged yet today.</p>
            ) : (
              <div className="quick-meal-list">
                {recentMeals.slice(0, 4).map((meal) => (
                  <div key={meal.id} className="quick-meal-item">
                    <div className="quick-meal-info">
                      <span className="quick-meal-name">{meal.food_name}</span>
                      <span className="quick-meal-type">{meal.meal_type}</span>
                    </div>
                    <span className="quick-meal-cals">{Math.round(meal.calories)} kcal</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
