"""
Caloriq — USDA FoodData Central API client.

Free public database lookup (Tier 3 of the cost-control pipeline).
Get a free API key at: https://fdc.nal.usda.gov/api-key-signup
"""

import logging
import httpx

from app.config import get_settings
from app.schemas.meal import NutritionResult, PipelineTier

logger = logging.getLogger(__name__)
settings = get_settings()

USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"


async def search_usda(query: str) -> NutritionResult | None:
    """
    Search USDA FoodData Central for a food item.
    Returns structured nutrition data if found, None otherwise.
    """
    if not settings.USDA_API_KEY:
        logger.debug("USDA API key not configured, skipping tier 3")
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                USDA_SEARCH_URL,
                params={
                    "api_key": settings.USDA_API_KEY,
                    "query": query,
                    "pageSize": 1,
                    "dataType": "Foundation,SR Legacy",
                },
            )
            response.raise_for_status()
            data = response.json()

        foods = data.get("foods", [])
        if not foods:
            return None

        food = foods[0]
        nutrients = {n["nutrientName"]: n.get("value", 0) for n in food.get("foodNutrients", [])}

        # USDA nutrient names
        calories = nutrients.get("Energy", 0)
        protein = nutrients.get("Protein", 0)
        carbs = nutrients.get("Carbohydrate, by difference", 0)
        fat = nutrients.get("Total lipid (fat)", 0)

        if calories == 0 and protein == 0 and carbs == 0:
            return None  # Empty result, don't trust it

        return NutritionResult(
            food_name=food.get("description", query).title(),
            calories=round(calories, 1),
            protein_g=round(protein, 1),
            carbs_g=round(carbs, 1),
            fat_g=round(fat, 1),
            serving_size="100g (USDA reference)",
            confidence_score=0.85,
            pipeline_tier=PipelineTier.usda,
        )

    except Exception as e:
        logger.warning("USDA lookup failed for '%s': %s", query, e)
        return None
