import json
import logging
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
from src.database import get_connection

logger = logging.getLogger("agent.tools")

def register_custom_template(
    id: str, 
    name: str, 
    aspect_ratio: str, 
    placeholders: List[str], 
    platforms: List[str] = ["linkedin"],
    niche: List[str] = ["ai_engineering"],
    colors: Dict[str, str] = {"primary": "#1e293b", "secondary": "#f8fafc", "text": "#ffffff"},
    description: str = "AI Generated Template",
    ai_instructions: str = "Synthesize relevant content from sources."
) -> str:
    """
    Registers a new design template into both DB and the file system via the shared API logic.
    Follows the full TemplateDetail schema used by Template Studio.
    """
    try:
        from api.routers.generator import create_template, TemplateCreate
        
        # 1. Prepare schema object
        schema = TemplateCreate(
            id=id,
            name=name,
            aspect_ratio=aspect_ratio,
            placeholders=placeholders,
            platforms=platforms,
            niche=niche,
            colors=colors,
            description=description,
            slides=[{"index": i, "type": "content"} for i in range(len(placeholders))],
            status="active"
        )
        
        # 2. Call the router's creation logic directly
        # This ensuring registry.json and template.json are perfectly synced
        res = create_template(schema)
        
        logger.info(f"[tools] AI Orchestrated a new layout: {id} ({name})")
        return f"SUCCESS: Template '{id}' ({name}) registered with {len(placeholders)} placeholders. Rationale: {description}"
    except Exception as e:
        logger.error(f"[tools] Failed to register custom template: {e}")
        return f"ERROR: Could not register template: {str(e)}"

def get_template_schema(template_id: str) -> str:
    """
    Returns the full JSON schema of a specific template, including its placeholders and color palette.
    Use this to understand available fields before drafting.
    """
    try:
        from api.routers.generator import get_template
        res = get_template(template_id)
        return json.dumps(res.get("data", {}), indent=2)
    except Exception as e:
        return f"ERROR: Template '{template_id}' not found or inaccessible."

def list_all_templates() -> str:
    """
    Lists every template currently in the registry with their IDs and descriptions.
    """
    try:
        from api.routers.generator import list_templates
        res = list_templates()
        templates = res.get("data", [])
        lines = [f"- {t['id']}: {t['name']} ({t['aspect_ratio']}) [{', '.join(t['platforms'])}]" for t in templates]
        return "SYSTEM REGISTRY:\n" + "\n".join(lines)
    except Exception as e:
        return f"ERROR: Could not list registry: {e}"

def list_recent_trends() -> str:
    """
    Scans the latest 10 articles in the database to provide a summary of current research topics.
    """
    try:
        from src.database import get_all_raw
        raw_list = get_all_raw()[:10]
        titles = [f"- {r['title']} (Source: {r['source']})" for r in raw_list]
        return "LATEST 10 RESEARCH ENTRIES:\n" + "\n".join(titles)
    except Exception as e:
        return f"Error scanning trends: {e}"

# Mapping for AFC (Automatic Function Calling)

import sqlite3
from typing import List, Dict

DB_PATH = "data/baba_app.sqlite"

def search_research(query: str, limit: int = 5) -> List[Dict]:
    """
    Search the local research database for articles matching a query keyword.
    Use this to find relevant context for a user's request.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Simple keyword search on title and content
        search_sql = "SELECT id, title, source_name, created_at FROM raw_content WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC LIMIT ?"
        like_q = f"%{query}%"
        cursor.execute(search_sql, (like_q, like_q, limit))
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return results
    except Exception as e:
        return [{"error": str(e)}]

def get_research_content(article_ids: List[str]) -> List[Dict]:
    """
    Fetch the full text body and metadata for specific articles.
    Essential for reading the context before drafting.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        placeholders = ', '.join(['?'] * len(article_ids))
        cursor.execute(f"SELECT * FROM raw_content WHERE id IN ({placeholders})", article_ids)
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return results
    except Exception as e:
        return [{"error": str(e)}]

# --- Existing Template Tools ---
# (Keeping register_custom_template, etc. but adding the new Search tools)

AVAILABLE_TOOLS = {
    "register_custom_template": register_custom_template,
    "get_template_schema": get_template_schema,
    "list_all_templates": list_all_templates,
    "list_recent_trends": list_recent_trends,
    "search_research": search_research,
    "get_research_content": get_research_content
}
