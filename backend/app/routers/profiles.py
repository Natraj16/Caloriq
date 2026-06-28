from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserProfile
from app.schemas.profile import UserProfileCreate, UserProfileUpdate, UserProfileResponse
from app.middleware.auth import get_current_user
from app.utils.targets import calculate_targets

router = APIRouter(prefix="/api/profile", tags=["profile"])



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
