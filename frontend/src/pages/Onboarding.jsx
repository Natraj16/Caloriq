import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../services/api';
import './Onboarding.css';

export default function Onboarding() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    age: '',
    sex: '',
    height_cm: '',
    weight_kg: '',
    goal: '',
    activity_level: '',
    dietary_preferences: [],
    allergies: [],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  });

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const handleSelect = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTogglePreference = (listField, item) => {
    setFormData((prev) => {
      const list = prev[listField];
      const newList = list.includes(item)
        ? list.filter((x) => x !== item)
        : [...list, item];
      return { ...prev, [listField]: newList };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.age || !formData.sex || !formData.height_cm || !formData.weight_kg || !formData.goal || !formData.activity_level) {
      setError('Please complete all required fields.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await profileAPI.create({
        age: parseInt(formData.age, 10),
        sex: formData.sex,
        height_cm: parseFloat(formData.height_cm),
        weight_kg: parseFloat(formData.weight_kg),
        goal: formData.goal,
        activity_level: formData.activity_level,
        dietary_preferences: formData.dietary_preferences,
        allergies: formData.allergies,
        timezone: formData.timezone
      });
      await refreshUser(); // Update context so app knows user has profile
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create profile. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page-content animate-fade-in">
      <div className="onboarding-container">
        <div className="onboarding-card">
          <div className="onboarding-steps">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`step-dot ${step === i ? 'active' : ''}`} />
            ))}
          </div>

          {error && <div className="error-text" style={{ marginBottom: '16px', fontSize: '15px' }}>{error}</div>}

          {step === 1 && (
            <div>
              <h2 className="onboarding-title">Tell us about yourself</h2>
              <p className="onboarding-subtitle">This helps us calculate your baseline metabolic rate.</p>
              
              <div className="onboarding-form">
                <div className="input-group">
                  <label className="input-label">How old are you?</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g. 28"
                    value={formData.age}
                    onChange={(e) => handleSelect('age', e.target.value)}
                    min="1"
                    max="120"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">What is your biological sex?</label>
                  <div className="options-grid">
                    {['male', 'female', 'other'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`option-button ${formData.sex === opt ? 'selected' : ''}`}
                        onClick={() => handleSelect('sex', opt)}
                      >
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="onboarding-nav">
                  <button type="button" className="btn btn-ghost" style={{ visibility: 'hidden' }}>Back</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!formData.age || !formData.sex}
                    onClick={nextStep}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="onboarding-title">Body measurements</h2>
              <p className="onboarding-subtitle">Your height and weight are used to determine daily caloric needs.</p>

              <div className="onboarding-form">
                <div className="input-group">
                  <label className="input-label">Height (cm)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g. 175"
                    value={formData.height_cm}
                    onChange={(e) => handleSelect('height_cm', e.target.value)}
                    min="30"
                    max="300"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Weight (kg)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g. 72.5"
                    value={formData.weight_kg}
                    onChange={(e) => handleSelect('weight_kg', e.target.value)}
                    min="10"
                    max="500"
                    step="0.1"
                  />
                </div>

                <div className="onboarding-nav">
                  <button type="button" className="btn btn-ghost" onClick={prevStep}>Back</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!formData.height_cm || !formData.weight_kg}
                    onClick={nextStep}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="onboarding-title">Goals & Activity</h2>
              <p className="onboarding-subtitle">Define what you want to achieve and how active you are daily.</p>

              <div className="onboarding-form">
                <div className="input-group">
                  <label className="input-label">What is your primary goal?</label>
                  <div className="options-grid">
                    {[
                      { key: 'lose', label: 'Lose Weight' },
                      { key: 'maintain', label: 'Maintain Weight' },
                      { key: 'gain', label: 'Gain Muscle' }
                    ].map((g) => (
                      <button
                        key={g.key}
                        type="button"
                        className={`option-button ${formData.goal === g.key ? 'selected' : ''}`}
                        onClick={() => handleSelect('goal', g.key)}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Daily activity level</label>
                  <div className="options-grid">
                    {[
                      { key: 'sedentary', label: 'Sedentary (desk job)' },
                      { key: 'light', label: 'Lightly Active' },
                      { key: 'moderate', label: 'Moderately Active' },
                      { key: 'active', label: 'Very Active' }
                    ].map((act) => (
                      <button
                        key={act.key}
                        type="button"
                        className={`option-button ${formData.activity_level === act.key ? 'selected' : ''}`}
                        onClick={() => handleSelect('activity_level', act.key)}
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="onboarding-nav">
                  <button type="button" className="btn btn-ghost" onClick={prevStep}>Back</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!formData.goal || !formData.activity_level}
                    onClick={nextStep}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="onboarding-title">Dietary preferences & Allergies</h2>
              <p className="onboarding-subtitle">These preferences will help personalize your recommendations.</p>

              <div className="onboarding-form" onSubmit={handleSubmit}>
                <div className="input-group">
                  <label className="input-label">Dietary Preferences (Optional)</label>
                  <div className="multiselect-grid">
                    {['vegan', 'keto', 'halal', 'vegetarian', 'paleo'].map((pref) => {
                      const active = formData.dietary_preferences.includes(pref);
                      return (
                        <div
                          key={pref}
                          className={`checkbox-tile ${active ? 'active' : ''}`}
                          onClick={() => handleTogglePreference('dietary_preferences', pref)}
                        >
                          <input type="checkbox" checked={active} readOnly />
                          <span>{pref.charAt(0).toUpperCase() + pref.slice(1)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Allergies / Exclusions (Optional)</label>
                  <div className="multiselect-grid">
                    {['nuts', 'dairy', 'gluten', 'soy', 'shellfish'].map((allergy) => {
                      const active = formData.allergies.includes(allergy);
                      return (
                        <div
                          key={allergy}
                          className={`checkbox-tile ${active ? 'active' : ''}`}
                          onClick={() => handleTogglePreference('allergies', allergy)}
                        >
                          <input type="checkbox" checked={active} readOnly />
                          <span>{allergy.charAt(0).toUpperCase() + allergy.slice(1)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="onboarding-nav">
                  <button type="button" className="btn btn-ghost" onClick={prevStep}>Back</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? 'Calculating Targets...' : 'Complete & Calculate Targets'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
