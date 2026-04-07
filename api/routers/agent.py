"""
api/routers/agent.py
─────────────────────────────────────────────────────────────────────────────
Agent router — handles AI-powered content drafting.
─────────────────────────────────────────────────────────────────────────────
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from agent.generator import generate_draft, generate_template_design
from src.database import save_post

router = APIRouter()

class DraftRequest(BaseModel):
    raw_id: Optional[str] = None
    raw_ids: Optional[List[str]] = None
    template_id: str = "carousel_dark_1x1"
    pro_mode: bool = False

class DesignRequest(BaseModel):
    description: str

@router.post("/draft")
async def create_ai_draft(body: DraftRequest):
    ...

@router.post("/design")
async def create_ai_template_design(body: DesignRequest):
    """
    Experimental: AI-generated template schema from description.
    """
    try:
        design = generate_template_design(body.description)
        if not design:
            raise HTTPException(status_code=500, detail="AI Design failed.")
        return {
            "status": "success",
            "data": design
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    """
    Trigger AI drafting for one or more raw content items.
    """
    target_ids = body.raw_ids if body.raw_ids else ([body.raw_id] if body.raw_id else [])
    
    # The generator module handles empty target_ids autonomously (Freedom Mode)
    # so we don't need to block here with a 400.
    
    try:
        draft = generate_draft(target_ids, body.template_id, body.pro_mode)
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
