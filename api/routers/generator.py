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
  POST /api/generator/templates      → Create/Update a template schema
─────────────────────────────────────────────────────────────────────────────
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
TEMPLATES_DIR = BASE_DIR / "templates"
REGISTRY_PATH = TEMPLATES_DIR / "registry.json"
OUTPUT_IMG_DIR = BASE_DIR / "output" / "images"

router = APIRouter()


# ── Request schemas ────────────────────────────────────────────────────────────

class TemplateCreate(BaseModel):
    id: str
    name: str
    platforms: List[str]
    aspect_ratio: str
    niche: List[str]
    description: Optional[str] = ""
    placeholders: List[str]
    slides: List[Dict] = []
    colors: Dict[str, str] = {}
    status: str = "draft"

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

    Scans two directory patterns:
      1. NEW:    output/images/{platform}/{post_id}/*.png   (current standard)
      2. LEGACY: output/images/{post_id}/*.png              (old flat structure)

    Returns a list of {platform, filename, path} objects.
    The `path` value is passed directly to GET /api/generator/image/{path}.
    """
    results = []

    # Known platform folder names (new structure)
    KNOWN_PLATFORMS = {"linkedin", "instagram_feed", "instagram_story", "tiktok"}

    for subdir in OUTPUT_IMG_DIR.iterdir():
        if not subdir.is_dir():
            continue

        if subdir.name in KNOWN_PLATFORMS:
            # NEW structure: output/images/{platform}/{post_id}/
            post_dir = subdir / post_id
            if post_dir.exists():
                for img in sorted(post_dir.glob("*.png")):
                    rel = f"{subdir.name}/{post_id}/{img.name}"
                    results.append({
                        "platform": subdir.name,
                        "filename": img.name,
                        "path": rel,
                    })
        elif subdir.name == post_id:
            # LEGACY structure: output/images/{post_id}/ (no platform subfolder)
            for img in sorted(subdir.glob("*.png")):
                rel = f"{post_id}/{img.name}"
                results.append({
                    "platform": "generated",
                    "filename": img.name,
                    "path": rel,
                })

    return {"data": results, "count": len(results)}


@router.get("/image/{platform}/{post_id}/{filename}")
def serve_image(platform: str, post_id: str, filename: str):
    """Serve a generated PNG image file directly (new structure: platform/post_id/file)."""
    img_path = OUTPUT_IMG_DIR / platform / post_id / filename
    if not img_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(str(img_path), media_type="image/png")


@router.get("/image/{post_id}/{filename}")
def serve_image_legacy(post_id: str, filename: str):
    """Serve a PNG image from the legacy flat structure (post_id/file)."""
    img_path = OUTPUT_IMG_DIR / post_id / filename
    if not img_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(str(img_path), media_type="image/png")


@router.get("/reveal/{post_id}")
def reveal_in_finder(post_id: str):
    """Open the output folder in macOS Finder for the given post."""
    import subprocess
    target = BASE_DIR / "output" / "images" / "linkedin" / post_id
    if not target.exists():
        target = BASE_DIR / "output" / "images" / post_id
    if not target.exists():
        target = BASE_DIR / "output"
    try:
        subprocess.run(["open", str(target.absolute())])
        return {"status": "success"}
    except:
        return {"status": "error"}


@router.get("/pdf/{post_id}")
def serve_pdf(post_id: str):
    """Serve the generated LinkedIn PDF file for a post."""
    pdf_path = BASE_DIR / "output" / "pdf" / f"{post_id}_linkedin.pdf"
    if not pdf_path.exists():
        for f in (BASE_DIR / "output" / "pdf").glob(f"{post_id}*.pdf"):
            pdf_path = f
            break
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found")
    return FileResponse(str(pdf_path), media_type="application/pdf", filename=pdf_path.name)


@router.post("/templates")
def create_template(body: TemplateCreate):
    """
    Create or update a template schema. 
    Writes template.json to its folder and updates registry.json.
    """
    try:
        # 1. Ensure folder exists 
        # (Convention: template folders are named after their clear_name_id)
        target_dir = TEMPLATES_DIR / body.id
        target_dir.mkdir(parents=True, exist_ok=True)

        # 2. Write template.json
        with open(target_dir / "template.json", "w") as f:
            json.dump(body.model_dump(), f, indent=2)

        # 3. Update registry.json
        registry = {"templates": []}
        if REGISTRY_PATH.exists():
            with open(REGISTRY_PATH) as f:
                registry = json.load(f)

        # Remove existing if any (by id)
        templates = [t for t in registry.get("templates", []) if t["id"] != body.id]
        
        # Add new short entry (registry only needs high-level info)
        templates.append({
            "id": body.id,
            "name": body.name,
            "platforms": body.platforms,
            "aspect_ratio": body.aspect_ratio,
            "niche": body.niche,
            "status": body.status
        })
        registry["templates"] = templates
        
        with open(REGISTRY_PATH, "w") as f:
            json.dump(registry, f, indent=2)

        return {"status": "success", "message": f"Template '{body.id}' saved and registered."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

