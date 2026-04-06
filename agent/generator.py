"""
agent/generator.py
─────────────────────────────────────────────────────────────────────────────
AI Agent module — uses Google Gemini to draft slide content and social captions
from raw research articles.

Logic:
1. Fetch raw article body from DB.
2. Load template placeholders.
3. Call Gemini with a structured prompt.
4. Return a dictionary ready for the 'posts' table.
─────────────────────────────────────────────────────────────────────────────
"""

import json
import os
import google.generativeai as genai
from typing import Optional
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agent")

from config.settings import GEMINI_API_KEY
from src.database import get_raw_item
# Assuming this function exists in src.generator.base or similar
# If not, we will read the registry manually.
from src.generator.base import load_template_metadata, BASE_DIR

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

# Define the model — using gemini-flash-latest for stable performance
MODEL_NAME = "gemini-flash-latest"

PROMPT_TEMPLATE = """
You are an expert content creator specializing in AI Engineering and Data Science.
Your goal is to transform one or more technical articles into a high-engagement social media carousel.

SOURCE ARTICLES:
---
{articles_text}
---

AVAILABLE SOURCE IMAGES (Visual Inventory):
{visual_inventory_text}

TEMPLATE CONTEXT:
Brief: {template_brief}
Styling Mission: {template_ai_instructions}

INSTRUCTIONS:
1. Synthesize the most valuable insights from ALL provided sources.
2. The tone should be "AI practitioner who explains it simply".
3. You MUST fill EVERY SINGLE placeholder defined below. 
4. FOR IMAGES: 
   - If a placeholder implies an image (e.g. contains 'IMAGE'), check the Visual Inventory.
   - If a source image is highly relevant (e.g. a technical diagram, chart, or related photo), use its EXACT filename.
   - If no source image fits, describe a new, high-quality visualization prompt.
5. Also, draft a highly engaging post caption for LinkedIn/Instagram. Use emojis and hashtags.
6. MANDATORY: Include the source URLs in the caption for attribution.

REQUIRED PLACEHOLDERS (STRICT - ONLY REALIZE THESE):
{placeholders}

OUTPUT FORMAT (STRICT JSON ONLY):
{{
  "content_name": "Short catchy name for this post",
  "slides_data": {{
      "[PLACEHOLDER_NAME_1]": "Value for placeholder 1...",
      "[PLACEHOLDER_NAME_2]": "Value for placeholder 2...",
      ...
  }},
  "caption": "Your LinkedIn/Insta post body text goes here...",
  "platforms": ["linkedin", "instagram_feed"]
}}
"""

def generate_draft(raw_ids: list[str], template_id: str = "carousel_dark_1x1") -> Optional[dict]:
    """
    Uses Gemini to generate a post draft from one or more raw article IDs.
    Returns a dict that can be used to populate the 'posts' table.
    """
    # 1. Aggregated Research
    aggregated_text = ""
    visual_inventory = []
    articles = []
    
    for raw_id in raw_ids:
        raw_row = get_raw_item(raw_id)
        if not raw_row:
            logger.warning(f"[agent] Warning: Raw content {raw_id} not found.")
            continue
        
        # Convert sqlite3.Row to dict for reliable .get() access
        item = dict(raw_row)
        articles.append(item)
        
        data = json.loads(item.get("data_json", "{}"))
        aggregated_text += f"\nSOURCE: {item.get('title')}\n"
        aggregated_text += f"LINK: {data.get('source_url', 'N/A')}\n"
        aggregated_text += f"{data.get('body', '')[:3000]}\n"
        
        # Collect images for AI selection
        local_imgs = data.get("local_images", [])
        for img in local_imgs:
            visual_inventory.append({
                "article_id": raw_id,
                "filename": img,
                "url": f"/api/data/image/{raw_id}/{img}"
            })

    if not articles:
        return None

    # Limit inventory size for prompt efficiency
    inv_lines = [f"- {iv['filename']} (From: {iv['article_id']})" for iv in visual_inventory[:12]]
    visual_inventory_text = "\n".join(inv_lines) if inv_lines else "None available."

    # 2. Get template placeholders
    try:
        from src.generator.base import load_template_metadata
        template_metadata = load_template_metadata(template_id)
        placeholders = template_metadata.get("placeholders", [])
        if not placeholders:
            # Fallback for old templates
            placeholders = ["HOOK_TITLE", "HOOK_SUB", "BODY_1_TITLE", "BODY_1_TEXT", "CTA_TITLE", "CTA_TEXT"]
    except Exception as e:
        print(f"[agent] Error loading template placeholders for '{template_id}': {e}")
        # Fallback placeholders instead of failing
        placeholders = ["HOOK_TITLE", "HOOK_SUB", "BODY_1_TITLE", "BODY_1_TEXT", "CTA_TITLE", "CTA_TEXT"]

    # 3. Call Gemini
    prompt = PROMPT_TEMPLATE.format(
        articles_text=aggregated_text,
        visual_inventory_text=visual_inventory_text,
        placeholders=", ".join(placeholders),
        template_brief=template_metadata.get("brief", "General technical carousel"),
        template_ai_instructions=template_metadata.get("ai_instructions", "Provide a clear summary of concepts.")
    )

    try:
        logger.info(f"[agent] Calling {MODEL_NAME} for synthesis...")
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        
        raw_response_text = response.text
        # Basic cleanup in case Gemini wrapped it in markdown code blocks
        if raw_response_text.startswith("```json"):
            raw_response_text = raw_response_text.strip("```json").strip("```").strip()
            
        decoded_json = json.loads(raw_response_text)
        
        # Ensure we have a dict
        if isinstance(decoded_json, list) and len(decoded_json) > 0:
            result_data = decoded_json[0]
        elif isinstance(decoded_json, dict):
            result_data = decoded_json
        else:
            logger.error(f"[agent] Unexpected JSON structure: {type(decoded_json)}")
            return None
        
        # 4. Final Processing (Mapping Images)
        slides_data = result_data.get("slides_data", {})
        
        # Cross-reference selected filenames with inventory to get full URLs
        for key, val in slides_data.items():
            if "_IMAGE" in key.upper():
                # Check if it was a source image selection
                match = next((iv for iv in visual_inventory if iv["filename"] == str(val).strip()), None)
                if match:
                    slides_data[key] = match["url"]
        
        # Canonical structure for database 'posts' table and frontend
        final_post = {
            "id": f"post_ai_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "status": "draft",
            "niche": "AI Engineering",
            "template": template_id,
            "platforms": ["linkedin", "instagram_feed"],
            "caption": result_data.get("caption", ""),
            "content_name": result_data.get("content_name", "AI Draft"),
            "slides_data": slides_data, # Use processed slides
            "slides": slides_data, 
            "raw_ref_ids": [a["id"] for a in articles],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        # Merge back any top-level keys from AI if they exist
        for k, v in result_data.items():
            if k not in final_post and k != "slides_data":
                final_post[k] = v
        
        return final_post
        
    except Exception as e:
        logger.error(f"[agent] Gemini synthesis failed: {e}")
        return None

if __name__ == "__main__":
    import sys
    from datetime import datetime
    if len(sys.argv) > 1:
        rid = sys.argv[1:]
        print(f"Generating draft for {rid}...")
        draft = generate_draft(rid)
        if draft:
            print(json.dumps(draft, indent=2))
    else:
        print("Usage: python agent/generator.py <raw_id1> <raw_id2> ...")
