import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Challenges.css';

const Challenges = () => {
  const [challenges, setChallenges] = useState([]);
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const response = await api.get('/api/challenges');
      setChallenges(response.data.challenges);
      setActiveChallenges(response.data.active_user_challenges);
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptIn = async (challengeId) => {
    try {
      await api.post('/api/challenges/opt-in', { challenge_id: challengeId });
      fetchChallenges(); // Refresh the lists
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to opt in');
    }
  };

  const handleOptOut = async (challengeId) => {
    if (!window.confirm("Are you sure you want to abandon this challenge? All progress will be lost.")) return;
    try {
      await api.delete(`/api/challenges/opt-out/${challengeId}`);
      fetchChallenges(); // Refresh the lists
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to opt out');
    }
  };

  if (loading) {
    return <div className="challenges-page loading">Loading challenges...</div>;
  }

  const activeChallengeIds = activeChallenges.map(ac => ac.challenge_id);
  const availableChallenges = challenges.filter(c => !activeChallengeIds.includes(c.id));

  return (
    <div className="challenges-page">
      <header className="page-header">
        <h1>Challenges & Goals</h1>
        <p>Push yourself and earn points by completing nutritional challenges.</p>
      </header>

      <section className="challenges-section">
        <h2>Active Challenges</h2>
        {activeChallenges.length === 0 ? (
          <p className="empty-state">You have no active challenges. Opt in to one below!</p>
        ) : (
          <div className="challenge-grid">
            {activeChallenges.map((uc) => (
              <div key={uc.id} className="challenge-card active">
                <h3>{uc.challenge.name}</h3>
                <p>{uc.challenge.description}</p>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${Math.min(100, (uc.current_progress / uc.challenge.target_value) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">
                    {uc.current_progress} / {uc.challenge.target_value}
                  </span>
                </div>
                <div className="challenge-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span className="points">+{uc.challenge.reward_points} pts</span>
                    <span className="status">{uc.status}</span>
                  </div>
                  <button onClick={() => handleOptOut(uc.challenge.id)} className="btn btn-sm" style={{ background: 'transparent', border: '1px solid var(--color-error)', color: 'var(--color-error)', padding: '4px 10px', fontSize: '12px' }}>
                    Opt Out
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="challenges-section">
        <h2>Available Challenges</h2>
        {availableChallenges.length === 0 ? (
          <p className="empty-state">No new challenges available right now.</p>
        ) : (
          <div className="challenge-grid">
            {availableChallenges.map((challenge) => (
              <div key={challenge.id} className="challenge-card">
                <h3>{challenge.name}</h3>
                <p>{challenge.description}</p>
                <div className="challenge-footer">
                  <span className="points">+{challenge.reward_points} pts</span>
                  <button onClick={() => handleOptIn(challenge.id)} className="opt-in-btn">
                    Opt In
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Challenges;
