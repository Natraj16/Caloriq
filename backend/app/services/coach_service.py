"""
Caloriq — Context-Aware AI Coach Service.

Provides a conversational AI coach using Gemini 2.5 Flash that is
grounded in the user's specific context, metrics, and dietary goals.
"""

import logging
import traceback
from typing import List, Dict, Any
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.config import get_settings
from app.models.user import UserProfile
from app.models.meal import MealLog, WeightLog
from app.utils.targets import calculate_targets

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_client() -> genai.Client:
    """Create a Gemini client. Raises if API key is not configured."""
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured. Set it in .env")
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _build_system_prompt(profile: UserProfile, recent_meals: List[MealLog]) -> str:
    """Constructs the grounding prompt with the user's context."""
    name = profile.name or "User"
    goals = profile.goal or "Not specified"
    allergies = ", ".join(profile.allergies) if profile.allergies else "None"
    dietary_prefs = ", ".join(profile.dietary_preferences) if profile.dietary_preferences else "None"
    
    # Calculate daily targets (assuming they exist or use default fallbacks)
    cal_target = profile.custom_calorie_target or profile.daily_calorie_target or 2000
    pro_target = profile.custom_protein_target or profile.daily_protein_target or 100
    carb_target = profile.custom_carbs_target or profile.daily_carbs_target or 200
    fat_target = profile.custom_fat_target or profile.daily_fat_target or 60

    prompt = f"""You are 'Coach Grit', a no-nonsense, highly motivational, and demanding gym trainer and AI nutrition coach.
You are chatting with {name}.

USER CONTEXT:
- Age: {profile.age or 'N/A'}, Sex: {profile.sex or 'N/A'}, Weight: {profile.weight_kg or 'N/A'} kg, Height: {profile.height_cm or 'N/A'} cm
- Primary Goal: {goals}
- Allergies: {allergies}
- Dietary Preferences: {dietary_prefs}

DAILY MACRO TARGETS:
- Calories: {cal_target} kcal
- Protein: {pro_target} g
- Carbs: {carb_target} g
- Fat: {fat_target} g

RECENT MEAL LOGS (Context):
"""
    if not recent_meals:
        prompt += "- No recent meals logged.\n"
    else:
        for m in recent_meals:
            prompt += f"- {m.meal_type.title()}: {m.food_name} ({m.calories} kcal, {m.protein_g}g Pro, {m.carbs_g}g Carb, {m.fat_g}g Fat)\n"

    prompt += """
COACHING GUIDELINES:
1. Always be supportive, concise, and direct. Do not give overly long essay responses.
2. Ensure any food suggestions strictly adhere to their allergies and dietary preferences! Warn them immediately if they mention eating something they are allergic to.
3. Keep the conversation engaging and formatting clean (use bullet points and bold text where appropriate).
4. If they ask how they are doing today, analyze their recent meals against their daily macro targets.

AVAILABLE TOOLS (use these proactively — don't just talk about it, DO it):
- `update_user_metrics`: Call this IMMEDIATELY whenever the user:
  * Mentions their weight (e.g. "I weigh 75kg", "log my weight as 80 pounds", "I'm now 68kg").
  * Asks to update/change/set their calorie or macro targets.
  * You MUST call the tool AND THEN tell the user it's been logged. Do not ask for confirmation before calling it.
"""
    return prompt


def update_user_metrics(
    weight_kg: float | None = None,
    calories: int | None = None,
    protein: int | None = None,
    carbs: int | None = None,
    fat: int | None = None,
) -> str:
    """
    Logs and updates the user's body metrics and/or daily nutrition targets in the database.

    Call this tool whenever the user:
    - Mentions their current weight or asks to log/update their weight.
    - Asks to change, set, or update their calorie target or any macro target.
    - Reports a new measurement (e.g. "I weigh 72kg now", "log my weight as 80kg").

    Args:
        weight_kg: The user's current body weight in kilograms. Provide this to log
                   a new weight measurement and update their profile weight.
        calories:  The new daily calorie target in kcal. Provide to override the
                   calculated calorie goal.
        protein:   The new daily protein target in grams.
        carbs:     The new daily carbohydrate target in grams.
        fat:       The new daily fat target in grams.

    Returns:
        A string confirming the update was successful.
    """
    # This function body is intentionally empty — it serves as the tool schema
    # definition for Gemini. The actual database operations are performed in the
    # get_coach_response function's function_call handling loop.
    pass

async def get_coach_response(
    db: Session,
    profile: UserProfile,
    recent_meals: List[MealLog],
    chat_history: List[Dict[str, str]],
    new_message: str
) -> tuple[str, List[str]]:
    """
    Generate a response from the AI coach based on the user's history and the new message.
    Returns a tuple of (reply_text, data_changed) where data_changed lists the data
    domains that were mutated (e.g. ["weight", "targets"]) so the frontend can re-fetch.
    """
    client = _get_client()
    system_prompt = _build_system_prompt(profile, recent_meals)

    # Convert the chat history into Gemini content format
    contents = []
    
    # Add previous chat history
    for msg in chat_history:
        role = "user" if msg["role"] == "user" else "model"
        contents.append(
            types.Content(
                role=role,
                parts=[types.Part.from_text(text=msg["content"])]
            )
        )
        
    # Append the latest message
    contents.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=new_message)]
        )
    )

    try:
        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.7, # Slightly higher temp for more conversational creativity
            tools=[update_user_metrics],
            # Disable automatic function calling — we handle tool execution manually
            # so we can perform real database writes with the db session.
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
        )
        response = client.models.generate_content(
            model=settings.GEMINI_COACH_MODEL,
            contents=contents,
            config=config,
        )

        data_changed: List[str] = []

        while response.function_calls:
            contents.append(response.candidates[0].content)
            for function_call in response.function_calls:
                if function_call.name == "update_user_metrics":
                    args = function_call.args
                    
                    if "weight_kg" in args and args["weight_kg"] is not None:
                        new_weight = WeightLog(
                            user_id=profile.user_id,
                            weight_kg=float(args["weight_kg"]),
                            logged_at=datetime.now(timezone.utc)
                        )
                        db.add(new_weight)
                        profile.weight_kg = float(args["weight_kg"])
                        if "weight" not in data_changed:
                            data_changed.append("weight")

                    targets_changed = False
                    if "calories" in args and args["calories"] is not None:
                        profile.custom_calorie_target = int(args["calories"])
                        targets_changed = True
                    if "protein" in args and args["protein"] is not None:
                        profile.custom_protein_target = int(args["protein"])
                        targets_changed = True
                    if "carbs" in args and args["carbs"] is not None:
                        profile.custom_carbs_target = int(args["carbs"])
                        targets_changed = True
                    if "fat" in args and args["fat"] is not None:
                        profile.custom_fat_target = int(args["fat"])
                        targets_changed = True

                    if targets_changed:
                        # Run through the full target pipeline so derived daily_* fields
                        # (protein, carbs, fat) are recalculated from the new calorie base,
                        # exactly as PATCH /api/profile does.
                        if profile.weight_kg and profile.height_cm and profile.age and profile.sex:
                            recalculated = calculate_targets(
                                weight_kg=profile.weight_kg,
                                height_cm=profile.height_cm,
                                age=profile.age,
                                sex=profile.sex,
                                goal=profile.goal or "maintain",
                                activity_level=profile.activity_level or "sedentary",
                                custom_calorie_target=profile.custom_calorie_target,
                                custom_protein_target=profile.custom_protein_target,
                                custom_carbs_target=profile.custom_carbs_target,
                                custom_fat_target=profile.custom_fat_target,
                            )
                            for key, value in recalculated.items():
                                setattr(profile, key, value)
                        if "targets" not in data_changed:
                            data_changed.append("targets")

                    db.commit()

                    func_response = types.Part.from_function_response(
                        name="update_user_metrics",
                        response={"result": "Success. Metrics updated."}
                    )
                    contents.append(
                        types.Content(role="user", parts=[func_response])
                    )
            
            # Call again with the tool responses
            response = client.models.generate_content(
                model=settings.GEMINI_COACH_MODEL,
                contents=contents,
                config=config,
            )

        return response.text, data_changed
    except Exception as e:
        logger.error(f"Error calling Gemini for coach: {type(e).__name__}: {e}")
        logger.error(traceback.format_exc())
        return "Listen up! I'm having trouble processing that right now. Take a breather and try again in a second!", []
