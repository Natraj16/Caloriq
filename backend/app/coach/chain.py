from app.coach.llm import get_coach_llm
from app.coach.prompt import get_coach_prompt
from app.coach.memory import get_or_create_memory, persist_memory

async def run_coach(conversation_id: str, user_message: str, context: dict, llm=None, additional_messages=None):
    """
    Runs the LangChain pipeline for the coach.
    Returns the AIMessage and the memory instance.
    """
    if llm is None:
        llm = get_coach_llm()
        
    prompt = get_coach_prompt()
    memory = get_or_create_memory(conversation_id)
    
    memory_vars = memory.load_memory_variables({"user_message": user_message})
    chat_history = memory_vars.get("chat_history", [])
    
    if additional_messages:
        chat_history.extend(additional_messages)
        
    chain = prompt | llm
    
    response = await chain.ainvoke({
        **context,
        "chat_history": chat_history,
        "user_message": user_message
    })
    
    return response, memory
