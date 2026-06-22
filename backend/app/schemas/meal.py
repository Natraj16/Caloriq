"""
Caloriq — Pydantic schemas for meal logging and nutrition analysis.
"""

from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


# ── Enums ────────────────────────────────────────────────
class MealType(str, Enum):
    breakfast = "breakfast"
    lunch = "lunch"
    dinner = "dinner"
    snack = "snack"


class InputMethod(str, Enum):
    photo = "photo"
    text = "text"
    barcode = "barcode"


class PipelineTier(str, Enum):
    cache = "cache"
    db = "db"
    usda = "usda"
    gemini = "gemini"
    barcode_api = "barcode_api"


# ── Nutrition analysis result (shared output format) ─────
class NutritionResult(BaseModel):
    """Unified output from all pipeline tiers."""
    food_name: str
    calories: float = Field(..., ge=0)
    protein_g: float = Field(..., ge=0)
    carbs_g: float = Field(..., ge=0)
    fat_g: float = Field(..., ge=0)
    serving_size: str | None = None
    confidence_score: float = Field(default=1.0, ge=0, le=1)
    pipeline_tier: PipelineTier
    analysis_time_ms: int = 0


# ── Meal logging requests ───────────────────────────────
class MealLogTextRequest(BaseModel):
    text: str = Field(..., min_length=2, max_length=500, examples=["I had 2 eggs and toast"])
    meal_type: MealType = MealType.snack


class MealLogBarcodeRequest(BaseModel):
    barcode: str = Field(..., min_length=4, max_length=20, examples=["5060292302201"])
    meal_type: MealType = MealType.snack


class MealLogPhotoRequest(BaseModel):
    """Photo is sent as multipart form data; this schema is for the metadata."""
    meal_type: MealType = MealType.snack


# ── Meal log response ───────────────────────────────────
class MealLogResponse(BaseModel):
    id: str
    user_id: str
    logged_at: datetime
    meal_type: str
    food_name: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    serving_size: str | None
    input_method: str
    image_url: str | None
    raw_input: str | None
    pipeline_tier: str | None
    analysis_time_ms: int | None
    confidence_score: float | None

    model_config = {"from_attributes": True}


# ── Meal log save request ────────────────────────────────
class MealLogSaveRequest(BaseModel):
    meal_type: MealType
    food_name: str
    calories: float = Field(..., ge=0)
    protein_g: float = Field(..., ge=0)
    carbs_g: float = Field(..., ge=0)
    fat_g: float = Field(..., ge=0)
    serving_size: str | None = None
    input_method: InputMethod
    raw_input: str | None = None
    image_url: str | None = None
    pipeline_tier: PipelineTier
    analysis_time_ms: int = 0
    confidence_score: float = Field(default=1.0, ge=0, le=1)


# ── Paginated meal list ──────────────────────────────────
class MealListResponse(BaseModel):
    meals: list[MealLogResponse]
    total: int
    page: int
    page_size: int
    has_next: bool
