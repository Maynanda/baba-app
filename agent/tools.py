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
AVAILABLE_TOOLS = {
    "register_custom_template": register_custom_template,
    "get_template_schema": get_template_schema,
    "list_all_templates": list_all_templates,
    "list_recent_trends": list_recent_trends
}
