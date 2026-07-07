import { useState, useEffect } from 'react';
import './Calculator.css';

export default function Calculator() {
  const [unit, setUnit] = useState('metric'); // 'metric' or 'imperial'
  const [weight, setWeight] = useState('');
  const [heightValue1, setHeightValue1] = useState(''); // cm or feet
  const [heightValue2, setHeightValue2] = useState(''); // empty or inches
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  
  const [activeTab, setActiveTab] = useState('bmi');
  const [bmi, setBmi] = useState(null);
  const [bmiCategory, setBmiCategory] = useState('');
  const [bmr, setBmr] = useState(null);

  const calculateBMI = (e) => {
    e.preventDefault();
    let calculatedBmi = 0;
    let weightKg = 0;
    let heightCm = 0;

    if (unit === 'metric') {
      heightCm = parseFloat(heightValue1);
      weightKg = parseFloat(weight);
      if (heightCm > 0 && weightKg > 0) {
        calculatedBmi = weightKg / ((heightCm / 100) * (heightCm / 100));
      }
    } else {
      const feet = parseFloat(heightValue1) || 0;
      const inches = parseFloat(heightValue2) || 0;
      const totalInches = (feet * 12) + inches;
      const wLbs = parseFloat(weight);
      if (totalInches > 0 && wLbs > 0) {
        calculatedBmi = (wLbs / (totalInches * totalInches)) * 703;
      }
    }

    if (calculatedBmi > 0) {
      setBmi(calculatedBmi.toFixed(1));
      if (calculatedBmi < 18.5) setBmiCategory('Underweight');
      else if (calculatedBmi < 25) setBmiCategory('Normal Weight');
      else if (calculatedBmi < 30) setBmiCategory('Overweight');
      else setBmiCategory('Obese');
    }
  };

  const calculateBMR = (e) => {
    e.preventDefault();
    let weightKg = 0;
    let heightCm = 0;

    if (unit === 'metric') {
      heightCm = parseFloat(heightValue1);
      weightKg = parseFloat(weight);
    } else {
      const feet = parseFloat(heightValue1) || 0;
      const inches = parseFloat(heightValue2) || 0;
      const totalInches = (feet * 12) + inches;
      const wLbs = parseFloat(weight);
      if (totalInches > 0 && wLbs > 0) {
        weightKg = wLbs * 0.453592;
        heightCm = totalInches * 2.54;
      }
    }

    const a = parseFloat(age);
    if (weightKg > 0 && heightCm > 0 && a > 0) {
      let calculatedBmr = (10 * weightKg) + (6.25 * heightCm) - (5 * a);
      calculatedBmr += (gender === 'male' ? 5 : -161);
      setBmr(Math.round(calculatedBmr));
    }
  };

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const describeArc = (x, y, radius, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", start.x, start.y, 
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  };

  const getNeedleRotation = () => {
    if (!bmi) return -90;
    const value = parseFloat(bmi);
    const clamped = Math.max(15, Math.min(40, value));
    const percentage = (clamped - 15) / 25;
    return -90 + (percentage * 180);
  };

  // Calculate angles for the 4 segments (-90 to 90)
  const angle18_5 = -90 + ((18.5 - 15) / 25) * 180; 
  const angle25 = -90 + ((25 - 15) / 25) * 180;     
  const angle30 = -90 + ((30 - 15) / 25) * 180;     

  return (
    <div className="page">
      <div className="page-content bmi-container">
        <div className="card bmi-card animate-slide-up">
          <h1 className="editorial-title bmi-title">Calculator</h1>
          <p className="bmi-subtitle">Calculate your Body Mass Index & Basal Metabolic Rate</p>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', background: 'var(--color-bone)', padding: '6px', borderRadius: '12px' }}>
            <button 
              type="button"
              style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: activeTab === 'bmi' ? 'var(--color-paper)' : 'transparent', boxShadow: activeTab === 'bmi' ? 'var(--shadow-sm)' : 'none', color: activeTab === 'bmi' ? 'var(--color-obsidian)' : 'var(--color-slate)', fontWeight: activeTab === 'bmi' ? '600' : '500', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
              onClick={() => { setActiveTab('bmi'); setBmi(null); setBmr(null); }}
            >
              BMI
            </button>
            <button 
              type="button"
              style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: activeTab === 'bmr' ? 'var(--color-paper)' : 'transparent', boxShadow: activeTab === 'bmr' ? 'var(--shadow-sm)' : 'none', color: activeTab === 'bmr' ? 'var(--color-obsidian)' : 'var(--color-slate)', fontWeight: activeTab === 'bmr' ? '600' : '500', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
              onClick={() => { setActiveTab('bmr'); setBmi(null); setBmr(null); }}
            >
              BMR
            </button>
          </div>

          {activeTab === 'bmi' && bmi && (
            <div className="bmi-result-section animate-fade-in" style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid var(--color-silver)' }}>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--color-slate)' }}>
                Your BMI: <span className="bmi-value text-gradient">{bmi}</span>
              </h2>
              <p className="bmi-category">Result: <strong style={{ color: 'var(--color-obsidian)' }}>{bmiCategory}</strong></p>
              
              <div className="bmi-meter-container" style={{ marginTop: '40px' }}>
                <svg className="bmi-meter" viewBox="0 0 200 110" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.05))' }}>
                  {/* Background Track */}
                  <path d={describeArc(100, 100, 80, -90, 90)} fill="none" stroke="var(--color-bone)" strokeWidth="16" strokeLinecap="round" />
                  
                  {/* Colored Segments (with 2 degree gaps for styling) */}
                  <path d={describeArc(100, 100, 80, -90, angle18_5 - 1.5)} fill="none" stroke="var(--color-info)" strokeWidth="16" strokeLinecap="round" />
                  <path d={describeArc(100, 100, 80, angle18_5 + 1.5, angle25 - 1.5)} fill="none" stroke="var(--color-success)" strokeWidth="16" strokeLinecap="round" />
                  <path d={describeArc(100, 100, 80, angle25 + 1.5, angle30 - 1.5)} fill="none" stroke="var(--color-warning)" strokeWidth="16" strokeLinecap="round" />
                  <path d={describeArc(100, 100, 80, angle30 + 1.5, 90)} fill="none" stroke="var(--color-error)" strokeWidth="16" strokeLinecap="round" />
                  
                  {/* Tick Marks */}
                  <line x1="100" y1="18" x2="100" y2="22" stroke="var(--color-obsidian)" strokeWidth="2" opacity="0.3" transform={`rotate(${angle18_5} 100 100)`} />
                  <line x1="100" y1="18" x2="100" y2="22" stroke="var(--color-obsidian)" strokeWidth="2" opacity="0.3" transform={`rotate(${angle25} 100 100)`} />
                  <line x1="100" y1="18" x2="100" y2="22" stroke="var(--color-obsidian)" strokeWidth="2" opacity="0.3" transform={`rotate(${angle30} 100 100)`} />

                  {/* Sleek Needle */}
                  <g 
                    className="needle" 
                    style={{ transform: `translate(100px, 100px) rotate(${getNeedleRotation()}deg)` }}
                  >
                    <path d="M -4,0 L 4,0 L 1,-75 L -1,-75 Z" fill="var(--color-obsidian)" />
                    <circle cx="0" cy="0" r="8" fill="var(--color-paper)" stroke="var(--color-obsidian)" strokeWidth="3" />
                  </g>
                </svg>
                <div className="meter-labels" style={{ marginTop: '15px' }}>
                  <span style={{ color: 'var(--color-info)' }}>Under</span>
                  <span style={{ color: 'var(--color-success)' }}>Normal</span>
                  <span style={{ color: 'var(--color-warning)' }}>Over</span>
                  <span style={{ color: 'var(--color-error)' }}>Obese</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bmr' && bmr && (
            <div className="bmi-result-section animate-fade-in" style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid var(--color-silver)', textAlign: 'center' }}>
              <h3 style={{ fontSize: '18px', color: 'var(--color-slate)', marginBottom: '8px' }}>Basal Metabolic Rate (BMR)</h3>
              <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--color-obsidian)' }}>
                {bmr} <span style={{ fontSize: '16px', color: 'var(--color-slate)', fontWeight: '500' }}>kcal / day</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-slate)', marginTop: '8px' }}>
                Calories your body burns at rest.
              </p>
            </div>
          )}

          <form className="bmi-form" onSubmit={activeTab === 'bmi' ? calculateBMI : calculateBMR}>
            <div className="form-group toggle-group">
              <button
                type="button"
                className={`btn ${unit === 'metric' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setUnit('metric')}
              >
                Metric (kg/cm)
              </button>
              <button
                type="button"
                className={`btn ${unit === 'imperial' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setUnit('imperial')}
              >
                Imperial (lbs/ft)
              </button>
            </div>

            <div className="input-group" style={{ marginBottom: '16px' }}>
              <label className="input-label">Weight ({unit === 'metric' ? 'kg' : 'lbs'})</label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="input"
                placeholder={`e.g. ${unit === 'metric' ? '70' : '150'}`}
                required
              />
            </div>

            {unit === 'metric' ? (
              <div className="input-group" style={{ marginBottom: '24px' }}>
                <label className="input-label">Height (cm)</label>
                <input
                  type="number"
                  value={heightValue1}
                  onChange={(e) => setHeightValue1(e.target.value)}
                  className="input"
                  placeholder="e.g. 175"
                  required
                />
              </div>
            ) : (
              <div className="form-row" style={{ marginBottom: '24px' }}>
                <div className="input-group half">
                  <label className="input-label">Height (ft)</label>
                  <input
                    type="number"
                    value={heightValue1}
                    onChange={(e) => setHeightValue1(e.target.value)}
                    className="input"
                    placeholder="e.g. 5"
                    required
                  />
                </div>
                <div className="input-group half">
                  <label className="input-label">Height (in)</label>
                  <input
                    type="number"
                    value={heightValue2}
                    onChange={(e) => setHeightValue2(e.target.value)}
                    className="input"
                    placeholder="e.g. 9"
                    required
                  />
                </div>
              </div>
            )}

            {activeTab === 'bmr' && (
              <div className="form-row" style={{ marginBottom: '24px' }}>
                <div className="input-group half">
                  <label className="input-label">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="input"
                    placeholder="e.g. 30"
                    required
                  />
                </div>
                <div className="input-group half">
                  <label className="input-label">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="input"
                    style={{ height: '46px' }}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Calculate {activeTab === 'bmi' ? 'BMI' : 'BMR'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
