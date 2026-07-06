/**
 * Caloriq — Meal History page.
 * Shows paginated list of logged meals with macro chips and tier badges.
 */

import { useState, useEffect } from 'react';
import { mealsAPI } from '../services/api';
import { Trash2, ChevronLeft, ChevronRight, Zap, Database, BarChart3, Bot, ScanBarcode, UtensilsCrossed, Flame, Leaf, Droplet, Drumstick, Utensils } from 'lucide-react';
import './MealHistory.css';
import './MealLog.css';

const TIER_META = {
  cache: { icon: Zap, label: 'Cache', color: 'tier-cache' },
  db: { icon: Database, label: 'DB', color: 'tier-db' },
  usda: { icon: BarChart3, label: 'USDA', color: 'tier-usda' },
  gemini: { icon: Bot, label: 'Gemini', color: 'tier-gemini' },
  barcode_api: { icon: ScanBarcode, label: 'Barcode', color: 'tier-barcode_api' },
};

const MEAL_EMOJI = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍿',
};

export default function MealHistory() {
  const [meals, setMeals] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 15;

  const fetchMeals = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await mealsAPI.list(p, pageSize);
      setMeals(data.meals);
      setTotal(data.total);
      setPage(p);
    } catch (err) {
      console.error('Failed to fetch meals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeals();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this meal log?')) return;
    try {
      await mealsAPI.delete(id);
      fetchMeals(page);
    } catch (err) {
      console.error('Failed to delete meal:', err);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="meal-history-page">
      <div className="page-content">
        <div className="history-header">
          <div>
            <h1>Meal History</h1>
            <p className="text-secondary">{total} meals logged</p>
          </div>
        </div>

        {loading ? (
          <div className="history-loading">
            <div className="spinner spinner-lg" />
          </div>
        ) : meals.length === 0 ? (
          <div className="history-empty">
            <UtensilsCrossed size={48} />
            <h3>No meals logged yet</h3>
            <p>Start logging meals to see your history here.</p>
          </div>
        ) : (
          <>
            <div className="meals-list">
              {Object.entries(
                meals.reduce((groups, meal) => {
                  const date = formatDate(meal.logged_at);
                  if (!groups[date]) groups[date] = [];
                  groups[date].push(meal);
                  return groups;
                }, {})
              ).map(([date, dateMeals]) => (
                <div key={date} className="meal-date-group">
                  <h3 className="meal-date-header" style={{ margin: '1rem 0 0.5rem', fontSize: '1.1rem', color: 'var(--color-slate)' }}>
                    {date === formatDate(new Date()) ? 'Today' : date}
                  </h3>
                  {dateMeals.map((meal) => {
                    const tier = TIER_META[meal.pipeline_tier] || TIER_META.gemini;
                    const TierIcon = tier.icon;
                    return (
                      <div key={meal.id} className="nutri-card animate-fade-in" style={{ position: 'relative' }}>
                        <div className="nutri-header">
                          <div className="nutri-thumbnail">
                            <span style={{ fontSize: '32px' }}>{MEAL_EMOJI[meal.meal_type] || '🍽️'}</span>
                          </div>
                          <div className="nutri-info">
                            <div className="nutri-title">{meal.food_name}</div>
                            <div className="nutri-meta">
                              <span>
                                {formatTime(meal.logged_at)} {meal.serving_size && ` · ${meal.serving_size}`}
                              </span>
                              <div className={`tier-badge ${tier.color}`} style={{ marginLeft: '8px' }}>
                                <TierIcon size={10} />
                                {tier.label}
                              </div>
                            </div>
                          </div>
                          
                          <button
                            className="btn btn-ghost btn-icon btn-sm meal-delete-abs"
                            onClick={() => handleDelete(meal.id)}
                            title="Delete meal"
                            style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Trash2 size={16} style={{ color: 'var(--color-error)' }} />
                          </button>
                        </div>
        
                        <div className="nutri-macros" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
                          <div className="nutri-macro">
                            <div className="nutri-macro-val">
                              {Math.round(meal.calories)}
                            </div>
                            <div className="nutri-macro-label">
                              <Flame size={12} style={{ color: '#ff6b00' }} /> Calorie
                            </div>
                          </div>
                          <div className="nutri-macro">
                            <div className="nutri-macro-val">
                              {meal.carbs_g.toFixed(1)}g
                            </div>
                            <div className="nutri-macro-label">
                              <Leaf size={12} style={{ color: '#0f9d58' }} /> Carbs
                            </div>
                          </div>
                          <div className="nutri-macro">
                            <div className="nutri-macro-val">
                              {meal.fat_g.toFixed(1)}g
                            </div>
                            <div className="nutri-macro-label">
                              <Droplet size={12} style={{ color: '#f4b400' }} /> Fat
                            </div>
                          </div>
                          <div className="nutri-macro">
                            <div className="nutri-macro-val">
                              {meal.protein_g.toFixed(1)}g
                            </div>
                            <div className="nutri-macro-label">
                              <Drumstick size={12} style={{ color: '#db4437' }} /> Protein
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page <= 1}
                  onClick={() => fetchMeals(page - 1)}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <span className="page-info">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => fetchMeals(page + 1)}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
