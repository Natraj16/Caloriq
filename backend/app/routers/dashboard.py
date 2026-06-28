from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
import pytz

from app.database import get_db
from app.models.user import User, UserProfile
from app.models.meal import MealLog, WeightLog
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def get_user_tz(profile: UserProfile | None) -> pytz.BaseTzInfo:
    if not profile or not profile.timezone:
        return pytz.utc
    try:
        return pytz.timezone(profile.timezone)
    except Exception:
        return pytz.utc


def calculate_streak(activity_logs: list, tz: pytz.BaseTzInfo) -> int:
    local_dates = set()
    for log in activity_logs:
        utc_dt = log.logged_at.replace(tzinfo=pytz.utc) if log.logged_at.tzinfo is None else log.logged_at
        local_dt = utc_dt.astimezone(tz)
        local_dates.add(local_dt.date())

    if not local_dates:
        return 0

    today = datetime.now(tz).date()
    yesterday = today - timedelta(days=1)

    if today in local_dates:
        current_date = today
    elif yesterday in local_dates:
        current_date = yesterday
    else:
        return 0

    streak = 0
    while current_date in local_dates:
        streak += 1
        current_date -= timedelta(days=1)

    return streak


@router.get("/summary")
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    tz = get_user_tz(profile)

    # Prefer custom targets (set by user/coach) over auto-calculated, with fallbacks
    cal_target = (profile.custom_calorie_target or profile.daily_calorie_target or 2000) if profile else 2000
    pro_target = (profile.custom_protein_target or profile.daily_protein_target or 130) if profile else 130
    carb_target = (profile.custom_carbs_target or profile.daily_carbs_target or 220) if profile else 220
    fat_target = (profile.custom_fat_target or profile.daily_fat_target or 65) if profile else 65

    # Fetch user meals and weights to calculate streak
    all_meals = db.query(MealLog).filter(MealLog.user_id == current_user.id).all()
    all_weights = db.query(WeightLog).filter(WeightLog.user_id == current_user.id).all()
    all_activity = all_meals + all_weights
    
    streak = calculate_streak(all_activity, tz)

    today = datetime.now(tz).date()
    today_meals = []
    total_cal = 0.0
    total_pro = 0.0
    total_carb = 0.0
    total_fat = 0.0

    for meal in all_meals:
        utc_dt = meal.logged_at.replace(tzinfo=pytz.utc) if meal.logged_at.tzinfo is None else meal.logged_at
        local_dt = utc_dt.astimezone(tz)
        if local_dt.date() == today:
            today_meals.append(meal)
            total_cal += meal.calories
            total_pro += meal.protein_g
            total_carb += meal.carbs_g
            total_fat += meal.fat_g

    return {
        "targets": {
            "calories": cal_target,
            "protein": pro_target,
            "carbs": carb_target,
            "fat": fat_target
        },
        "totals": {
            "calories": round(total_cal, 1),
            "protein": round(total_pro, 1),
            "carbs": round(total_carb, 1),
            "fat": round(total_fat, 1)
        },
        "remaining": {
            "calories": max(0.0, round(cal_target - total_cal, 1)),
            "protein": max(0.0, round(pro_target - total_pro, 1)),
            "carbs": max(0.0, round(carb_target - total_carb, 1)),
            "fat": max(0.0, round(fat_target - total_fat, 1))
        },
        "streak": streak,
        "meals_logged_today": len(today_meals),
        "has_profile": profile is not None
    }


@router.get("/analytics")
def get_analytics(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if days not in [7, 14, 30]:
        days = 7

    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    tz = get_user_tz(profile)

    # Calculate range
    today = datetime.now(tz).date()
    start_date = today - timedelta(days=days - 1)

    # Fetch meals and weight logs
    meals = db.query(MealLog).filter(
        MealLog.user_id == current_user.id,
        MealLog.logged_at >= datetime.combine(start_date, datetime.min.time(), tzinfo=pytz.utc)
    ).all()

    weights = db.query(WeightLog).filter(
        WeightLog.user_id == current_user.id,
        WeightLog.logged_at >= datetime.combine(start_date, datetime.min.time(), tzinfo=pytz.utc)
    ).order_by(WeightLog.logged_at.asc()).all()

    # Aggregate by local date
    daily_data = {}
    for i in range(days):
        d = start_date + timedelta(days=i)
        daily_data[d] = {
            "date": d.isoformat(),
            "calories": 0.0,
            "protein": 0.0,
            "carbs": 0.0,
            "fat": 0.0,
            "weight": None
        }

    for meal in meals:
        utc_dt = meal.logged_at.replace(tzinfo=pytz.utc) if meal.logged_at.tzinfo is None else meal.logged_at
        local_date = utc_dt.astimezone(tz).date()
        if local_date in daily_data:
            daily_data[local_date]["calories"] += meal.calories
            daily_data[local_date]["protein"] += meal.protein_g
            daily_data[local_date]["carbs"] += meal.carbs_g
            daily_data[local_date]["fat"] += meal.fat_g

    # Weight: take the latest weight for that day
    for w in weights:
        utc_dt = w.logged_at.replace(tzinfo=pytz.utc) if w.logged_at.tzinfo is None else w.logged_at
        local_date = utc_dt.astimezone(tz).date()
        if local_date in daily_data:
            daily_data[local_date]["weight"] = w.weight_kg

    # Fill in missing weights with the last known weight (carry forward)
    last_known_weight = None
    # First find if there is a weight logged before start_date
    prior_weight = db.query(WeightLog).filter(
        WeightLog.user_id == current_user.id,
        WeightLog.logged_at < datetime.combine(start_date, datetime.min.time(), tzinfo=pytz.utc)
    ).order_by(WeightLog.logged_at.desc()).first()
    
    if prior_weight:
        last_known_weight = prior_weight.weight_kg
    elif profile and profile.weight_kg:
        last_known_weight = profile.weight_kg

    sorted_dates = sorted(daily_data.keys())
    for d in sorted_dates:
        if daily_data[d]["weight"] is None:
            daily_data[d]["weight"] = last_known_weight
        else:
            last_known_weight = daily_data[d]["weight"]

    # Round everything
    result = []
    for d in sorted_dates:
        item = daily_data[d]
        item["calories"] = round(item["calories"], 1)
        item["protein"] = round(item["protein"], 1)
        item["carbs"] = round(item["carbs"], 1)
        item["fat"] = round(item["fat"], 1)
        result.append(item)

    return result
