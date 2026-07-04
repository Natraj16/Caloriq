import { useEffect, useState } from 'react';
import { dashboardAPI, weightAPI } from '../services/api';
import './Analytics.css';

export default function Analytics() {
  const [timeframe, setTimeframe] = useState(7); // 7, 14, 30
  const [analyticsData, setAnalyticsData] = useState([]);
  const [weightLogs, setWeightLogs] = useState([]);
  const [calorieTarget, setCalorieTarget] = useState(2000);
  const [weightInput, setWeightInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── Load Data ───────────────────────────────────────
  const loadData = async () => {
    try {
      const [analyticsRes, weightsRes, summaryRes] = await Promise.all([
        dashboardAPI.analytics(timeframe),
        weightAPI.list(),
        dashboardAPI.summary()
      ]);
      setAnalyticsData(analyticsRes.data);
      setWeightLogs(weightsRes.data);
      setCalorieTarget(summaryRes.data.targets.calories);
    } catch (err) {
      setError('Failed to fetch analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Re-fetch when the AI coach logs weight or changes targets
    const handleCoachDataChange = () => loadData();
    window.addEventListener('caloriq:data-changed', handleCoachDataChange);
    return () => window.removeEventListener('caloriq:data-changed', handleCoachDataChange);
  }, [timeframe]);

  // ── Log Weight ───────────────────────────────────────
  const handleLogWeight = async (e) => {
    e.preventDefault();
    if (!weightInput || parseFloat(weightInput) <= 0) return;

    try {
      setError('');
      setSuccessMsg('');
      await weightAPI.log(parseFloat(weightInput));
      setWeightInput('');
      setSuccessMsg('Weight logged successfully!');
      loadData();
    } catch (err) {
      setError('Failed to log weight.');
    }
  };

  // ── Delete Weight ────────────────────────────────────
  const handleDeleteWeight = async (id) => {
    try {
      setError('');
      setSuccessMsg('');
      await weightAPI.delete(id);
      setSuccessMsg('Weight entry deleted.');
      loadData();
    } catch (err) {
      setError('Failed to delete weight log.');
    }
  };

  if (loading) {
    return (
      <div className="page page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  // ── Calculate SVG Points for Calories ────────────────
  const maxCalories = Math.max(...analyticsData.map((d) => d.calories), calorieTarget, 1000) * 1.1;
  const calSvgWidth = 600;
  const calSvgHeight = 240;
  const calMargin = { top: 20, right: 20, bottom: 40, left: 50 };
  const calGraphWidth = calSvgWidth - calMargin.left - calMargin.right;
  const calGraphHeight = calSvgHeight - calMargin.top - calMargin.bottom;

  // Calorie Target Line Y
  const calTargetY = calMargin.top + calGraphHeight - (calorieTarget / maxCalories) * calGraphHeight;

  // ── Calculate SVG Points for Weight ──────────────────
  const validWeights = analyticsData.map((d) => d.weight).filter((w) => w !== null);
  const minWeightVal = validWeights.length > 0 ? Math.min(...validWeights) : 60;
  const maxWeightVal = validWeights.length > 0 ? Math.max(...validWeights) : 80;
  const weightDiff = maxWeightVal - minWeightVal;
  const weightMin = Math.max(0, minWeightVal - (weightDiff * 0.1 || 5));
  const weightMax = maxWeightVal + (weightDiff * 0.1 || 5);

  const wtPoints = [];
  const activeDataPoints = analyticsData.filter((d) => d.weight !== null);
  const totalPoints = activeDataPoints.length;

  return (
    <div className="page page-content animate-fade-in">
      <div className="analytics-header">
        <div>
          <h1 className="editorial-title" style={{ fontSize: '36px' }}>Performance Analytics</h1>
          <p style={{ color: 'var(--color-slate)' }}>Detailed trends of calorie intake and weight over time.</p>
        </div>
        <div className="timeframe-tabs">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              className={`timeframe-tab ${timeframe === days ? 'active' : ''}`}
              onClick={() => setTimeframe(days)}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-text" style={{ marginBottom: '16px', fontSize: '15px' }}>{error}</div>}
      {successMsg && <div style={{ color: 'var(--color-success)', marginBottom: '16px', fontSize: '15px' }}>{successMsg}</div>}

      <div className="analytics-grid">

        {/* Charts area */}
        <div>
          {/* Calories Chart */}
          <div className="card chart-card">
            <div className="chart-title-area">
              <h3>Calorie Intake Trends</h3>
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-color" style={{ background: 'rgba(211, 47, 47, 0.4)' }} />
                  <span>Consumed</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ border: '1px dashed var(--color-obsidian)', height: '2px', width: '20px' }} />
                  <span>Daily Target ({calorieTarget} kcal)</span>
                </div>
              </div>
            </div>

            <div className="chart-svg-container">
              <svg viewBox={`0 0 ${calSvgWidth} ${calSvgHeight}`} width="100%" height="100%">
                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                  const yVal = calMargin.top + calGraphHeight * p;
                  const labelVal = Math.round(maxCalories * (1 - p));
                  return (
                    <g key={i}>
                      <line
                        x1={calMargin.left}
                        y1={yVal}
                        x2={calSvgWidth - calMargin.right}
                        y2={yVal}
                        className="chart-grid-line"
                      />
                      <text
                        x={calMargin.left - 8}
                        y={yVal + 4}
                        textAnchor="end"
                        className="chart-axis-label"
                      >
                        {labelVal}
                      </text>
                    </g>
                  );
                })}

                {/* Calorie Bars */}
                {analyticsData.map((d, index) => {
                  const barWidth = Math.max(2, (calGraphWidth / timeframe) - 6);
                  const barHeight = (d.calories / maxCalories) * calGraphHeight;
                  const x = calMargin.left + index * (calGraphWidth / timeframe) + 3;
                  const y = calMargin.top + calGraphHeight - barHeight;

                  // Label helper for date
                  const dateObj = new Date(d.date);
                  const label = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                  return (
                    <g key={d.date}>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        fill={d.calories > calorieTarget ? 'var(--color-calories)' : 'rgba(211, 47, 47, 0.5)'}
                        rx="4"
                      />
                      {/* Show dates label for a subset to avoid crowding */}
                      {(timeframe === 7 || index % Math.ceil(timeframe / 7) === 0) && (
                        <text
                          x={x + barWidth / 2}
                          y={calSvgHeight - 12}
                          textAnchor="middle"
                          className="chart-axis-label"
                        >
                          {label}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Target line */}
                <line
                  x1={calMargin.left}
                  y1={calTargetY}
                  x2={calSvgWidth - calMargin.right}
                  y2={calTargetY}
                  stroke="var(--color-obsidian)"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />
              </svg>
            </div>
          </div>

          {/* Weight Log Chart */}
          <div className="card chart-card">
            <div className="chart-title-area">
              <h3>Weight Progress</h3>
              <span style={{ fontSize: '13px', color: 'var(--color-slate)' }}>Latest Trend</span>
            </div>

            <div className="chart-svg-container">
              {activeDataPoints.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--color-slate)' }}>
                  Log your weight in the sidebar to view progress.
                </div>
              ) : (
                <svg viewBox={`0 0 ${calSvgWidth} ${calSvgHeight}`} width="100%" height="100%">
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                    const yVal = calMargin.top + calGraphHeight * p;
                    const labelVal = (weightMax - p * (weightMax - weightMin)).toFixed(1);
                    return (
                      <g key={i}>
                        <line
                          x1={calMargin.left}
                          y1={yVal}
                          x2={calSvgWidth - calMargin.right}
                          y2={yVal}
                          className="chart-grid-line"
                        />
                        <text
                          x={calMargin.left - 8}
                          y={yVal + 4}
                          textAnchor="end"
                          className="chart-axis-label"
                        >
                          {labelVal} kg
                        </text>
                      </g>
                    );
                  })}

                  {/* Draw trend path */}
                  {(() => {
                    const points = activeDataPoints.map((d, index) => {
                      const x = calMargin.left + index * (calGraphWidth / (totalPoints - 1 || 1));
                      const y = calMargin.top + calGraphHeight - ((d.weight - weightMin) / (weightMax - weightMin)) * calGraphHeight;
                      return { x, y, date: d.date, weight: d.weight };
                    });

                    const pathD = points.reduce((acc, p, i) => {
                      return acc + `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y} `;
                    }, '');

                    return (
                      <g>
                        <path
                          d={pathD}
                          fill="none"
                          stroke="var(--color-protein)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {points.map((p, i) => (
                          <g key={i}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="4"
                              fill="var(--color-paper)"
                              stroke="var(--color-protein)"
                              strokeWidth="2"
                            />
                            {/* X Axis Date labels */}
                            {(totalPoints < 8 || i % Math.ceil(totalPoints / 7) === 0) && (
                              <text
                                x={p.x}
                                y={calSvgHeight - 12}
                                textAnchor="middle"
                                className="chart-axis-label"
                              >
                                {new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </text>
                            )}
                          </g>
                        ))}
                      </g>
                    );
                  })()}
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Log Weight */}
        <div className="analytics-sidebar">

          <div className="card">
            <h3>Log Current Weight</h3>
            <form onSubmit={handleLogWeight} className="weight-form" style={{ marginTop: '16px' }}>
              <div className="input-group">
                <label className="input-label">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  placeholder="e.g. 74.3"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">Save Weight Log</button>
            </form>
          </div>

          <div className="card">
            <h3>Weight Log History</h3>
            <div className="weight-logs-list" style={{ marginTop: '16px' }}>
              {weightLogs.length === 0 ? (
                <p style={{ color: 'var(--color-slate)', fontSize: '14px' }}>No recorded weight logs yet.</p>
              ) : (
                weightLogs.map((log) => {
                  const dateStr = new Date(log.logged_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <div key={log.id} className="weight-log-item">
                      <div>
                        <div className="weight-log-val">{log.weight_kg} kg</div>
                        <div className="weight-log-date">{dateStr}</div>
                      </div>
                      <button
                        className="weight-log-delete"
                        onClick={() => handleDeleteWeight(log.id)}
                        title="Delete log"
                      >
                        🗑️
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
