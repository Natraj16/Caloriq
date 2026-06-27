import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../services/api';
import './Profile.css';

export default function Profile() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // { type: 'success' | 'error', message: string }

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    sex: '',
    height_cm: '',
    weight_kg: '',
    goal: '',
    activity_level: '',
    dietary_preferences: [],
    allergies: [],
    custom_calorie_target: '',
    custom_protein_target: '',
    custom_carbs_target: '',
    custom_fat_target: '',
    timezone: 'UTC'
  });

  const [useCustomTargets, setUseCustomTargets] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data } = await profileAPI.get();
        setProfile(data);
        setFormData({
          name: data.name || '',
          age: data.age || '',
          sex: data.sex || '',
          height_cm: data.height_cm || '',
          weight_kg: data.weight_kg || '',
          goal: data.goal || '',
          activity_level: data.activity_level || '',
          dietary_preferences: data.dietary_preferences || [],
          allergies: data.allergies || [],
          custom_calorie_target: data.custom_calorie_target || '',
          custom_protein_target: data.custom_protein_target || '',
          custom_carbs_target: data.custom_carbs_target || '',
          custom_fat_target: data.custom_fat_target || '',
          timezone: data.timezone || 'UTC'
        });
        setUseCustomTargets(
          data.custom_calorie_target !== null ||
          data.custom_protein_target !== null ||
          data.custom_carbs_target !== null ||
          data.custom_fat_target !== null
        );
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleInputChange = (field, value) => {
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
    setSaving(true);
    setSaveStatus(null);

    try {
      const payload = {
        name: formData.name,
        age: parseInt(formData.age, 10),
        sex: formData.sex,
        height_cm: parseFloat(formData.height_cm),
        weight_kg: parseFloat(formData.weight_kg),
        goal: formData.goal,
        activity_level: formData.activity_level,
        dietary_preferences: formData.dietary_preferences,
        allergies: formData.allergies,
        timezone: formData.timezone,
        custom_calorie_target: useCustomTargets && formData.custom_calorie_target ? parseInt(formData.custom_calorie_target, 10) : null,
        custom_protein_target: useCustomTargets && formData.custom_protein_target ? parseInt(formData.custom_protein_target, 10) : null,
        custom_carbs_target: useCustomTargets && formData.custom_carbs_target ? parseInt(formData.custom_carbs_target, 10) : null,
        custom_fat_target: useCustomTargets && formData.custom_fat_target ? parseInt(formData.custom_fat_target, 10) : null
      };

      const { data } = await profileAPI.update(payload);
      setProfile(data);
      await refreshUser();
      setSaveStatus({ type: 'success', message: 'Profile updated successfully!' });
    } catch (err) {
      setSaveStatus({ type: 'error', message: err.response?.data?.detail || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div className="profile-container page animate-fade-in">
      <header className="profile-header">
        <h1 className="profile-title">Profile Settings</h1>
        <p className="profile-subtitle">Manage your body metrics, food preferences, and daily budgets.</p>
      </header>

      {saveStatus && (
        <div className={`save-status ${saveStatus.type}`} style={{ marginBottom: '24px' }}>
          {saveStatus.message}
        </div>
      )}

      <div className="profile-grid">
        {/* Left Side: Targets overview & custom calorie overrides */}
        <div className="profile-card">
          <h3>Daily Energy Targets</h3>
          <div className="targets-display">
            <div className="target-item calories">
              <span>Calories</span>
              <span className="target-val">{profile?.daily_calorie_target} kcal</span>
            </div>
            <div className="target-item protein">
              <span>Protein</span>
              <span className="target-val">{profile?.daily_protein_target}g</span>
            </div>
            <div className="target-item carbs">
              <span>Carbs</span>
              <span className="target-val">{profile?.daily_carbs_target}g</span>
            </div>
            <div className="target-item fat">
              <span>Fat</span>
              <span className="target-val">{profile?.daily_fat_target}g</span>
            </div>
          </div>

          <div className="custom-target-section">
            <label className="custom-target-toggle">
              <input
                type="checkbox"
                checked={useCustomTargets}
                onChange={(e) => setUseCustomTargets(e.target.checked)}
              />
              <span>Customize Daily Targets</span>
            </label>
            {useCustomTargets && (
              <div className="custom-targets-grid">
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '12px' }}>Calories (kcal)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g. 2000"
                    value={formData.custom_calorie_target}
                    onChange={(e) => handleInputChange('custom_calorie_target', e.target.value)}
                    min="500"
                    max="10000"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '12px' }}>Protein (g)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g. 150"
                    value={formData.custom_protein_target}
                    onChange={(e) => handleInputChange('custom_protein_target', e.target.value)}
                    min="10"
                    max="1000"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '12px' }}>Carbs (g)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g. 250"
                    value={formData.custom_carbs_target}
                    onChange={(e) => handleInputChange('custom_carbs_target', e.target.value)}
                    min="10"
                    max="2000"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '12px' }}>Fat (g)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g. 70"
                    value={formData.custom_fat_target}
                    onChange={(e) => handleInputChange('custom_fat_target', e.target.value)}
                    min="10"
                    max="1000"
                  />
                </div>
              </div>
            )}
          </div>

          <p style={{ fontSize: '13px', color: 'var(--color-slate)', lineHeight: '1.4', padding: '0 8px' }}>
            Setting custom targets overrides default Mifflin-St Jeor calculations for those specific parameters.
          </p>
        </div>

        {/* Right Side: Profile metrics edit form */}
        <div className="profile-card">
          <h3>Body Metrics & Goals</h3>
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Alex Smith"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="input-group">
                <label className="input-label">Age</label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g. 28"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  min="1"
                  max="120"
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Biological Sex</label>
                <select
                  className="input"
                  value={formData.sex}
                  onChange={(e) => handleInputChange('sex', e.target.value)}
                  required
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label className="input-label">Height (cm)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g. 175"
                  value={formData.height_cm}
                  onChange={(e) => handleInputChange('height_cm', e.target.value)}
                  min="30"
                  max="300"
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Weight (kg)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g. 72.5"
                  value={formData.weight_kg}
                  onChange={(e) => handleInputChange('weight_kg', e.target.value)}
                  min="10"
                  max="500"
                  step="0.1"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label className="input-label">Goal</label>
                <select
                  className="input"
                  value={formData.goal}
                  onChange={(e) => handleInputChange('goal', e.target.value)}
                  required
                >
                  <option value="lose">Lose Weight</option>
                  <option value="maintain">Maintain Weight</option>
                  <option value="gain">Gain Muscle</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Activity Level</label>
                <select
                  className="input"
                  value={formData.activity_level}
                  onChange={(e) => handleInputChange('activity_level', e.target.value)}
                  required
                >
                  <option value="sedentary">Sedentary (desk job)</option>
                  <option value="light">Lightly Active</option>
                  <option value="moderate">Moderately Active</option>
                  <option value="active">Very Active</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Dietary Preferences</label>
              <div className="multiselect-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {['vegan', 'keto', 'halal', 'vegetarian', 'paleo'].map((pref) => {
                  const active = formData.dietary_preferences.includes(pref);
                  return (
                    <div
                      key={pref}
                      className={`checkbox-tile ${active ? 'active' : ''}`}
                      onClick={() => handleTogglePreference('dietary_preferences', pref)}
                      style={{ padding: '8px 12px', fontSize: '14px' }}
                    >
                      <input type="checkbox" checked={active} readOnly />
                      <span>{pref.charAt(0).toUpperCase() + pref.slice(1)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Allergies / Exclusions</label>
              <div className="multiselect-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {['nuts', 'dairy', 'gluten', 'soy', 'shellfish'].map((allergy) => {
                  const active = formData.allergies.includes(allergy);
                  return (
                    <div
                      key={allergy}
                      className={`checkbox-tile ${active ? 'active' : ''}`}
                      onClick={() => handleTogglePreference('allergies', allergy)}
                      style={{ padding: '8px 12px', fontSize: '14px' }}
                    >
                      <input type="checkbox" checked={active} readOnly />
                      <span>{allergy.charAt(0).toUpperCase() + allergy.slice(1)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile Settings'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
