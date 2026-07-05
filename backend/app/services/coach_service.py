"""
Caloriq — Context-Aware AI Coach Service.

Provides a conversational AI coach using Gemini 2.5 Flash via LangChain that is
grounded in the user's specific context, metrics, and dietary goals.
"""

import logging
import traceback
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from langchain_core.messages import AIMessage, ToolMessage

from app.config import get_settings
from app.models.user import UserProfile
from app.models.meal import MealLog, WeightLog
from app.utils.targets import calculate_targets

from app.coach.prompt import build_context, get_coach_prompt
from app.coach.chain import run_coach
from app.coach.memory import persist_memory
from app.coach.llm import get_coach_llm

logger = logging.getLogger(__name__)
settings = get_settings()

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
    pass

async def get_coach_response(
    db: Session,
    profile: UserProfile,
    recent_meals: List[MealLog],
    chat_history: List[Dict[str, str]],
    new_message: str
) -> tuple[str, List[str]]:
    """
    SERVICE LAYER: Core Business Logic for the AI Coach.
    
    Generate a response from the AI coach based on the user's history and the new message.
    Returns a tuple of (reply_text, data_changed) where data_changed lists the data
    domains that were mutated (e.g. ["weight", "targets"]) so the frontend can re-fetch.
    
    FLOW:
    1. Prepares the context (calculates today's macro totals).
    2. Tells LangChain about our database tools (`bind_tools`).
    3. Calls the LangChain execution chain (`run_coach`).
    4. If the AI decides to use a tool (like updating weight):
       a. We execute the custom database operations (SQLAlchemy).
       b. We save the database changes.
       c. We feed the result back into the LangChain memory so the AI knows it succeeded.
       d. We prompt the AI again for its final text response.
    5. Saves the conversation turn to Redis (Memory) and returns the reply.
    """
    conversation_id = str(profile.user_id)
    
    # Calculate today's totals
    today_totals = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
    now_date = datetime.now(timezone.utc).date()
    for m in recent_meals:
        if m.logged_at and m.logged_at.date() == now_date:
            today_totals["calories"] += m.calories
            today_totals["protein"] += m.protein_g
            today_totals["carbs"] += m.carbs_g
            today_totals["fat"] += m.fat_g
            
    context = build_context(profile, recent_meals, today_totals)
    
    llm = get_coach_llm().bind_tools([update_user_metrics])
    
    try:
        response, memory = await run_coach(conversation_id, new_message, context, llm=llm)
        data_changed: List[str] = []
        
        while isinstance(response, AIMessage) and response.tool_calls:
            # Add AI message with tool calls to memory
            memory.chat_memory.messages.append(response)
            
            for tool_call in response.tool_calls:
                if tool_call["name"] == "update_user_metrics":
                    args = tool_call["args"]
                    
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

                    tool_msg = ToolMessage(
                        content="Success. Metrics updated.",
                        tool_call_id=tool_call["id"]
                    )
                    memory.chat_memory.messages.append(tool_msg)
            
            # Call chain again with updated memory
            prompt = get_coach_prompt()
            chain = prompt | llm
            memory_vars = memory.load_memory_variables({"user_message": new_message})
            
            response = await chain.ainvoke({
                **context,
                "chat_history": memory_vars.get("chat_history", []),
                "user_message": new_message
            })

        reply = response.content if isinstance(response, AIMessage) else str(response)
        
        # Save complete turn to memory
        memory.save_context({"user_message": new_message}, {"output": reply})
        persist_memory(conversation_id, memory)
        
        return reply, data_changed
        
    except Exception as e:
        logger.error(f"Error calling LangChain coach: {type(e).__name__}: {e}")
        logger.error(traceback.format_exc())
        return "Listen up! I'm having trouble processing that right now. Take a breather and try again in a second!", []
