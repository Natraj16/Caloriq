"""
Caloriq — 4-tier cost-control nutrition pipeline.

This is the core technical differentiator. All non-barcode inputs pass through
these tiers in order:

  1. Redis/in-memory cache  — identical query seen before? return instantly, $0
  2. Internal DB            — food in any prior user's history? return from DB, $0
  3. USDA FoodData Central  — common food? free public lookup, $0
  4. Gemini 2.5 Flash       — last resort only, ~$0.10-0.50 per call

Interview answer: A 90% cache hit rate drops per-analysis cost from ~$0.30 to
~$0.03. At 100k users × 2 meals/day = $18k/month → $1,800/month.
"""

import hashlib
import logging
import time

from sqlalchemy.orm import Session

from app.cache import cache_food_result, get_cached_food_result
from app.models.meal import MealLog
from app.schemas.meal import NutritionResult, PipelineTier
from app.services.usda_client import search_usda
from app.services.gemini_client import analyze_food_text, analyze_food_photo

logger = logging.getLogger(__name__)


def _normalize_query(text: str) -> str:
    """Normalize a food query for consistent cache keys."""
    return " ".join(text.lower().strip().split())


def _hash_query(text: str) -> str:
    """Create a cache key hash from a normalized food query."""
    normalized = _normalize_query(text)
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]


def _hash_image(image_bytes: bytes) -> str:
    """Create a cache key hash from image bytes."""
    return hashlib.sha256(image_bytes).hexdigest()[:16]


# ── Tier 1: Cache lookup ────────────────────────────────
def _check_cache(query_hash: str) -> NutritionResult | None:
    """Tier 1: Check the cache for a previously analyzed food."""
    cached = get_cached_food_result(query_hash)
    if cached:
        logger.info("🎯 Tier 1 HIT (cache): %s", cached.get("food_name", "?"))
        return NutritionResult(
            **cached,
            pipeline_tier=PipelineTier.cache,
            analysis_time_ms=0,
        )
    return None


# ── Tier 2: Internal DB lookup ──────────────────────────
def _check_db(query: str, db: Session) -> NutritionResult | None:
    """Tier 2: Search the internal meal log for a matching food."""
    normalized = _normalize_query(query)

    # Look for an exact or close match in any user's meal history
    meal = (
        db.query(MealLog)
        .filter(MealLog.food_name.ilike(f"%{normalized}%"))
        .order_by(MealLog.logged_at.desc())
        .first()
    )

    if meal and meal.confidence_score and meal.confidence_score >= 0.7:
        logger.info("🗄️ Tier 2 HIT (db): %s", meal.food_name)
        return NutritionResult(
            food_name=meal.food_name,
            calories=meal.calories,
            protein_g=meal.protein_g,
            carbs_g=meal.carbs_g,
            fat_g=meal.fat_g,
            serving_size=meal.serving_size,
            confidence_score=meal.confidence_score * 0.95,  # Slight decay for reused data
            pipeline_tier=PipelineTier.db,
        )
    return None


# ── Tier 3: USDA lookup (async) ─────────────────────────
# Handled in the main pipeline function below


# ── Tier 4: Gemini AI (async) ───────────────────────────
# Handled in the main pipeline function below


# ═══════════════════════════════════════════════════════════
# Main pipeline entry points
# ═══════════════════════════════════════════════════════════

async def analyze_text_input(text: str, db: Session) -> NutritionResult:
    """
    Run a natural language food description through the 4-tier pipeline.
    Example: "I had 2 eggs and toast with butter"
    """
    start = time.time()
    query_hash = _hash_query(text)

    # Tier 1: Cache
    result = _check_cache(query_hash)
    if result:
        result.analysis_time_ms = int((time.time() - start) * 1000)
        return result

    # Tier 2: Internal DB
    result = _check_db(text, db)
    if result:
        result.analysis_time_ms = int((time.time() - start) * 1000)
        # Cache for next time
        cache_food_result(query_hash, result.model_dump(exclude={"pipeline_tier", "analysis_time_ms"}))
        return result

    # Tier 3: USDA
    result = await search_usda(text)
    if result:
        result.analysis_time_ms = int((time.time() - start) * 1000)
        logger.info("📊 Tier 3 HIT (USDA): %s", result.food_name)
        cache_food_result(query_hash, result.model_dump(exclude={"pipeline_tier", "analysis_time_ms"}))
        return result

    # Tier 4: Gemini AI (last resort — costs money)
    logger.info("🤖 Tier 4 (Gemini): analyzing text '%s'", text[:50])
    result = await analyze_food_text(text)
    result.analysis_time_ms = int((time.time() - start) * 1000)
    cache_food_result(query_hash, result.model_dump(exclude={"pipeline_tier", "analysis_time_ms"}))
    return result


async def analyze_photo_input(image_bytes: bytes, mime_type: str, db: Session) -> NutritionResult:
    """
    Run a food photo through the pipeline.
    Photos skip Tier 2 (DB text search) and Tier 3 (USDA text search)
    because we can't meaningfully text-match an image.
    """
    start = time.time()
    query_hash = _hash_image(image_bytes)

    # Tier 1: Cache (same image seen before)
    result = _check_cache(query_hash)
    if result:
        result.analysis_time_ms = int((time.time() - start) * 1000)
        return result

    # Tier 4: Gemini Vision (skip tiers 2-3 for images)
    logger.info("🤖 Tier 4 (Gemini Vision): analyzing food photo")
    result = await analyze_food_photo(image_bytes, mime_type)
    result.analysis_time_ms = int((time.time() - start) * 1000)
    cache_food_result(query_hash, result.model_dump(exclude={"pipeline_tier", "analysis_time_ms"}))
    return result
