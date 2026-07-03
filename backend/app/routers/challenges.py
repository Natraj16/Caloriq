from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.challenge import Challenge, UserChallenge, ChallengeStatus
from app.schemas.challenge import ChallengeResponse, UserChallengeResponse, ChallengeOptInRequest, ChallengeListResponse

router = APIRouter(prefix="/api/challenges", tags=["challenges"])


@router.get("", response_model=ChallengeListResponse)
def get_challenges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all available challenges and the user's active/completed ones."""
    # All challenges
    all_challenges = db.query(Challenge).all()
    
    # User's active or recent challenges
    user_challenges = (
        db.query(UserChallenge)
        .filter(UserChallenge.user_id == current_user.id)
        .all()
    )
    
    return ChallengeListResponse(
        challenges=[ChallengeResponse.model_validate(c) for c in all_challenges],
        active_user_challenges=[UserChallengeResponse.model_validate(uc) for uc in user_challenges]
    )


@router.post("/opt-in", response_model=UserChallengeResponse, status_code=status.HTTP_201_CREATED)
def opt_in_to_challenge(
    body: ChallengeOptInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Opt-in to a new challenge."""
    challenge = db.query(Challenge).filter(Challenge.id == body.challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
        
    # Check if already active
    existing = db.query(UserChallenge).filter(
        UserChallenge.user_id == current_user.id,
        UserChallenge.challenge_id == challenge.id,
        UserChallenge.status == ChallengeStatus.ACTIVE
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already opted into this challenge")
        
    start_date = datetime.now(timezone.utc)
    end_date = start_date + timedelta(days=challenge.duration_days)
    
    user_challenge = UserChallenge(
        user_id=current_user.id,
        challenge_id=challenge.id,
        start_date=start_date,
        end_date=end_date,
        status=ChallengeStatus.ACTIVE,
        current_progress=0.0
    )
    db.add(user_challenge)
    db.commit()
    db.refresh(user_challenge)
    
    return user_challenge


@router.delete("/opt-out/{challenge_id}", status_code=status.HTTP_204_NO_CONTENT)
def opt_out_of_challenge(
    challenge_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Opt-out of an active challenge by removing the user challenge record."""
    existing = db.query(UserChallenge).filter(
        UserChallenge.user_id == current_user.id,
        UserChallenge.challenge_id == challenge_id,
        UserChallenge.status == ChallengeStatus.ACTIVE
    ).first()
    
    if not existing:
        raise HTTPException(status_code=404, detail="Active challenge not found")
        
    db.delete(existing)
    db.commit()
