/**
 * Caloriq — Meal History page.
 * Shows paginated list of logged meals with macro chips and tier badges.
 */

import { useState, useEffect } from 'react';
import { mealsAPI } from '../services/api';
import { Trash2, ChevronLeft, ChevronRight, Zap, Database, BarChart3, Bot, ScanBarcode, UtensilsCrossed } from 'lucide-react';
import './MealHistory.css';

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
              {meals.map((meal) => {
                const tier = TIER_META[meal.pipeline_tier] || TIER_META.gemini;
                const TierIcon = tier.icon;
                return (
                  <div key={meal.id} className="meal-row animate-fade-in">
                    <div className="meal-row-left">
                      <span className="meal-emoji">{MEAL_EMOJI[meal.meal_type] || '🍽️'}</span>
                      <div className="meal-info">
                        <span className="meal-name">{meal.food_name}</span>
                        <span className="meal-meta">
                          {formatDate(meal.logged_at)} at {formatTime(meal.logged_at)}
                          {meal.serving_size && ` · ${meal.serving_size}`}
                        </span>
                      </div>
                    </div>
                    <div className="meal-row-right">
                      <div className="meal-macros">
                        <span className="macro-chip macro-chip-calories">{Math.round(meal.calories)} kcal</span>
                        <span className="macro-chip macro-chip-protein">{meal.protein_g.toFixed(1)}g P</span>
                        <span className="macro-chip macro-chip-carbs">{meal.carbs_g.toFixed(1)}g C</span>
                        <span className="macro-chip macro-chip-fat">{meal.fat_g.toFixed(1)}g F</span>
                      </div>
                      <div className={`tier-badge ${tier.color}`}>
                        <TierIcon size={10} />
                        {tier.label}
                      </div>
                      <button
                        className="btn btn-ghost btn-icon btn-sm meal-delete"
                        onClick={() => handleDelete(meal.id)}
                        title="Delete meal"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
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
