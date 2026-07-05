import json
from langchain.memory import ConversationBufferWindowMemory
from langchain_core.messages import messages_from_dict, messages_to_dict
from app.cache import cache

def get_or_create_memory(conversation_id: str, k: int = 10) -> ConversationBufferWindowMemory:
    memory = ConversationBufferWindowMemory(k=k, return_messages=True, input_key="user_message", memory_key="chat_history")
    
    key = f"coach_memory:{conversation_id}"
    data = cache.get(key)
    
    if data:
        try:
            messages_dict = json.loads(data)
            messages = messages_from_dict(messages_dict)
            memory.chat_memory.messages = messages
        except Exception:
            pass
            
    return memory

def persist_memory(conversation_id: str, memory: ConversationBufferWindowMemory) -> None:
    key = f"coach_memory:{conversation_id}"
    messages_dict = messages_to_dict(memory.chat_memory.messages)
    data = json.dumps(messages_dict)
    # Save with 24 hour TTL (86400 seconds)
    cache.set(key, data, ex=86400)
