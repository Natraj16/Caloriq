# Caloriq — AI-Powered Nutrition Tracking SaaS

Caloriq is a shift-ready, modern SaaS application designed to eliminate manual food entry. Instead of spending minutes selecting ingredients, users can log meals in seconds using three frictionless methods: typing a natural description, uploading a food photo, or scanning a barcode.

The centerpiece of Caloriq is an optimized **4-Tier Cost-Control AI Pipeline** that reduces API token costs by ~90%, making it cost-defensible at scale.
 
---

## ⚡ Core Technical Features

### 1. The 4-Tier Nutrition Pipeline
Every natural language query and photo upload passes through an intelligent fallback ladder:
1. **Redis/In-Memory Cache:** Checks if the normalized query hash has been seen. (Latency: `~3ms`, Cost: `$0.00`)
2. **Internal Database Lookup:** Checks if the food description matches any previously resolved item across all users. (Latency: `~5ms`, Cost: `$0.00`)
3. **USDA FoodData Central API:** Looks up the item in the free public database for raw ingredients. (Latency: `~200ms`, Cost: `$0.00`)
4. **Gemini 2.5 Flash:** Calls the multimodal LLM to perform vision or structured text parsing only as a last resort. (Latency: `~1.2s`, Cost: `$0.10 - $0.30` per call)

*A 90% cache hit rate reduces typical AI costs for 100k active users logging 2 meals/day from **$18,000/month** down to **$1,800/month**.*

### 2. Frictionless Input Channels
* **Natural Language:** Interpretation of phrases like *"I had 2 scrambled eggs, whole wheat toast, and a glass of milk."*
* **Food Photos (Vision):** Analysis of food photo uploads using Gemini's visual intelligence to deduce macros.
* **Barcodes (Open Food Facts):** Direct barcode lookups bypass the AI pipeline entirely to return 100% accurate packaged product metrics.

### 3. Smart Portion Selector & Recalculator
* **Dynamic Portion Parsing:** Parses raw food serving strings (e.g. `2 slices (50g)`) and generates options automatically (e.g. `1 slice (25g)`, `1 serving (50g)`, `100g`, `1g`).
* **Instant Macro Recalculation:** Changing the quantity updates the calories and macros in real-time without requiring the user to do any math.
* **Zero Manual Effort:** Logging is simplified to choosing a serving size option from a dropdown and setting a multiplier.

### 4. "Gleap" Editorial Design System
* Warm cream, magazine-spread layout using **Playfair Display** display serifs paired with clean **Inter** functional typography.
* Full **Dark Mode / Light Mode** theme toggle with persistent `localStorage` memory.
* Responsive layouts tailored for desktop and mobile viewport sizes.

### 5. Personalization & Dashboard (Phase 2)
* **Body Metrics Onboarding:** Multi-step onboarding collecting age, height, weight, activity levels, allergies, and goals.
* **Auto-Macro Budgets:** Automatic calorie and macro requirements calculator using the Mifflin-St Jeor equation.
* **Custom Target Overrides:** Ability to individually override calculated values for Calories, Protein, Carbs, or Fat to suit unique dietary plans.
* **Aggregated Dashboard:** Visual breakdown of daily remaining macros and metrics.

### 6. Context-Aware AI Coach — Coach Grit (Phase 3)
* **Conversational Chat Panel:** A floating chat widget powered by Gemini that answers dietary questions grounded in the user's real-time context — profile, allergy restrictions, macro targets, and last 20 meal logs.
* **Function Calling (Tool Use):** Coach Grit can actively perform actions in the app, not just give advice:
  * **Log Weight:** *"Log my weight as 78kg"* → inserts a `WeightLog` row and updates the profile.
  * **Update Targets:** *"Change my calorie target to 2200"* → writes `custom_calorie_target` and runs the full Mifflin-St Jeor recalculation pipeline to derive consistent protein, carbs, and fat targets.
* **Real-Time Data Sync:** After any tool action, the coach broadcasts a `caloriq:data-changed` browser event. The Dashboard, Analytics, and Profile pages listen and re-fetch instantly — no page navigation required.
* **Automatic Function Calling Disabled:** Manual tool-call handling loop ensures real DB writes happen (vs. the SDK silently calling the stub and doing nothing).
* **Dual Model Configuration:** Food analysis uses `gemini-2.5-flash`; Coach chat uses a separately configurable `GEMINI_COACH_MODEL` (defaults to `gemini-2.0-flash`) to keep free-tier quotas from clashing.

---

## 🛠️ Project Architecture

```
caloriq/
├── backend/
│   ├── app/
│   │   ├── main.py              # Application factory, middleware & health status
│   │   ├── config.py            # Pydantic-settings config loading (.env)
│   │   ├── database.py          # Database setup (SQLite for dev, PostgreSQL ready)
│   │   ├── cache.py             # Caching wrappers (Redis or in-memory fallback)
│   │   ├── models/              # SQLAlchemy Database Models (User, MealLog, WeightLog)
│   │   ├── schemas/             # Pydantic validation schemas (incl. CoachChatResponse)
│   │   ├── routers/             # API Router endpoints (Auth, Meals, Coach, Dashboard)
│   │   ├── services/            # Pipeline clients (USDA, Gemini AI, Coach Service)
│   │   └── utils/               # Shared utilities (targets.py — Mifflin-St Jeor calculator)
│   ├── alembic/                 # Alembic DB Migration version tracker
│   └── requirements.txt         # Pip dependency manifest
└── frontend/
    ├── src/
    │   ├── components/          # Shared components (Navbar, ChatWidget)
    │   ├── context/             # React Context Hooks (AuthContext, ThemeContext)
    │   ├── pages/               # Route screens (Dashboard, Analytics, Profile, MealLog)
    │   ├── services/            # Axios interceptor clients (API calls)
    │   └── index.css            # Global CSS tokens & "Gleap" theme overrides
    ├── index.html
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites
* Python 3.10+
* Node.js 18+

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file from the example template:
   ```bash
   copy .env.example .env
   ```
5. Populate your `.env` keys:
   * `SECRET_KEY`: Set this to a secure random string.
   * `GEMINI_API_KEY`: Get your free key from [Google AI Studio](https://aistudio.google.com/apikey).
   * `GEMINI_MODEL`: Model used for food analysis (default: `gemini-2.5-flash`).
   * `GEMINI_COACH_MODEL`: Model used for Coach Grit chat (default: `gemini-2.0-flash`).
   * `USDA_API_KEY`: *(Optional)* Get your key from [USDA FoodData Central](https://fdc.nal.usda.gov/api-key-signup).
6. Spin up the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   * *API will be live at http://localhost:8000*
   * *Swagger API Documentation: http://localhost:8000/docs*

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Boot the Vite development server:
   ```bash
   npm run dev
   ```
   * *App will be live at http://localhost:5173*

---

## 🔮 Upcoming Project Phases

### 🏆 Phase 4 — Gamified Challenges & Weekly Digests
* Interactive challenges (e.g., "Sugar Limit", "Protein Target Booster", "Hydration Builder").
* Weekly emails (via Resend) summing up nutritional trends, weight metrics, and streak statuses.

### 💳 Phase 5 — API Keys & Subscriptions
* Public API key generation (B2B usage keys, rate limit, usage meters).
* Payment processing using Dodo Payments for Pro subscription upgrades.

### 🧪 Phase 6 — Hardening
* Unit testing for pipeline lookup fallbacks and token validation using pytest.
* Locust load testing to ensure concurrency compliance.
