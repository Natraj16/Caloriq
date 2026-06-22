"""
Caloriq — User and UserProfile SQLAlchemy models.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    String, Boolean, DateTime, Integer, Float, ForeignKey, Text, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_generate_uuid
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[str | None] = mapped_column(
        String(255), nullable=True  # Nullable for Google OAuth users
    )
    google_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True, index=True
    )
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    subscription_tier: Mapped[str] = mapped_column(
        String(20), default="free"  # free | pro
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )

    # ── Relationships ────────────────────────────────────
    profile: Mapped["UserProfile"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    meals: Mapped[list["MealLog"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User {self.email}>"


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_generate_uuid
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"),
        unique=True, nullable=False
    )

    # ── Body metrics ─────────────────────────────────────
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sex: Mapped[str | None] = mapped_column(String(10), nullable=True)  # male | female | other
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)

    # ── Goals & preferences ──────────────────────────────
    goal: Mapped[str | None] = mapped_column(
        String(20), nullable=True  # lose | maintain | gain
    )
    activity_level: Mapped[str | None] = mapped_column(
        String(20), nullable=True  # sedentary | light | moderate | active | very_active
    )
    dietary_preferences: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, default=list  # ["vegan", "keto", "halal", ...]
    )
    allergies: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, default=list  # ["nuts", "dairy", "gluten", ...]
    )

    # ── Calculated targets ───────────────────────────────
    daily_calorie_target: Mapped[int | None] = mapped_column(Integer, nullable=True)
    daily_protein_target: Mapped[int | None] = mapped_column(Integer, nullable=True)
    daily_carbs_target: Mapped[int | None] = mapped_column(Integer, nullable=True)
    daily_fat_target: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # ── Settings ─────────────────────────────────────────
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")

    # ── Relationships ────────────────────────────────────
    user: Mapped["User"] = relationship(back_populates="profile")

    def __repr__(self) -> str:
        return f"<UserProfile user_id={self.user_id}>"


# Avoid circular imports — MealLog is imported via models.__init__
from app.models.meal import MealLog  # noqa: E402, F401
