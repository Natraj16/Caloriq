"""
Caloriq — FastAPI application factory.

The main entry point for the backend server.
Run with: uvicorn app.main:app --reload
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine
from app.routers import auth, meals

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


# ── Health check ─────────────────────────────────────────
@app.get("/health", tags=["system"])
def health_check():
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "service": settings.APP_NAME,
    }
