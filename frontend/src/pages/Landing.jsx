/**
 * Caloriq — Landing page.
 * The first thing users see — must wow immediately.
 */

import { Link } from 'react-router-dom';
import { Camera, MessageSquareText, ScanBarcode, Zap, Shield, Brain, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Landing.css';

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="landing">
      {/* ── Hero ──────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-content animate-fade-in">
          <div className="tag-pill">
            <Zap size={14} />
            AI-Powered Nutrition Tracking
          </div>
          <h1 className="hero-title">
            Track your nutrition<br />
            <span className="text-gradient">in under 30 seconds</span>
          </h1>
          <p className="hero-subtitle">
            Snap a photo, type what you ate, or scan a barcode.
            Caloriq's AI handles the rest — no manual entry, no guesswork.
          </p>
          <div className="hero-cta">
            {isAuthenticated ? (
              <Link to="/log" className="btn btn-accent btn-lg">
                Log a Meal <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">
                  Start Tracking Free <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="btn btn-ghost btn-lg">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Input Methods ─────────────────────────────── */}
      <section className="features">
        <h2 className="section-title">Three ways to log, <span className="text-gradient">zero friction</span></h2>
        <div className="features-grid">
          <div className="feature-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="feature-icon icon-photo">
              <Camera size={28} />
            </div>
            <h3>Snap a Photo</h3>
            <p>Point your camera at any meal. Our vision AI identifies the food and estimates calories and macros instantly.</p>
          </div>
          <div className="feature-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="feature-icon icon-text">
              <MessageSquareText size={28} />
            </div>
            <h3>Type Naturally</h3>
            <p>"I had 2 eggs and toast with butter" — just describe what you ate in plain English. The AI parses it automatically.</p>
          </div>
          <div className="feature-card animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="feature-icon icon-barcode">
              <ScanBarcode size={28} />
            </div>
            <h3>Scan a Barcode</h3>
            <p>For packaged foods, scan the barcode for instant, 100% accurate nutrition data. No AI needed — zero cost.</p>
          </div>
        </div>
      </section>

      {/* ── Features & Benefits Section ────────────────── */}
      <section className="benefits-section">
        <h2 className="section-title">Designed for your <span className="text-gradient">wellness journey</span></h2>
        <p className="section-subtitle">Caloriq goes beyond simple logging to provide smart, context-aware nutrition insights.</p>
        
        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-icon">
              <Brain size={24} />
            </div>
            <h3>Personalized AI Coach</h3>
            <p>
              Chat with a dedicated nutrition coach that understands your daily targets, 
              recent eating habits, and allergies. Receive actual personalized advice, not generic tips.
            </p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <Shield size={24} />
            </div>
            <h3>Macro Customization</h3>
            <p>
              Auto-calculate or customize calorie and macronutrient budgets based on your unique body 
              metrics, dietary preferences, and fitness goals.
            </p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">
              <Zap size={24} />
            </div>
            <h3>Intelligent Analytics</h3>
            <p>
              Track your weight trend, view historical logs, watch macro breakdowns, 
              and build a consistent tracking habit with gamified streaks.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <p className="footer-brand">
            <Zap size={14} /> Caloriq — AI-powered nutrition tracking
          </p>
          <p className="footer-copy">Built with FastAPI, React, and Gemini 2.5 Flash</p>
        </div>
      </footer>
    </div>
  );
}
