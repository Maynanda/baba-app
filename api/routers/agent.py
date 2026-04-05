"""
api/routers/agent.py
─────────────────────────────────────────────────────────────────────────────
Agent router — handles AI-powered content drafting.
─────────────────────────────────────────────────────────────────────────────
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional

from agent.generator import generate_draft
from src.database import save_post

router = APIRouter()

class DraftRequest(BaseModel):
    raw_id: str
    template_id: str = "carousel_dark_1x1"

@router.post("/draft")
async def create_ai_draft(body: DraftRequest):
    """
    Trigger AI drafting for a raw content item.
    This is a synchronous call for now so the user gets the draft immediately.
    """
    try:
        draft = generate_draft(body.raw_id, body.template_id)
        if not draft:
            raise HTTPException(status_code=500, detail="AI generation failed. Check server logs.")
        
        # Save to database
        # generate_draft already returns a dict compatible with save_post
        save_post(draft)
        
        return {
            "status": "success",
            "message": "AI draft created and saved to pipeline.",
            "data": draft
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
