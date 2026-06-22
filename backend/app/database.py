"""
Caloriq — SQLAlchemy database engine and session management.

Works with both SQLite (local dev) and PostgreSQL (production).
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import get_settings


settings = get_settings()

# ── Engine setup ─────────────────────────────────────────
# SQLite needs check_same_thread=False for FastAPI's async handling
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DEBUG,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Base class for all models ────────────────────────────
class Base(DeclarativeBase):
    pass


# ── Dependency for FastAPI routes ────────────────────────
def get_db():
    """Yield a database session, auto-close on request end."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
