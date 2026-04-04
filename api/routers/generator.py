"""
api/routers/generator.py
─────────────────────────────────────────────────────────────────────────────
Generator router — triggers visual asset generation and serves output images.

All generation jobs run in BackgroundTasks (non-blocking).
Generated images are served as static files via /api/generator/images/{path}.

Endpoints:
  GET  /api/generator/templates      → List all available PPTX templates
  GET  /api/generator/templates/{id} → Get a single template's full JSON schema
  POST /api/generator/generate       → Trigger PPTX → PDF → PNG generation
  GET  /api/generator/outputs/{id}   → List generated output images for a post
─────────────────────────────────────────────────────────────────────────────
"""

import json
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
TEMPLATES_DIR = BASE_DIR / "templates"
REGISTRY_PATH = TEMPLATES_DIR / "registry.json"
OUTPUT_IMG_DIR = BASE_DIR / "output" / "images"

router = APIRouter()


# ── Request schemas ────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    post_id: str
    template_id: str
    platform: str = "linkedin"   # "linkedin" | "instagram_feed" | "instagram_story" | "tiktok"


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/templates")
def list_templates():
    """Return all available templates from the registry."""
    try:
        with open(REGISTRY_PATH) as f:
            registry = json.load(f)
        return {"data": registry.get("templates", [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates/{template_id}")
def get_template(template_id: str):
    """Return a single template's full JSON schema including placeholders."""
    # Check all template subdirectories for a template.json with this id
    for d in TEMPLATES_DIR.iterdir():
        if d.is_dir():
            tj = d / "template.json"
            if tj.exists():
                with open(tj) as f:
                    data = json.load(f)
                if data.get("id") == template_id:
                    return {"data": data}
    raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")


@router.post("/generate")
def generate_visuals(body: GenerateRequest, background_tasks: BackgroundTasks):
    """
    Trigger visual generation for a post.
    Fetches the post from the DB, fills the PPTX template, and produces images.
    Runs in background; returns immediately.
    """
    def _run():
        try:
            import src.database as db
            content = db.get_post(body.post_id)
            if not content:
                print(f"[generator] Post {body.post_id} not found in DB.")
                return

            if body.platform == "linkedin":
                from src.generator.linkedin import generate
                generate(content, body.template_id)
            elif body.platform == "instagram_feed":
                from src.generator.instagram import generate_feed
                generate_feed(content, body.template_id)
            elif body.platform == "instagram_story":
                from src.generator.instagram import generate_story
                generate_story(content, body.template_id)
            elif body.platform == "tiktok":
                from src.generator.tiktok import generate_slideshow
                generate_slideshow(content, body.template_id)
            else:
                print(f"[generator] Unknown platform: {body.platform}")
        except Exception as e:
            print(f"[generator] Error: {e}")

    background_tasks.add_task(_run)
    return {
        "status": "started",
        "job": "visual_generation",
        "post_id": body.post_id,
        "platform": body.platform,
    }


@router.get("/outputs/{post_id}")
def list_outputs(post_id: str):
    """
    List all generated PNG images for a given post_id.
    Scans output/images/ subdirectories recursively for this post's files.
    Returns a list of relative paths that can be passed to /api/generator/image/{path}.
    """
    results = []
    for subdir in OUTPUT_IMG_DIR.iterdir():
        if subdir.is_dir():
            post_dir = subdir / post_id
            if post_dir.exists():
                for img in sorted(post_dir.glob("*.png")):
                    rel = f"{subdir.name}/{post_id}/{img.name}"
                    results.append({
                        "platform": subdir.name,
                        "filename": img.name,
                        "path": rel,
                    })
    return {"data": results, "count": len(results)}


@router.get("/image/{platform}/{post_id}/{filename}")
def serve_image(platform: str, post_id: str, filename: str):
    """Serve a generated PNG image file directly."""
    img_path = OUTPUT_IMG_DIR / platform / post_id / filename
    if not img_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(str(img_path), media_type="image/png")
