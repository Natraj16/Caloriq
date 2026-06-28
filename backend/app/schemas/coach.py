from pydantic import BaseModel
from typing import List, Dict

class ChatMessage(BaseModel):
    role: str  # "user" or "model"
    content: str

class CoachChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

class CoachChatResponse(BaseModel):
    reply: str
    data_changed: List[str] = []  # e.g. ["weight", "targets"] — tells frontend what to re-fetch
