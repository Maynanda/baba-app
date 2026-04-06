"""
api/routers/agent.py
─────────────────────────────────────────────────────────────────────────────
Agent router — handles AI-powered content drafting.
─────────────────────────────────────────────────────────────────────────────
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from agent.generator import generate_draft
from src.database import save_post

router = APIRouter()

class DraftRequest(BaseModel):
    raw_id: Optional[str] = None
    raw_ids: Optional[List[str]] = None
    template_id: str = "carousel_dark_1x1"

@router.post("/draft")
async def create_ai_draft(body: DraftRequest):
    """
    Trigger AI drafting for one or more raw content items.
    """
    target_ids = body.raw_ids if body.raw_ids else ([body.raw_id] if body.raw_id else [])
    if not target_ids:
        raise HTTPException(status_code=400, detail="No raw IDs provided.")

    try:
        draft = generate_draft(target_ids, body.template_id)
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
