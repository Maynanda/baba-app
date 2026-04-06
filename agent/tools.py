import json
import logging
import os
from typing import List, Dict, Any
from src.database import get_connection

logger = logging.getLogger("agent.tools")

def register_new_template(name: str, description: str, placeholders: List[str], brief: str = "", ai_instructions: str = "") -> str:
    """
    Registers a new design template into both DB and the file system.
    This allows the AI to dynamically design entire content schemas for better synthesis.
    """
    try:
        from src.generator.base import BASE_DIR
        template_id = f"ai_{name.lower().replace(' ', '_')}_{int(os.urandom(2).hex(), 16)}"
        
        # 1. DB Save
        conn = get_connection()
        conn.execute(
            "INSERT INTO templates (id, name, description, placeholders, created_at) VALUES (?, ?, ?, ?, ?)",
            (template_id, name, description, json.dumps(placeholders), datetime.now().isoformat())
        )
        conn.commit()
        conn.close()
        
        # 2. File System Save (for the visual engine to load)
        t_dir = BASE_DIR / "templates" / template_id
        t_dir.mkdir(parents=True, exist_ok=True)
        
        meta = {
            "id": template_id,
            "name": name,
            "brief": brief or description,
            "ai_instructions": ai_instructions or "Synthesize relevant content from sources.",
            "placeholders": placeholders
        }
        
        with open(t_dir / "template.json", "w") as f:
            json.dump(meta, f, indent=4)
        
        logger.info(f"[tools] AI Created and Registered a new template: {template_id}")
        return f"SUCCESS: Template '{template_id}' created. You can now use it to generate the draft."
    except Exception as e:
        logger.error(f"[tools] Failed to register template: {e}")
        return f"ERROR: Could not register template: {str(e)}"

def list_available_templates() -> str:
    """
    Returns a lists of all available templates in the system.
    """
    try:
        from src.generator.base import load_template_metadata
        # Check standard templates
        # Actually just scan directories
        from src.generator.base import BASE_DIR
        t_root = BASE_DIR / "templates"
        templates = []
        for d in t_root.iterdir():
            if d.is_dir() and (d / "template.json").exists():
                with open(d / "template.json", 'r') as f:
                    meta = json.load(f)
                    templates.append(f"{meta.get('id')}: {meta.get('name')} - {meta.get('brief')}")
        return "AVAILABLE TEMPLATES:\n" + "\n".join(templates)
    except Exception as e:
        return f"Error listing templates: {e}"

def list_recent_trends() -> str:
    """
    Scans the latest 10 articles in the database to provide a summary of current research trends.
    """
    try:
        from src.database import get_all_raw
        raw_list = get_all_raw()[:10]
        titles = [f"- {r['title']} ({r['source_type'] if 'source_type' in r else 'article'})" for r in raw_list]
        return "LATEST 10 RESEARCH ENTRIES:\n" + "\n".join(titles)
    except Exception as e:
        return f"Error scanning trends: {e}"

# This dictionary maps tool names to their implementations for the agent dispatcher
AVAILABLE_TOOLS = {
    "register_new_template": register_new_template,
    "list_available_templates": list_available_templates,
    "list_recent_trends": list_recent_trends
}
