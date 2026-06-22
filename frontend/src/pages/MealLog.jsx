/**
 * Caloriq — Meal Logger page.
 * The core feature: log meals via photo, text, or barcode.
 * Shows nutrition results with pipeline tier indicator.
 */

import { useState, useRef, useEffect } from 'react';
import { Camera, MessageSquareText, ScanBarcode, Loader2, Check, X, Flame, Zap, Database, BarChart3, Bot } from 'lucide-react';
import { mealsAPI } from '../services/api';
import './MealLog.css';

const MEAL_TYPES = [
  { value: 'breakfast', label: '🌅 Breakfast' },
  { value: 'lunch', label: '☀️ Lunch' },
  { value: 'dinner', label: '🌙 Dinner' },
  { value: 'snack', label: '🍿 Snack' },
];

const TIER_META = {
  cache: { icon: Zap, label: 'Cache hit', color: 'tier-cache' },
  db: { icon: Database, label: 'DB lookup', color: 'tier-db' },
  usda: { icon: BarChart3, label: 'USDA', color: 'tier-usda' },
  gemini: { icon: Bot, label: 'Gemini AI', color: 'tier-gemini' },
  barcode_api: { icon: ScanBarcode, label: 'Open Food Facts', color: 'tier-barcode_api' },
};

const generateServingOptions = (servingStr, pipelineTier) => {
  const options = [];
  
  if (!servingStr) {
    options.push({ label: '100 g', multiplier: 1.0, weight: 100 });
    options.push({ label: '1 g', multiplier: 0.01, weight: 1 });
    return options;
  }

  const str = servingStr.toLowerCase().trim();

  // Pattern 1: quantity unit (weight unit2)
  // e.g. "2 slices (50g)", "1 pot (125 g)", "1 bottle (330ml)"
  const triplePattern = /^([\d.]+)\s*([a-zA-Z\s]+?)\s*\(\s*([\d.]+)\s*(g|ml|grams|mliter|l|liters)\s*\)$/;
  const tripleMatch = str.match(triplePattern);

  if (tripleMatch) {
    const qty = parseFloat(tripleMatch[1]);
    const unitSingular = tripleMatch[2].replace(/s$/, '').trim();
    const unitPlural = tripleMatch[2].trim();
    const totalWeight = parseFloat(tripleMatch[3]);
    const weightUnit = tripleMatch[4];
    const weightPerUnit = totalWeight / qty;

    options.push({
      label: `1 ${unitSingular} (${weightPerUnit.toFixed(1)} ${weightUnit})`,
      multiplier: weightPerUnit / 100,
      unit: unitSingular,
      weight: weightPerUnit
    });

    options.push({
      label: `1 serving (${qty} ${unitPlural} / ${totalWeight} ${weightUnit})`,
      multiplier: totalWeight / 100,
      unit: 'serving',
      weight: totalWeight
    });
  } else {
    // Pattern 2: weight unit
    // e.g. "50g", "250 ml", "100 g"
    const weightPattern = /^([\d.]+)\s*(g|ml|grams|mliter|l|liters)$/;
    const weightMatch = str.match(weightPattern);

    if (weightMatch) {
      const weight = parseFloat(weightMatch[1]);
      const weightUnit = weightMatch[2];

      options.push({
        label: `1 serving (${weight} ${weightUnit})`,
        multiplier: weight / 100,
        unit: 'serving',
        weight: weight
      });
    } else {
      // Pattern 3: quantity unit (no weight)
      // e.g. "1 slice", "2 eggs", "1 cup"
      const qtyUnitPattern = /^([\d.]+)\s*([a-zA-Z\s]+)$/;
      const qtyUnitMatch = str.match(qtyUnitPattern);

      if (qtyUnitMatch) {
        const qty = parseFloat(qtyUnitMatch[1]);
        const unit = qtyUnitMatch[2].trim();
        const isBarcode = (pipelineTier === 'barcode_api' || pipelineTier === 'usda');
        const multiplier = isBarcode ? 1.0 : (1.0 / qty);

        options.push({
          label: `1 ${unit.replace(/s$/, '')}`,
          multiplier: multiplier,
          unit: unit.replace(/s$/, ''),
          weight: null
        });

        if (qty > 1) {
          options.push({
            label: `1 serving (${qty} ${unit})`,
            multiplier: isBarcode ? 1.0 : 1.0,
            unit: 'serving',
            weight: null
          });
        }
      } else {
        options.push({
          label: `1 serving (${servingStr})`,
          multiplier: 1.0,
          unit: 'serving',
          weight: null
        });
      }
    }
  }

  // Always add 100g and 1g for metrics-based logging (standard for barcode/USDA)
  const unitSuffix = str.includes('ml') ? 'ml' : 'g';
  
  if (!options.some(o => o.weight === 100)) {
    options.push({
      label: `100 ${unitSuffix}`,
      multiplier: 1.0,
      unit: unitSuffix,
      weight: 100
    });
  }

  if (!options.some(o => o.weight === 1)) {
    options.push({
      label: `1 ${unitSuffix}`,
      multiplier: 0.01,
      unit: unitSuffix,
      weight: 1
    });
  }

  return options;
};

export default function MealLog() {
  const [activeTab, setActiveTab] = useState('text');
  const [mealType, setMealType] = useState('snack');
  const [text, setText] = useState('');
  const [barcode, setBarcode] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Pre-save customizable states
  const [foodName, setFoodName] = useState('');
  const [servingOptions, setServingOptions] = useState([]);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [rawInput, setRawInput] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setResult(null);
      setError('');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setSaveSuccess(false);

    try {
      let response;
      let queryVal = '';
      if (activeTab === 'text') {
        if (!text.trim()) { setError('Please describe what you ate'); setLoading(false); return; }
        queryVal = text;
        response = await mealsAPI.analyzeText(text, mealType);
      } else if (activeTab === 'barcode') {
        if (!barcode.trim()) { setError('Please enter a barcode'); setLoading(false); return; }
        queryVal = barcode;
        response = await mealsAPI.analyzeBarcode(barcode, mealType);
      } else if (activeTab === 'photo') {
        if (!photoFile) { setError('Please select a photo'); setLoading(false); return; }
        response = await mealsAPI.analyzePhoto(photoFile);
      }

      const resData = response.data;
      setResult(resData);
      setFoodName(resData.food_name);
      const opts = generateServingOptions(resData.serving_size, resData.pipeline_tier);
      setServingOptions(opts);
      setSelectedOptionIndex(0);
      setQuantity(1);
      setRawInput(queryVal);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSafeMultiplier = () => {
    const opt = servingOptions[selectedOptionIndex];
    const qty = parseFloat(quantity);
    if (!opt || isNaN(qty) || qty < 0) return 1.0;
    return opt.multiplier * qty;
  };

  const handleSave = async () => {
    if (!result) return;
    setSaveLoading(true);
    setError('');
    const mult = getSafeMultiplier();
    const opt = servingOptions[selectedOptionIndex];
    const displayServingSize = opt 
      ? `${quantity} x ${opt.label}`
      : `${quantity} serving`;

    try {
      await mealsAPI.saveMeal({
        meal_type: mealType,
        food_name: foodName,
        calories: result.calories * mult,
        protein_g: result.protein_g * mult,
        carbs_g: result.carbs_g * mult,
        fat_g: result.fat_g * mult,
        serving_size: displayServingSize,
        input_method: activeTab,
        raw_input: rawInput,
        pipeline_tier: result.pipeline_tier,
        analysis_time_ms: result.analysis_time_ms || 0,
        confidence_score: result.confidence_score || 1.0,
      });
      setSaveSuccess(true);
      // Clear inputs
      setResult(null);
      setText('');
      setBarcode('');
      setPhotoFile(null);
      setPhotoPreview(null);
      setServingOptions([]);
      setSelectedOptionIndex(0);
      setQuantity(1);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save meal. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  const tier = result ? TIER_META[result.pipeline_tier] || TIER_META.gemini : null;
  const TierIcon = tier?.icon;

  return (
    <div className="meal-log-page">
      <div className="page-content">
        <div className="meal-log-header">
          <h1>Log a Meal</h1>
          <p className="text-secondary">Snap a photo, type what you ate, or scan a barcode</p>
        </div>

        <div className="meal-log-grid">
          {/* ── Input Panel ─────────────────────────────── */}
          <div className="card meal-input-card">
            {/* Meal Type Selector */}
            <div className="meal-type-selector">
              {MEAL_TYPES.map((mt) => (
                <button
                  key={mt.value}
                  className={`meal-type-btn ${mealType === mt.value ? 'active' : ''}`}
                  onClick={() => setMealType(mt.value)}
                >
                  {mt.label}
                </button>
              ))}
            </div>

            {/* Tab Switcher */}
            <div className="input-tabs">
              <button
                className={`tab-btn ${activeTab === 'text' ? 'active' : ''}`}
                onClick={() => setActiveTab('text')}
              >
                <MessageSquareText size={18} />
                Text
              </button>
              <button
                className={`tab-btn ${activeTab === 'photo' ? 'active' : ''}`}
                onClick={() => setActiveTab('photo')}
              >
                <Camera size={18} />
                Photo
              </button>
              <button
                className={`tab-btn ${activeTab === 'barcode' ? 'active' : ''}`}
                onClick={() => setActiveTab('barcode')}
              >
                <ScanBarcode size={18} />
                Barcode
              </button>
            </div>

            {/* Tab Content */}
            <div className="input-content">
              {activeTab === 'text' && (
                <div className="input-group">
                  <textarea
                    id="meal-text-input"
                    className="input meal-textarea"
                    placeholder='Describe what you ate... e.g. "I had 2 eggs, toast with butter, and a glass of orange juice"'
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={4}
                  />
                </div>
              )}

              {activeTab === 'photo' && (
                <div className="photo-input-area">
                  {photoPreview ? (
                    <div className="photo-preview">
                      <img src={photoPreview} alt="Food preview" />
                      <button
                        className="btn btn-ghost btn-sm photo-clear"
                        onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      >
                        <X size={16} /> Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      className="photo-upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera size={32} />
                      <span>Click to upload a food photo</span>
                      <span className="photo-hint">JPEG, PNG, or WebP • Max 10MB</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    style={{ display: 'none' }}
                  />
                </div>
              )}

              {activeTab === 'barcode' && (
                <div className="input-group">
                  <input
                    id="meal-barcode-input"
                    type="text"
                    className="input"
                    placeholder="Enter barcode number (e.g. 5060292302201)"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                  />
                  <p className="barcode-hint">
                    Tip: Packaged food barcodes are looked up directly in Open Food Facts — no AI needed, instant results.
                  </p>
                </div>
              )}
            </div>

            {error && !result && <div className="auth-error" style={{ marginTop: 'var(--space-md)' }}>{error}</div>}

            <button
              className="btn btn-primary btn-lg meal-submit"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Flame size={18} />
                  Analyze Meal
                </>
              )}
            </button>
          </div>

          {/* ── Result Panel ────────────────────────────── */}
          <div className="result-panel">
            {result ? (
              <div className="card result-card animate-slide-up">
                <div className="result-header">
                  <div className="result-success">
                    <Check size={20} />
                    Analysis Complete
                  </div>
                  {tier && (
                    <div className={`tier-badge ${tier.color}`}>
                      <TierIcon size={12} />
                      {tier.label}
                      {result.analysis_time_ms != null && (
                        <span className="tier-time">{result.analysis_time_ms}ms</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Interactive Modification Fields */}
                <div className="result-adjustment-form">
                  <div className="input-group">
                    <label className="input-label" htmlFor="result-food-name-input">Food Name</label>
                    <input
                      id="result-food-name-input"
                      type="text"
                      className="input"
                      value={foodName}
                      onChange={(e) => setFoodName(e.target.value)}
                    />
                  </div>

                  <div className="input-row-grid">
                    <div className="input-group">
                      <label className="input-label" htmlFor="result-serving-select">Serving Size</label>
                      <select
                        id="result-serving-select"
                        className="input"
                        value={selectedOptionIndex}
                        onChange={(e) => setSelectedOptionIndex(parseInt(e.target.value) || 0)}
                        style={{ height: '42px' }}
                      >
                        {servingOptions.map((opt, idx) => (
                          <option key={idx} value={idx}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="input-group">
                      <label className="input-label" htmlFor="result-quantity-input">Quantity</label>
                      <input
                        id="result-quantity-input"
                        type="number"
                        className="input"
                        step="0.1"
                        min="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="e.g. 1"
                      />
                    </div>
                  </div>
                </div>

                <div className="macro-grid" style={{ marginTop: 'var(--space-md)' }}>
                  <div className="macro-card macro-calories">
                    <span className="macro-value">{Math.round(result.calories * getSafeMultiplier())}</span>
                    <span className="macro-label">Calories</span>
                  </div>
                  <div className="macro-card macro-protein">
                    <span className="macro-value">{(result.protein_g * getSafeMultiplier()).toFixed(1)}g</span>
                    <span className="macro-label">Protein</span>
                  </div>
                  <div className="macro-card macro-carbs">
                    <span className="macro-value">{(result.carbs_g * getSafeMultiplier()).toFixed(1)}g</span>
                    <span className="macro-label">Carbs</span>
                  </div>
                  <div className="macro-card macro-fat">
                    <span className="macro-value">{(result.fat_g * getSafeMultiplier()).toFixed(1)}g</span>
                    <span className="macro-label">Fat</span>
                  </div>
                </div>

                {result.confidence_score != null && (
                  <div className="confidence-bar" style={{ marginBottom: 'var(--space-md)' }}>
                    <span className="confidence-label">
                      Confidence: {Math.round(result.confidence_score * 100)}%
                    </span>
                    <div className="confidence-track">
                      <div
                        className="confidence-fill"
                        style={{ width: `${result.confidence_score * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {error && <div className="auth-error" style={{ marginBottom: 'var(--space-md)' }}>{error}</div>}

                <button
                  className="btn btn-accent btn-lg meal-submit"
                  onClick={handleSave}
                  disabled={saveLoading}
                >
                  {saveLoading ? (
                    <>
                      <Loader2 size={18} className="spin" />
                      Logging Meal...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Confirm & Log Meal
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="result-placeholder">
                <div className="result-placeholder-icon">
                  <Flame size={48} />
                </div>
                <p>Your nutrition analysis will appear here</p>
                <p className="result-placeholder-hint">
                  Try typing "2 eggs and toast" or upload a food photo
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="toast toast-success">
          <Check size={16} /> Meal Logged successfully!
        </div>
      )}
    </div>
  );
}
