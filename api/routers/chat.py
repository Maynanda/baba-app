"""
api/routers/chat.py
─────────────────────────────────────────────────────────────────────────────
Chat router - handles dynamic chat with AI tool access.
─────────────────────────────────────────────────────────────────────────────
"""
import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from agent.chat_agent import chat_with_agent

router = APIRouter()
logger = logging.getLogger("api.chat")

class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]]
    
@router.post("/")
def chat_endpoint(body: ChatRequest):
    try:
        updated_messages, final_text = chat_with_agent(body.messages)
        return {
            "status": "success",
            "messages": updated_messages,
            "reply": final_text
        }
    except Exception as e:
        logger.error(f"Chat error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
