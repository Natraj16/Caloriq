from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import get_db
from app.models.user import User, UserProfile
from app.models.meal import WeightLog
from app.schemas.weight import WeightLogCreate, WeightLogResponse
from app.middleware.auth import get_current_user
from app.routers.profiles import calculate_targets

router = APIRouter(prefix="/api/weights", tags=["weights"])


@router.get("", response_model=list[WeightLogResponse])
def get_weights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    weights = (
        db.query(WeightLog)
        .filter(WeightLog.user_id == current_user.id)
        .order_by(WeightLog.logged_at.desc())
        .all()
    )
    return weights


@router.post("", response_model=WeightLogResponse, status_code=status.HTTP_201_CREATED)
def log_weight(
    body: WeightLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logged_at = body.logged_at or datetime.now(timezone.utc)
    weight_log = WeightLog(
        user_id=current_user.id,
        weight_kg=body.weight_kg,
        logged_at=logged_at
    )
    db.add(weight_log)

    # Update profile weight and targets if profile exists
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if profile:
        profile.weight_kg = body.weight_kg
        targets = calculate_targets(
            weight_kg=profile.weight_kg,
            height_cm=profile.height_cm,
            age=profile.age,
            sex=profile.sex,
            goal=profile.goal,
            activity_level=profile.activity_level
        )
        for key, value in targets.items():
            setattr(profile, key, value)

    db.commit()
    db.refresh(weight_log)
    return weight_log


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_weight(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    weight_log = db.query(WeightLog).filter(WeightLog.id == id, WeightLog.user_id == current_user.id).first()
    if not weight_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Weight log not found",
        )
    db.delete(weight_log)
    db.commit()
    return None
