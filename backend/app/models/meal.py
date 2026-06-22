"""
Caloriq — MealLog and WeightLog SQLAlchemy models.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Float, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _generate_uuid() -> str:
    return str(uuid.uuid4())


class MealLog(Base):
    __tablename__ = "meal_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_generate_uuid
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    logged_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, index=True
    )

    # ── Meal details ─────────────────────────────────────
    meal_type: Mapped[str] = mapped_column(
        String(20), nullable=False  # breakfast | lunch | dinner | snack
    )
    food_name: Mapped[str] = mapped_column(String(255), nullable=False)
    calories: Mapped[float] = mapped_column(Float, nullable=False)
    protein_g: Mapped[float] = mapped_column(Float, nullable=False)
    carbs_g: Mapped[float] = mapped_column(Float, nullable=False)
    fat_g: Mapped[float] = mapped_column(Float, nullable=False)
    serving_size: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # ── Input tracking ───────────────────────────────────
    input_method: Mapped[str] = mapped_column(
        String(20), nullable=False  # photo | text | barcode
    )
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_input: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Pipeline metadata (for the tier indicator in UI) ─
    pipeline_tier: Mapped[str | None] = mapped_column(
        String(20), nullable=True  # cache | db | usda | gemini
    )
    analysis_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # ── Relationships ────────────────────────────────────
    user: Mapped["User"] = relationship(back_populates="meals")

    def __repr__(self) -> str:
        return f"<MealLog {self.food_name} ({self.calories} kcal)>"


class WeightLog(Base):
    __tablename__ = "weight_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_generate_uuid
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    logged_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)

    def __repr__(self) -> str:
        return f"<WeightLog {self.weight_kg}kg>"


# Import User to resolve forward reference
from app.models.user import User  # noqa: E402, F401
