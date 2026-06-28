"""
Caloriq — Nutrition target calculation utility.

Shared by both the profile router and coach service so neither
has to import from the other (avoids circular imports).
"""


def calculate_targets(
    weight_kg: float,
    height_cm: float,
    age: int,
    sex: str,
    goal: str,
    activity_level: str,
    custom_calorie_target: int | None = None,
    custom_protein_target: int | None = None,
    custom_carbs_target: int | None = None,
    custom_fat_target: int | None = None,
) -> dict:
    """
    Calculate daily macro targets using Mifflin-St Jeor BMR.
    Custom targets take priority over calculated values.

    Returns a dict with keys:
      daily_calorie_target, daily_protein_target,
      daily_carbs_target, daily_fat_target
    """
    # ── Calories ────────────────────────────────────────────
    if custom_calorie_target is not None:
        calories = custom_calorie_target
    else:
        if sex == "male":
            bmr = 10.0 * weight_kg + 6.25 * height_cm - 5.0 * age + 5.0
        elif sex == "female":
            bmr = 10.0 * weight_kg + 6.25 * height_cm - 5.0 * age - 161.0
        else:
            bmr = 10.0 * weight_kg + 6.25 * height_cm - 5.0 * age - 78.0

        multipliers = {
            "sedentary": 1.2,
            "light": 1.375,
            "moderate": 1.55,
            "active": 1.725,
            "very_active": 1.9,
        }
        tdee = bmr * multipliers.get(activity_level, 1.2)

        if goal == "lose":
            calories = max(1200, int(tdee - 500))
        elif goal == "gain":
            calories = int(tdee + 500)
        else:
            calories = int(tdee)

    # ── Protein ─────────────────────────────────────────────
    if custom_protein_target is not None:
        protein_g = custom_protein_target
    else:
        if custom_calorie_target is not None:
            protein_g = (calories * 0.30) / 4.0
        else:
            protein_g = 2.0 * weight_kg
            protein_kcal = protein_g * 4.0
            if protein_kcal > calories * 0.35:
                protein_g = (calories * 0.30) / 4.0

    # ── Fat ─────────────────────────────────────────────────
    if custom_fat_target is not None:
        fat_g = custom_fat_target
    else:
        fat_g = (calories * 0.25) / 9.0

    # ── Carbs ───────────────────────────────────────────────
    if custom_carbs_target is not None:
        carbs_g = custom_carbs_target
    else:
        p_kcal = protein_g * 4.0
        f_kcal = fat_g * 9.0
        carbs_g = max(0.0, calories - (p_kcal + f_kcal)) / 4.0

    return {
        "daily_calorie_target": int(calories),
        "daily_protein_target": int(round(protein_g)),
        "daily_carbs_target": int(round(carbs_g)),
        "daily_fat_target": int(round(fat_g)),
    }
