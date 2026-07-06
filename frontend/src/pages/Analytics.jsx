import { useEffect, useState } from 'react';
import { dashboardAPI, weightAPI, profileAPI } from '../services/api';
import './Analytics.css';

export default function Analytics() {
  const [timeframe, setTimeframe] = useState(7); // 7, 14, 30
  const [analyticsData, setAnalyticsData] = useState([]);
  const [weightLogs, setWeightLogs] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [userHeight, setUserHeight] = useState(null);
  const [calorieTarget, setCalorieTarget] = useState(2000);
  const [weightInput, setWeightInput] = useState('');
  const [showLogForm, setShowLogForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── Load Data ───────────────────────────────────────
  const loadData = async () => {
    try {
      const [analyticsRes, weightsRes, summaryRes, profileRes] = await Promise.all([
        dashboardAPI.analytics(timeframe),
        weightAPI.list(),
        dashboardAPI.summary(),
        profileAPI.get().catch(() => ({ data: {} }))
      ]);
      setAnalyticsData(analyticsRes.data);
      setWeightLogs(weightsRes.data);
      setCalorieTarget(summaryRes.data.targets.calories);
      if (profileRes.data) {
        setUserProfile(profileRes.data);
        if (profileRes.data.height_cm) {
          setUserHeight(profileRes.data.height_cm);
        }
      }
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

  // ── Calculate SVG Points for Weight & BMI ─────────────
  const validWeights = analyticsData.map((d) => d.weight).filter((w) => w !== null);
  let minWeightVal = validWeights.length > 0 ? Math.min(...validWeights) : 60;
  let maxWeightVal = validWeights.length > 0 ? Math.max(...validWeights) : 80;
  
  if (userProfile?.target_weight_kg) {
    minWeightVal = Math.min(minWeightVal, userProfile.target_weight_kg);
    maxWeightVal = Math.max(maxWeightVal, userProfile.target_weight_kg);
  }

  const weightDiff = maxWeightVal - minWeightVal;
  const weightMin = Math.max(0, minWeightVal - (weightDiff * 0.1 || 5));
  const weightMax = maxWeightVal + (weightDiff * 0.1 || 5);

  const activeDataPoints = analyticsData.filter((d) => d.weight !== null).map(d => {
    let bmi = null;
    if (userHeight && userHeight > 0) {
      const heightM = userHeight / 100;
      bmi = parseFloat((d.weight / (heightM * heightM)).toFixed(1));
    }
    return { ...d, bmi };
  });
  const totalPoints = activeDataPoints.length;

  const validBmis = activeDataPoints.map((d) => d.bmi).filter((b) => b !== null);
  const minBmiVal = validBmis.length > 0 ? Math.min(...validBmis) : 18;
  const maxBmiVal = validBmis.length > 0 ? Math.max(...validBmis) : 32;
  const bmiDiff = maxBmiVal - minBmiVal;
  const bmiMin = Math.max(10, minBmiVal - (bmiDiff * 0.1 || 2));
  const bmiMax = Math.min(50, maxBmiVal + (bmiDiff * 0.1 || 2));

  // Helper for linear BMI marker
  const currentBmi = activeDataPoints.length > 0 ? activeDataPoints[activeDataPoints.length - 1].bmi : null;
  const getBmiMarkerStyle = () => {
    if (!currentBmi) return { left: '0%' };
    // Map BMI 15 to 40 to 0% - 100%
    const percentage = Math.max(0, Math.min(100, ((currentBmi - 15) / 25) * 100));
    return { left: `${percentage}%` };
  };

  const getBmiBadge = () => {
    if (!currentBmi) return null;
    if (currentBmi < 18.5) return { text: 'Underweight', color: 'var(--color-info)' };
    if (currentBmi < 25) return { text: 'Normal', color: 'var(--color-success)' };
    if (currentBmi < 30) return { text: 'Overweight', color: 'var(--color-warning)' };
    return { text: 'Obese', color: 'var(--color-error)' };
  };

  const bmiBadge = getBmiBadge();

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
        
        {/* Main Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>

          {/* 1. Linear BMI Card */}
          {userHeight ? (
            <div className="card bmi-linear-card">
              <div className="bmi-linear-header">
                <div className="bmi-linear-title">Current BMI</div>
                {bmiBadge && (
                  <div className="bmi-linear-badge" style={{ backgroundColor: bmiBadge.color }}>
                    {bmiBadge.text}
                  </div>
                )}
              </div>
              <div className="bmi-linear-value">
                {currentBmi ? currentBmi.toFixed(1) : '--'}
              </div>
              
              <div className="bmi-linear-scale-container">
                <div className="bmi-linear-track">
                  {/* Underweight 15-18.5 (14%) */}
                  <div className="bmi-linear-segment" style={{ width: '14%', backgroundColor: 'var(--color-info)' }} />
                  {/* Normal 18.5-25 (26%) */}
                  <div className="bmi-linear-segment" style={{ width: '26%', backgroundColor: 'var(--color-success)' }} />
                  {/* Overweight 25-30 (20%) */}
                  <div className="bmi-linear-segment" style={{ width: '20%', backgroundColor: 'var(--color-warning)' }} />
                  {/* Obese 30-40 (40%) */}
                  <div className="bmi-linear-segment" style={{ width: '40%', backgroundColor: 'var(--color-error)' }} />
                  
                  {currentBmi && (
                    <div className="bmi-linear-marker" style={getBmiMarkerStyle()} />
                  )}
                </div>
                <div className="bmi-linear-labels">
                  <div className="bmi-linear-label" style={{ left: '0%' }}>15</div>
                  <div className="bmi-linear-label" style={{ left: '14%' }}>18.5</div>
                  <div className="bmi-linear-label" style={{ left: '40%' }}>25</div>
                  <div className="bmi-linear-label" style={{ left: '60%' }}>30</div>
                  <div className="bmi-linear-label" style={{ left: '100%' }}>40</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card bmi-linear-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <p style={{ color: 'var(--color-slate)' }}>Please update your profile with your height to view BMI.</p>
            </div>
          )}

          {/* 2. Weight Progress Chart with Goal tracking */}
          <div className="card chart-card">
            <div className="chart-title-area" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-obsidian)' }}>Weight Progress</h3>
            </div>

            {/* Notification if no log today */}
            {activeDataPoints.length === 0 || activeDataPoints[activeDataPoints.length - 1].date.split('T')[0] !== new Date().toISOString().split('T')[0] ? (
              <div className="weight-log-notification">
                <span style={{ fontSize: '18px' }}>🔔</span> No weight record today
              </div>
            ) : null}

            {/* Goal Stats Row */}
            {userProfile?.target_weight_kg && (
              <div className="goal-stats-row">
                <div className="goal-stat-box">
                  <div className="goal-stat-label">Goal Weight</div>
                  <div className="goal-stat-val">{userProfile.target_weight_kg} kg</div>
                </div>
                {userProfile?.target_date && (
                  <div className="goal-stat-box">
                    <div className="goal-stat-label">Reach goal</div>
                    <div className="goal-stat-val" style={{ color: 'var(--color-success)' }}>
                      {new Date(userProfile.target_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SVG Chart */}
            <div className="chart-svg-container">
              {activeDataPoints.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--color-slate)' }}>
                  Log your weight below to view progress.
                </div>
              ) : (
                <svg viewBox={`0 0 ${calSvgWidth} ${calSvgHeight}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                    const yVal = calMargin.top + calGraphHeight * p;
                    const labelVal = (weightMax - p * (weightMax - weightMin)).toFixed(0);
                    return (
                      <g key={i}>
                        <line
                          x1={calMargin.left}
                          y1={yVal}
                          x2={calSvgWidth - calMargin.right}
                          y2={yVal}
                          className="chart-grid-line"
                          strokeDasharray="2 6"
                        />
                        <text
                          x={calSvgWidth - calMargin.right + 8}
                          y={yVal + 4}
                          textAnchor="start"
                          className="chart-axis-label"
                        >
                          {labelVal}kg
                        </text>
                      </g>
                    );
                  })}

                  {/* Goal Dashed Line */}
                  {(() => {
                    const mockGoalWeight = userProfile?.target_weight_kg;
                    if (mockGoalWeight && mockGoalWeight >= weightMin && mockGoalWeight <= weightMax) {
                      const goalY = calMargin.top + calGraphHeight - ((mockGoalWeight - weightMin) / (weightMax - weightMin)) * calGraphHeight;
                      return (
                        <g>
                          <line
                            x1={calMargin.left}
                            y1={goalY}
                            x2={calSvgWidth - calMargin.right}
                            y2={goalY}
                            stroke="var(--color-slate)"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                          />
                          <rect x={calMargin.left} y={goalY - 10} width="36" height="20" rx="10" fill="var(--color-info)" />
                          <text x={calMargin.left + 18} y={goalY + 4} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Goal</text>
                        </g>
                      );
                    }
                    return null;
                  })()}

                  {/* Draw trend path */}
                  {(() => {
                    const points = activeDataPoints.map((d, index) => {
                      const x = calMargin.left + index * (calGraphWidth / (totalPoints - 1 || 1));
                      const y = calMargin.top + calGraphHeight - ((d.weight - weightMin) / (weightMax - weightMin)) * calGraphHeight;
                      return { x, y, date: d.date, weight: d.weight, isLast: index === activeDataPoints.length - 1 };
                    });

                    const pathD = points.reduce((acc, p, i) => {
                      return acc + `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y} `;
                    }, '');

                    return (
                      <g>
                        <path
                          d={pathD}
                          fill="none"
                          stroke="var(--color-success)"
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
                              stroke="var(--color-success)"
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
                                {new Date(p.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                              </text>
                            )}

                            {/* Tooltip for the last point */}
                            {p.isLast && (
                              <g>
                                <rect x={p.x - 30} y={p.y - 35} width="60" height="24" rx="12" fill="var(--color-paper)" stroke="var(--color-silver)" />
                                <text x={p.x} y={p.y - 18} textAnchor="middle" fill="var(--color-obsidian)" fontSize="13" fontWeight="bold">{p.weight} kg</text>
                              </g>
                            )}
                          </g>
                        ))}
                      </g>
                    );
                  })()}
                </svg>
              )}
            </div>

            {/* Inline Log Weight Form */}
            <div className="inline-log-weight-area">
              {showLogForm ? (
                <form onSubmit={(e) => { e.preventDefault(); handleLogWeight(e).then(() => setShowLogForm(false)); }} className="weight-form">
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
                      autoFocus
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Log</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setShowLogForm(false)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <button className="btn" style={{ background: '#2c2c2e', color: 'white', width: '100%', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: '600' }} onClick={() => setShowLogForm(true)}>
                  <span style={{ fontSize: '18px', marginRight: '8px' }}>⊕</span> Log Weight
                </button>
              )}
            </div>
          </div>

          {/* 3. Calories Chart */}
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
        </div>

        {/* Sidebar Log History */}
        <div className="analytics-sidebar">
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
