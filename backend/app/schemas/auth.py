"""
Caloriq — Pydantic schemas for auth endpoints.
"""

from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


# ── Registration ─────────────────────────────────────────
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ── Token responses ──────────────────────────────────────
class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


# ── User response ────────────────────────────────────────
class UserResponse(BaseModel):
    id: str
    email: str
    verified: bool
    subscription_tier: str
    created_at: datetime
    has_profile: bool = False

    model_config = {"from_attributes": True}
