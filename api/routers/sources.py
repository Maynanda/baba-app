from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import yaml
from pathlib import Path
import os

router = APIRouter(tags=["Sources"])

FEEDS_PATH = Path("config/feeds.yaml")
PORTALS_PATH = Path("config/portals.yaml")

class FeedEntry(BaseModel):
    url: str
    name: str
    niche: str
    frequency: str = "6h"

class PortalEntry(BaseModel):
    id: str
    url: str
    niche: str
    selectors: dict

@router.put("/feeds")
def update_feed(feed: FeedEntry):
    data = load_yaml(FEEDS_PATH)
    feeds = data.get("feeds", [])
    # Find and update
    for i, f in enumerate(feeds):
        if f["url"] == feed.url:
            feeds[i] = feed.dict()
            data["feeds"] = feeds
            save_yaml(FEEDS_PATH, data)
            return {"message": "Feed updated successfully", "feeds": feeds}
    raise HTTPException(status_code=404, detail="Feed not found")

def load_yaml(path: Path):
    if not path.exists():
        return {}
    with open(path, "r") as f:
        return yaml.safe_load(f) or {}

def save_yaml(path: Path, data: dict):
    os.makedirs(path.parent, exist_ok=True)
    with open(path, "w") as f:
        yaml.dump(data, f, sort_keys=False)

@router.get("/feeds")
def get_feeds():
    data = load_yaml(FEEDS_PATH)
    return data.get("feeds", [])

@router.post("/feeds")
def add_feed(feed: FeedEntry):
    data = load_yaml(FEEDS_PATH)
    feeds = data.get("feeds", [])
    # Check duplicate
    if any(f["url"] == feed.url for f in feeds):
        raise HTTPException(status_code=400, detail="Feed already exists")
    feeds.append(feed.dict())
    data["feeds"] = feeds
    save_yaml(FEEDS_PATH, data)
    return {"message": "Feed added successfully", "feeds": feeds}

@router.delete("/feeds")
def remove_feed(url: str):
    data = load_yaml(FEEDS_PATH)
    feeds = data.get("feeds", [])
    new_feeds = [f for f in feeds if f["url"] != url]
    data["feeds"] = new_feeds
    save_yaml(FEEDS_PATH, data)
    return {"message": "Feed removed", "feeds": new_feeds}

@router.get("/portals")
def get_portals():
    data = load_yaml(PORTALS_PATH)
    return data.get("portals", [])

@router.delete("/portals/{portal_id}")
def remove_portal(portal_id: str):
    data = load_yaml(PORTALS_PATH)
    portals = data.get("portals", [])
    new_portals = [p for p in portals if p["id"] != portal_id]
    data["portals"] = new_portals
    save_yaml(PORTALS_PATH, data)
    return {"message": "Portal removed", "portals": new_portals}
