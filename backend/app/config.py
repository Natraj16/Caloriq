"""
Caloriq — Application settings via pydantic-settings.

DATABASE_URL defaults to SQLite for local dev.
Set DATABASE_URL=postgresql+asyncpg://... in production.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────
    APP_NAME: str = "Caloriq"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    # ── Database (SQLite default → PostgreSQL in prod) ──
    DATABASE_URL: str = "sqlite:///./caloriq.db"

    # ── Redis (optional — leave empty to use in-memory fallback) ──
    REDIS_URL: str = ""

    # ── Auth / JWT ───────────────────────────────────────
    SECRET_KEY: str = "CHANGE-ME-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Gemini AI ────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"         # Used for food analysis
    GEMINI_COACH_MODEL: str = "gemini-2.0-flash"   # Used for coach chat (higher free quota)

    # ── External APIs ────────────────────────────────────
    USDA_API_KEY: str = ""  # Free key from https://fdc.nal.usda.gov/api-key-signup
    OPEN_FOOD_FACTS_BASE_URL: str = "https://world.openfoodfacts.org/api/v2"

    # ── Cache TTL (seconds) ──────────────────────────────
    FOOD_CACHE_TTL: int = 86400  # 24 hours
    COACH_CONTEXT_TTL: int = 900  # 15 minutes

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
