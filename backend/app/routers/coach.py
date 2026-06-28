from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.user import User, UserProfile
from app.models.meal import MealLog
from app.routers.auth import get_current_user
from app.schemas.coach import CoachChatRequest, CoachChatResponse
from app.services.coach_service import get_coach_response

router = APIRouter(prefix="/api/coach", tags=["coach"])

@router.post("/chat", response_model=CoachChatResponse)
async def chat_with_coach(
    request: CoachChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get user profile
    result = db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")

    # Get recent meals (last 20)
    meal_result = db.execute(
        select(MealLog)
        .where(MealLog.user_id == current_user.id)
        .order_by(MealLog.logged_at.desc())
        .limit(20)
    )
    recent_meals = meal_result.scalars().all()

    # Format chat history
    history = [{"role": msg.role, "content": msg.content} for msg in request.history]

    # Call Gemini service
    reply, data_changed = await get_coach_response(db, profile, list(recent_meals), history, request.message)

    return CoachChatResponse(reply=reply, data_changed=data_changed)
