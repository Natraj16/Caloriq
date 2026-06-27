from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserProfile
from app.schemas.profile import UserProfileCreate, UserProfileUpdate, UserProfileResponse
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])


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
    custom_fat_target: int | None = None
):
    # If custom target is provided, bypass Mifflin-St Jeor calculations
    if custom_calorie_target is not None:
        calories = custom_calorie_target
    else:
        # Mifflin-St Jeor
        if sex == "male":
            bmr = 10.0 * weight_kg + 6.25 * height_cm - 5.0 * age + 5.0
        elif sex == "female":
            bmr = 10.0 * weight_kg + 6.25 * height_cm - 5.0 * age - 161.0
        else:
            # Average of male/female offsets: (+5 - 161) / 2 = -78
            bmr = 10.0 * weight_kg + 6.25 * height_cm - 5.0 * age - 78.0

        # Activity level multiplier
        multipliers = {
            "sedentary": 1.2,
            "light": 1.375,
            "moderate": 1.55,
            "active": 1.725,
            "very_active": 1.9,
        }
        tdee = bmr * multipliers.get(activity_level, 1.2)

        # Goal adjustment
        if goal == "lose":
            calories = max(1200, int(tdee - 500))
        elif goal == "gain":
            calories = int(tdee + 500)
        else:
            calories = int(tdee)

    # Protein target
    if custom_protein_target is not None:
        protein_g = custom_protein_target
    else:
        # Default calculation logic
        if custom_calorie_target is not None:
            protein_kcal = calories * 0.30
            protein_g = protein_kcal / 4.0
        else:
            protein_g = 2.0 * weight_kg
            protein_kcal = protein_g * 4.0
            if protein_kcal > calories * 0.35:
                protein_g = (calories * 0.30) / 4.0

    # Fat target
    if custom_fat_target is not None:
        fat_g = custom_fat_target
    else:
        fat_kcal = calories * 0.25
        fat_g = fat_kcal / 9.0

    # Carbs target
    if custom_carbs_target is not None:
        carbs_g = custom_carbs_target
    else:
        p_kcal = protein_g * 4.0
        f_kcal = fat_g * 9.0
        carbs_kcal = max(0.0, calories - (p_kcal + f_kcal))
        carbs_g = carbs_kcal / 4.0

    return {
        "daily_calorie_target": int(calories),
        "daily_protein_target": int(round(protein_g)),
        "daily_carbs_target": int(round(carbs_g)),
        "daily_fat_target": int(round(fat_g)),
    }


@router.get("", response_model=UserProfileResponse)
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )
    return profile


@router.post("", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
def create_profile(
    body: UserProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile already exists",
        )

    targets = calculate_targets(
        weight_kg=body.weight_kg,
        height_cm=body.height_cm,
        age=body.age,
        sex=body.sex,
        goal=body.goal,
        activity_level=body.activity_level,
        custom_calorie_target=body.custom_calorie_target,
        custom_protein_target=body.custom_protein_target,
        custom_carbs_target=body.custom_carbs_target,
        custom_fat_target=body.custom_fat_target,
    )

    if body.name is not None:
        current_user.name = body.name

    profile = UserProfile(
        user_id=current_user.id,
        age=body.age,
        sex=body.sex,
        height_cm=body.height_cm,
        weight_kg=body.weight_kg,
        goal=body.goal,
        activity_level=body.activity_level,
        dietary_preferences=body.dietary_preferences,
        allergies=body.allergies,
        timezone=body.timezone,
        custom_calorie_target=body.custom_calorie_target,
        custom_protein_target=body.custom_protein_target,
        custom_carbs_target=body.custom_carbs_target,
        custom_fat_target=body.custom_fat_target,
        **targets
    )

    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.patch("", response_model=UserProfileResponse)
def update_profile(
    body: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    # Update profile fields
    update_data = body.model_dump(exclude_unset=True)
    if "name" in update_data:
        current_user.name = update_data.pop("name")
    for key, value in update_data.items():
        setattr(profile, key, value)

    # Recalculate targets
    targets = calculate_targets(
        weight_kg=profile.weight_kg,
        height_cm=profile.height_cm,
        age=profile.age,
        sex=profile.sex,
        goal=profile.goal,
        activity_level=profile.activity_level,
        custom_calorie_target=profile.custom_calorie_target,
        custom_protein_target=profile.custom_protein_target,
        custom_carbs_target=profile.custom_carbs_target,
        custom_fat_target=profile.custom_fat_target
    )
    for key, value in targets.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile
