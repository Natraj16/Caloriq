"""
Caloriq — Gemini 2.5 Flash client for food analysis.

Tier 4 (last resort) of the cost-control pipeline.
Handles both:
  - Vision analysis (food photos → nutrition)
  - Text parsing (natural language → nutrition)
"""

import json
import logging
from google import genai
from google.genai import types

from app.config import get_settings
from app.schemas.meal import NutritionResult, PipelineTier

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Structured output schema for Gemini ──────────────────
NUTRITION_SCHEMA = {
    "type": "object",
    "properties": {
        "food_name": {"type": "string", "description": "Name of the food item"},
        "calories": {"type": "number", "description": "Total calories (kcal)"},
        "protein_g": {"type": "number", "description": "Protein in grams"},
        "carbs_g": {"type": "number", "description": "Carbohydrates in grams"},
        "fat_g": {"type": "number", "description": "Total fat in grams"},
        "serving_size": {"type": "string", "description": "Estimated serving size"},
        "confidence_score": {
            "type": "number",
            "description": "Confidence 0.0-1.0 in the accuracy of the analysis",
        },
    },
    "required": ["food_name", "calories", "protein_g", "carbs_g", "fat_g", "serving_size", "confidence_score"],
}

SYSTEM_PROMPT = """You are a nutrition analysis expert. Analyze the food input and return accurate nutritional information.

Rules:
1. Return realistic calorie and macro values based on standard nutritional databases.
2. If the image shows multiple food items, estimate the combined totals.
3. Estimate serving size from visual cues (plate size, portion, etc.) or from the text description.
4. Set confidence_score between 0.0 and 1.0:
   - 0.9+ for clearly identifiable, common foods
   - 0.7-0.9 for somewhat ambiguous foods
   - 0.5-0.7 for unclear or complex dishes
   - Below 0.5 if very unsure
5. Always return a valid JSON object matching the schema.
"""


def _get_client() -> genai.Client:
    """Create a Gemini client. Raises if API key is not configured."""
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured. Set it in .env")
    return genai.Client(api_key=settings.GEMINI_API_KEY)


async def analyze_food_photo(image_bytes: bytes, mime_type: str = "image/jpeg") -> NutritionResult:
    """
    Analyze a food photo using Gemini vision.
    This is the most expensive operation — only called when tiers 1-3 miss.
    """
    client = _get_client()

    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[
            types.Content(
                role="user",
                parts=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    types.Part.from_text(
                        "Analyze this food image. Identify the food items and estimate "
                        "their nutritional content (calories, protein, carbs, fat, serving size). "
                        "Return a JSON object."
                    ),
                ],
            )
        ],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=NUTRITION_SCHEMA,
            temperature=0.2,
        ),
    )

    result = json.loads(response.text)

    return NutritionResult(
        food_name=result["food_name"],
        calories=round(result["calories"], 1),
        protein_g=round(result["protein_g"], 1),
        carbs_g=round(result["carbs_g"], 1),
        fat_g=round(result["fat_g"], 1),
        serving_size=result.get("serving_size"),
        confidence_score=round(result.get("confidence_score", 0.7), 2),
        pipeline_tier=PipelineTier.gemini,
    )


async def analyze_food_text(text: str) -> NutritionResult:
    """
    Parse a natural language food description using Gemini.
    Example: "I had 2 eggs and toast with butter"
    """
    client = _get_client()

    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(
                        f"The user described their meal as: \"{text}\"\n\n"
                        "Parse this description, identify the food items, and estimate "
                        "their combined nutritional content. Return a JSON object."
                    ),
                ],
            )
        ],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=NUTRITION_SCHEMA,
            temperature=0.2,
        ),
    )

    result = json.loads(response.text)

    return NutritionResult(
        food_name=result["food_name"],
        calories=round(result["calories"], 1),
        protein_g=round(result["protein_g"], 1),
        carbs_g=round(result["carbs_g"], 1),
        fat_g=round(result["fat_g"], 1),
        serving_size=result.get("serving_size"),
        confidence_score=round(result.get("confidence_score", 0.7), 2),
        pipeline_tier=PipelineTier.gemini,
    )
