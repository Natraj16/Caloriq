"""
Caloriq — Meal logging router.

Endpoints:
  POST /api/meals/text     — log meal from natural language
  POST /api/meals/barcode  — log meal from barcode scan
  POST /api/meals/photo    — log meal from food photo
  GET  /api/meals          — meal history with pagination
  GET  /api/meals/{id}     — get single meal
  DELETE /api/meals/{id}   — delete a meal
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.meal import MealLog
from app.schemas.meal import (
    MealLogTextRequest,
    MealLogBarcodeRequest,
    MealLogSaveRequest,
    MealLogResponse,
    MealListResponse,
    MealType,
    NutritionResult,
)
from app.services.nutrition_pipeline import analyze_text_input, analyze_photo_input
from app.services.barcode_client import lookup_barcode

router = APIRouter(prefix="/api/meals", tags=["meals"])


# ── POST /api/meals/analyze/text ─────────────────────────
@router.post("/analyze/text", response_model=NutritionResult)
async def analyze_meal_text(
    body: MealLogTextRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analyze a meal description and return nutrition estimates (does not save)."""
    result = await analyze_text_input(body.text, db)
    return result


# ── POST /api/meals/analyze/barcode ──────────────────────
@router.post("/analyze/barcode", response_model=NutritionResult)
async def analyze_meal_barcode(
    body: MealLogBarcodeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Look up barcode in Open Food Facts and return nutrition data (does not save)."""
    result = await lookup_barcode(body.barcode)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Barcode '{body.barcode}' not found in Open Food Facts.",
        )
    return result


# ── POST /api/meals/analyze/photo ────────────────────────
@router.post("/analyze/photo", response_model=NutritionResult)
async def analyze_meal_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analyze food photo and return nutrition estimates (does not save)."""
    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{file.content_type}' not supported. Use JPEG, PNG, or WebP.",
        )

    # Read image bytes (limit to 10MB)
    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image too large. Maximum size is 10MB.",
        )

    result = await analyze_photo_input(image_bytes, file.content_type, db)
    return result


# ── POST /api/meals ──────────────────────────────────────
@router.post("", response_model=MealLogResponse, status_code=status.HTTP_201_CREATED)
def log_meal(
    body: MealLogSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save the final customized meal log entry to the database."""
    meal = MealLog(
        user_id=current_user.id,
        meal_type=body.meal_type.value,
        food_name=body.food_name,
        calories=body.calories,
        protein_g=body.protein_g,
        carbs_g=body.carbs_g,
        fat_g=body.fat_g,
        serving_size=body.serving_size,
        input_method=body.input_method.value,
        raw_input=body.raw_input,
        image_url=body.image_url,
        pipeline_tier=body.pipeline_tier.value,
        analysis_time_ms=body.analysis_time_ms,
        confidence_score=body.confidence_score,
    )
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return meal


# ── GET /api/meals ───────────────────────────────────────
@router.get("", response_model=MealListResponse)
def list_meals(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    meal_type: Optional[MealType] = Query(None),
    date_from: Optional[str] = Query(None, description="ISO date, e.g. 2025-01-01"),
    date_to: Optional[str] = Query(None, description="ISO date, e.g. 2025-01-31"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get paginated meal history for the current user."""
    query = db.query(MealLog).filter(MealLog.user_id == current_user.id)

    # Apply filters
    if meal_type:
        query = query.filter(MealLog.meal_type == meal_type.value)
    if date_from:
        query = query.filter(MealLog.logged_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(MealLog.logged_at <= datetime.fromisoformat(date_to + "T23:59:59"))

    total = query.count()
    meals = (
        query
        .order_by(MealLog.logged_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return MealListResponse(
        meals=[MealLogResponse.model_validate(m) for m in meals],
        total=total,
        page=page,
        page_size=page_size,
        has_next=(page * page_size) < total,
    )


# ── GET /api/meals/{id} ─────────────────────────────────
@router.get("/{meal_id}", response_model=MealLogResponse)
def get_meal(
    meal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single meal by ID (must belong to current user)."""
    meal = (
        db.query(MealLog)
        .filter(MealLog.id == meal_id, MealLog.user_id == current_user.id)
        .first()
    )
    if not meal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal not found")
    return meal


# ── DELETE /api/meals/{id} ───────────────────────────────
@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal(
    meal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a meal (must belong to current user)."""
    meal = (
        db.query(MealLog)
        .filter(MealLog.id == meal_id, MealLog.user_id == current_user.id)
        .first()
    )
    if not meal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal not found")
    db.delete(meal)
    db.commit()
