"""
Caloriq — FastAPI application factory.

The main entry point for the backend server.
Run with: uvicorn app.main:app --reload

BACKEND ARCHITECTURE & FLOW:
This FastAPI backend follows a layered architecture to separate concerns:
1. Entry Point (`main.py`): Initializes the app, configures CORS, handles startup events (like DB creation/seeding), and registers all the routers.
2. Routers (`app/routers/`): Define the HTTP endpoints (e.g., `/api/coach/chat`). They receive requests, perform basic validation, and pass data to the Services layer.
3. Services (`app/services/`): Contain the core business logic. They interact with external APIs (like Gemini for the AI coach) and orchestrate database operations.
4. Models (`app/models/`): Define the SQLAlchemy database schema (the shape of the data in PostgreSQL/SQLite).
5. Schemas (`app/schemas/`): Define Pydantic models for data validation and serialization (request/response shapes).

When a request comes in (e.g., sending a chat message to the coach), it flows like this:
HTTP Request -> Router (`app/routers/coach.py`) -> Service (`app/services/coach_service.py`) -> LangChain/Gemini AI (`app/coach/chain.py`) -> DB operations -> HTTP Response.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine
from app.routers import auth, meals, profiles, weights, dashboard, coach, challenges

settings = get_settings()

# ── Logging ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("caloriq")



# ── Lifespan: create tables on startup ───────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables (for SQLite dev; in production use Alembic migrations)
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables created")
    
    # ── Seed Default Challenges ──────────────────────────────
    from app.database import SessionLocal
    from app.models.challenge import Challenge, ChallengeType
    import uuid
    from datetime import datetime, timezone

    db = SessionLocal()
    try:
        existing_challenges = db.query(Challenge).count()
        if existing_challenges == 0:
            default_challenges = [
                Challenge(
                    id=str(uuid.uuid4()),
                    name="Hydration Hero",
                    description="Log at least 8 glasses of water a day.",
                    type=ChallengeType.TARGET,
                    target_value=8.0,
                    reward_points=50,
                    duration_days=1,
                    created_at=datetime.now(timezone.utc)
                ),
                Challenge(
                    id=str(uuid.uuid4()),
                    name="Calorie Deficit",
                    description="Stay under your daily calorie goal.",
                    type=ChallengeType.LIMIT,
                    target_value=2000.0,
                    reward_points=100,
                    duration_days=1,
                    created_at=datetime.now(timezone.utc)
                ),
                Challenge(
                    id=str(uuid.uuid4()),
                    name="3-Day Streak",
                    description="Log your meals for 3 consecutive days.",
                    type=ChallengeType.STREAK,
                    target_value=3.0,
                    reward_points=200,
                    duration_days=3,
                    created_at=datetime.now(timezone.utc)
                )
            ]
            db.add_all(default_challenges)
            db.commit()
            logger.info("✅ Seeded default challenges")
    except Exception as e:
        logger.error(f"Failed to seed challenges: {e}")
    finally:
        db.close()

    logger.info("🚀 Caloriq API v%s is running", settings.APP_VERSION)

    yield
    logger.info("👋 Caloriq shutting down")


# ── App factory ──────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered nutrition tracking API. Log meals via photo, text, or barcode.",
    lifespan=lifespan,
)

# ── CORS configuration ───────────────────────────────────
if settings.DEBUG:
    # In development/debug mode, allow any origin (e.g. localhost, local IP, public IP)
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# ── Register routers ────────────────────────────────────
app.include_router(auth.router)
app.include_router(meals.router)
app.include_router(profiles.router)
app.include_router(weights.router)
app.include_router(dashboard.router)
app.include_router(coach.router)
app.include_router(challenges.router)


# ── Health check ─────────────────────────────────────────
@app.get("/health", tags=["system"])
def health_check():
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "service": settings.APP_NAME,
    }
