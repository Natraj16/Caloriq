"""
Caloriq — Open Food Facts barcode lookup client.

This bypasses the AI pipeline entirely for packaged foods.
Open Food Facts is free, open-source, and returns structured nutrition data directly.
"""

import logging
import httpx

from app.config import get_settings
from app.schemas.meal import NutritionResult, PipelineTier

logger = logging.getLogger(__name__)
settings = get_settings()


async def lookup_barcode(barcode: str) -> NutritionResult | None:
    """
    Look up a barcode in Open Food Facts.
    Returns structured nutrition data if found, None otherwise.
    """
    url = f"{settings.OPEN_FOOD_FACTS_BASE_URL}/product/{barcode}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                url,
                params={"fields": "product_name,nutriments,serving_size,brands"},
                headers={"User-Agent": "Caloriq/0.1 (contact@caloriq.app)"},
            )
            response.raise_for_status()
            data = response.json()

        if data.get("status") != 1:
            logger.debug("Barcode %s not found in Open Food Facts", barcode)
            return None

        product = data.get("product", {})
        nutriments = product.get("nutriments", {})

        food_name = product.get("product_name", "Unknown Product")
        brand = product.get("brands", "")
        if brand:
            food_name = f"{food_name} ({brand})"

        # Nutriments are per 100g by default
        calories = nutriments.get("energy-kcal_100g", 0) or nutriments.get("energy-kcal", 0)
        protein = nutriments.get("proteins_100g", 0) or nutriments.get("proteins", 0)
        carbs = nutriments.get("carbohydrates_100g", 0) or nutriments.get("carbohydrates", 0)
        fat = nutriments.get("fat_100g", 0) or nutriments.get("fat", 0)

        serving = product.get("serving_size", "100g")

        return NutritionResult(
            food_name=food_name,
            calories=round(float(calories), 1),
            protein_g=round(float(protein), 1),
            carbs_g=round(float(carbs), 1),
            fat_g=round(float(fat), 1),
            serving_size=serving,
            confidence_score=0.95,  # Packaged food data is reliable
            pipeline_tier=PipelineTier.barcode_api,
        )

    except Exception as e:
        logger.warning("Open Food Facts lookup failed for barcode '%s': %s", barcode, e)
        return None
