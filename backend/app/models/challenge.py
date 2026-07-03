"""
Caloriq — Challenge and UserChallenge SQLAlchemy models.
"""

from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.database import Base
from app.models.user import _generate_uuid, _utcnow


class ChallengeType(str, enum.Enum):
    LIMIT = "LIMIT"
    TARGET = "TARGET"
    STREAK = "STREAK"


class ChallengeStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Challenge(Base):
    __tablename__ = "challenges"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_generate_uuid
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    type: Mapped[ChallengeType] = mapped_column(Enum(ChallengeType), nullable=False)
    target_value: Mapped[float] = mapped_column(Float, nullable=False)
    reward_points: Mapped[int] = mapped_column(Integer, default=100)
    duration_days: Mapped[int] = mapped_column(Integer, default=7)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )

    user_challenges: Mapped[list["UserChallenge"]] = relationship(
        back_populates="challenge", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Challenge {self.name}>"


class UserChallenge(Base):
    __tablename__ = "user_challenges"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_generate_uuid
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("user_profiles.user_id", ondelete="CASCADE"), nullable=False
    )
    challenge_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False
    )
    start_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
    end_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    status: Mapped[ChallengeStatus] = mapped_column(
        Enum(ChallengeStatus), default=ChallengeStatus.ACTIVE
    )
    current_progress: Mapped[float] = mapped_column(Float, default=0.0)

    # ── Relationships ────────────────────────────────────
    profile: Mapped["UserProfile"] = relationship(back_populates="user_challenges")
    challenge: Mapped["Challenge"] = relationship(back_populates="user_challenges")

    def __repr__(self) -> str:
        return f"<UserChallenge user_id={self.user_id} status={self.status}>"
