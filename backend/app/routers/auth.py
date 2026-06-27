"""
Caloriq — Auth router.

Endpoints:
  POST /api/auth/register  — create account
  POST /api/auth/login     — get token pair
  POST /api/auth/refresh   — refresh access token
  GET  /api/auth/me        — get current user info
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    UserRegister, UserLogin, TokenPair, TokenRefresh, UserResponse,
)
from app.middleware.auth import (
    hash_password, verify_password, create_token_pair,
    decode_token, get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
def register(body: UserRegister, db: Session = Depends(get_db)):
    """Register a new user with email and password."""
    # Check if email already exists
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name or body.email.split("@")[0].capitalize(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return create_token_pair(user.id)


@router.post("/login", response_model=TokenPair)
def login(body: UserLogin, db: Session = Depends(get_db)):
    """Authenticate with email and password, get token pair."""
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return create_token_pair(user.id)


@router.post("/refresh", response_model=TokenPair)
def refresh(body: TokenRefresh, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a new token pair."""
    user_id = decode_token(body.refresh_token, expected_type="refresh")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return create_token_pair(user.id)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's info."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        verified=current_user.verified,
        subscription_tier=current_user.subscription_tier,
        created_at=current_user.created_at,
        has_profile=current_user.profile is not None,
        name=current_user.name,
    )
