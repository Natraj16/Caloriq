from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.challenge import ChallengeType, ChallengeStatus


class ChallengeBase(BaseModel):
    name: str
    description: str
    type: ChallengeType
    target_value: float
    reward_points: int
    duration_days: int


class ChallengeResponse(ChallengeBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UserChallengeResponse(BaseModel):
    id: str
    user_id: str
    challenge_id: str
    start_date: datetime
    end_date: datetime
    status: ChallengeStatus
    current_progress: float
    challenge: ChallengeResponse
    model_config = ConfigDict(from_attributes=True)


class ChallengeOptInRequest(BaseModel):
    challenge_id: str


class ChallengeListResponse(BaseModel):
    challenges: List[ChallengeResponse]
    active_user_challenges: List[UserChallengeResponse]
