from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date

class UserProfileBase(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    age: int = Field(..., ge=0, le=120)
    sex: str = Field(..., pattern="^(male|female|other)$")
    height_cm: float = Field(..., ge=30.0, le=300.0)
    weight_kg: float = Field(..., ge=10.0, le=500.0)
    goal: str = Field(..., pattern="^(lose|maintain|gain)$")
    target_weight_kg: Optional[float] = Field(None, ge=10.0, le=500.0)
    target_date: Optional[date] = None
    activity_level: str = Field(..., pattern="^(sedentary|light|moderate|active|very_active)$")
    dietary_preferences: List[str] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    timezone: str = Field(default="UTC")
    custom_calorie_target: Optional[int] = Field(None, ge=500, le=10000)
    custom_protein_target: Optional[int] = Field(None, ge=10, le=1000)
    custom_carbs_target: Optional[int] = Field(None, ge=10, le=2000)
    custom_fat_target: Optional[int] = Field(None, ge=10, le=1000)

class UserProfileCreate(UserProfileBase):
    pass

class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    age: Optional[int] = Field(None, ge=0, le=120)
    sex: Optional[str] = Field(None, pattern="^(male|female|other)$")
    height_cm: Optional[float] = Field(None, ge=30.0, le=300.0)
    weight_kg: Optional[float] = Field(None, ge=10.0, le=500.0)
    goal: Optional[str] = Field(None, pattern="^(lose|maintain|gain)$")
    target_weight_kg: Optional[float] = Field(None, ge=10.0, le=500.0)
    target_date: Optional[date] = None
    activity_level: Optional[str] = Field(None, pattern="^(sedentary|light|moderate|active|very_active)$")
    dietary_preferences: Optional[List[str]] = None
    allergies: Optional[List[str]] = None
    timezone: Optional[str] = None
    custom_calorie_target: Optional[int] = Field(None, ge=500, le=10000)
    custom_protein_target: Optional[int] = Field(None, ge=10, le=1000)
    custom_carbs_target: Optional[int] = Field(None, ge=10, le=2000)
    custom_fat_target: Optional[int] = Field(None, ge=10, le=1000)

class UserProfileResponse(UserProfileBase):
    id: str
    user_id: str
    daily_calorie_target: int
    daily_protein_target: int
    daily_carbs_target: int
    daily_fat_target: int

    class Config:
        from_attributes = True
