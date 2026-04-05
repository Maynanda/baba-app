"""
api/routers/data.py
─────────────────────────────────────────────────────────────────────────────
Data router — read-only access to the SQLite database.
All endpoints return JSON. No business logic here; just DB queries.

Endpoints:
  GET /api/data/raw              → All raw scraped items
  GET /api/data/content          → All content posts
  GET /api/data/discovered       → All portal-discovered links
  DELETE /api/data/raw/{id}      → Delete a raw item
  DELETE /api/data/content/{id}  → Delete a post
─────────────────────────────────────────────────────────────────────────────
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse
import src.database as db
from config.settings import DATA_RAW_DIR

router = APIRouter()


@router.get("/raw")
def get_raw_data():
    """Return all raw scraped items from the database."""
    try:
        return {"data": db.get_all_raw()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/image/{raw_id}/{filename}")
def serve_raw_image(raw_id: str, filename: str):
    """Serve a raw scraped image from the data/raw/images directory."""
    img_path = DATA_RAW_DIR / "images" / raw_id / filename
    if not img_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(img_path)


@router.get("/content")
def get_content_data():
    """Return all content pipeline posts from the database."""
    try:
        return {"data": db.get_all_posts()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/content")
async def save_content_post(request: Request):
    """Save or update a content post in the database."""
    try:
        payload = await request.json()
        db.save_post(payload)
        return {"saved": payload.get("id")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/discovered")
def get_discovered_links():
    """Return all portal-discovered links awaiting deep scraping."""
    try:
        return {"data": db.get_all_discovered()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/raw/{item_id}")
def delete_raw_item(item_id: str):
    """Delete a single raw item by ID."""
    try:
        conn = db.get_connection()
        conn.cursor().execute("DELETE FROM raw_content WHERE id = ?", (item_id,))
        conn.commit()
        conn.close()
        return {"deleted": item_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/content/{post_id}")
def delete_post(post_id: str):
    """Delete a single content post by ID."""
    try:
        db.delete_post(post_id)
        return {"deleted": post_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
