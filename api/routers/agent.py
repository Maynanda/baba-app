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
    user_description: Optional[str] = None

class DesignRequest(BaseModel):
    description: str

@router.post("/draft")
def create_ai_draft(body: DraftRequest):
    """
    Trigger AI drafting for one or more raw content items, or via user description.
    """
    target_ids = body.raw_ids if body.raw_ids else ([body.raw_id] if body.raw_id else [])
    
    try:
        # Pass description to the synthesis engine
        draft = generate_draft(
            target_ids, 
            body.template_id, 
            pro_mode=body.pro_mode,
            user_description=body.user_description
        )
        if not draft:
            raise HTTPException(status_code=500, detail="AI generation failed. Check server logs.")
        
        # Save to database
        save_post(draft)
        
        return {
            "status": "success",
            "message": "AI draft created and saved to pipeline.",
            "data": draft
        }
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/design")
def create_ai_template_design(body: DesignRequest):
    """
    Trigger AI design for a new template schema.
    """
    try:
        design = generate_template_design(body.description)
        if not design:
             raise HTTPException(status_code=500, detail="AI design failed.")
        return {
            "status": "success",
            "message": "AI template design created.",
            "data": design
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
