from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional

class WeightLogBase(BaseModel):
    weight_kg: float = Field(..., ge=10.0, le=500.0)
    logged_at: Optional[datetime] = None

class WeightLogCreate(WeightLogBase):
    pass

class WeightLogResponse(WeightLogBase):
    id: str
    user_id: str
    logged_at: datetime

    class Config:
        from_attributes = True
