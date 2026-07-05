from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import get_settings

def get_coach_llm() -> ChatGoogleGenerativeAI:
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured.")
        
    return ChatGoogleGenerativeAI(
        model=settings.GEMINI_COACH_MODEL,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.7,
        convert_system_message_to_human=True
    )
