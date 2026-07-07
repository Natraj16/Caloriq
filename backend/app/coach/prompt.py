from langchain_core.prompts import ChatPromptTemplate
from typing import List, Dict, Any
from app.models.user import UserProfile
from app.models.meal import MealLog

def get_coach_prompt() -> ChatPromptTemplate:
    system_template = """You are 'Coach Grit', a no-nonsense, highly motivational, and demanding gym trainer and AI nutrition coach.
You are chatting with {name}.

USER CONTEXT:
- Age: {age}, Sex: {sex}, Weight: {weight_kg} kg, Height: {height_cm} cm
- Days since last weight log: {days_since_last_weight_log}
- Primary Goal: {goal}
- Activity Level: {activity_level}
- Allergies: {allergies}
- Dietary Preferences: {preferences}
- Active Challenges: {active_challenges}

DAILY MACRO TARGETS:
- Calories: {calorie_target} kcal (Remaining: {remaining_calories} kcal)
- Protein: {protein_target} g (Remaining: {remaining_protein} g)
- Carbs: {carbs_target} g (Remaining: {remaining_carbs} g)
- Fat: {fat_target} g (Remaining: {remaining_fat} g)

RECENT MEAL LOGS (Context):
{meal_history}

COACHING GUIDELINES:
1. Never give generic advice — always reference the user's actual data.
2. Never suggest foods that conflict with allergies. Warn them immediately if they mention eating something they are allergic to.
3. Be concise, practical, and encouraging.
4. Confirm clearly when a tool action was performed.
5. If 'Days since last weight log' is 3 or more (or 'None'), proactively remind the user to log their weight. Ask for their current weight so you can update it for them.
"""
    return ChatPromptTemplate.from_messages([
        ("system", system_template),
        ("placeholder", "{chat_history}")
    ])

def build_context(profile: UserProfile, recent_meals: List[MealLog], today_totals: Dict[str, Any], active_challenges: str = "None", days_since_last_weight_log: int | None = None) -> Dict[str, Any]:
    name = profile.name or "User"
    goal = profile.goal or "Not specified"
    allergies = ", ".join(profile.allergies) if profile.allergies else "None"
    preferences = ", ".join(profile.dietary_preferences) if profile.dietary_preferences else "None"
    
    cal_target = profile.custom_calorie_target or profile.daily_calorie_target or 2000
    pro_target = profile.custom_protein_target or profile.daily_protein_target or 100
    carb_target = profile.custom_carbs_target or profile.daily_carbs_target or 200
    fat_target = profile.custom_fat_target or profile.daily_fat_target or 60
    
    if not recent_meals:
        meal_history = "- No recent meals logged."
    else:
        meal_history = ""
        for m in recent_meals:
            date_str = m.logged_at.strftime("%Y-%m-%d %H:%M") if m.logged_at else "Unknown"
            meal_history += f"- {date_str} | {m.meal_type.title()} | {m.food_name} | {m.calories} kcal | {m.protein_g}g P | {m.carbs_g}g C | {m.fat_g}g F\n"

    rem_cal = cal_target - today_totals.get("calories", 0)
    rem_pro = pro_target - today_totals.get("protein", 0)
    rem_carb = carb_target - today_totals.get("carbs", 0)
    rem_fat = fat_target - today_totals.get("fat", 0)

    return {
        "name": name,
        "age": profile.age or 'N/A',
        "sex": profile.sex or 'N/A',
        "weight_kg": profile.weight_kg or 'N/A',
        "height_cm": profile.height_cm or 'N/A',
        "goal": goal,
        "calorie_target": cal_target,
        "protein_target": pro_target,
        "carbs_target": carb_target,
        "fat_target": fat_target,
        "activity_level": profile.activity_level or 'N/A',
        "preferences": preferences,
        "allergies": allergies,
        "meal_history": meal_history,
        "remaining_calories": rem_cal,
        "remaining_protein": rem_pro,
        "remaining_carbs": rem_carb,
        "remaining_fat": rem_fat,
        "active_challenges": active_challenges,
        "days_since_last_weight_log": days_since_last_weight_log if days_since_last_weight_log is not None else "None"
    }
