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

from config.settings import GEMINI_API_KEY
from src.database import get_raw_item
# Assuming this function exists in src.generator.base or similar
# If not, we will read the registry manually.
from src.generator.base import load_template_metadata, BASE_DIR

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

# Define the model — using gemini-1.5-flash for speed as requested
MODEL_NAME = "gemini-1.5-flash"

PROMPT_TEMPLATE = """
You are an expert content creator specializing in AI Engineering and Data Science.
Your goal is to transform one or more technical articles into a high-engagement social media carousel.

SOURCE ARTICLES:
---
{articles_text}
---

INSTRUCTIONS:
1. Synthesize the most valuable insights from ALL provided sources.
2. The tone should be "AI practitioner who explains it simply".
3. You MUST fill EVERY SINGLE placeholder defined below. 
4. If a placeholder implies an image (like 'BODY_IMAGE'), describe a high-quality visualization or diagram prompt for it in text.
5. Also, draft a highly engaging post caption for LinkedIn/Instagram. Use emojis and hashtags.
6. MANDATORY: Include the source URLs in the caption for attribution.

REQUIRED PLACEHOLDERS:
{placeholders}

OUTPUT FORMAT (STRICT JSON ONLY):
{{
  "content_name": "Short catchy name for this post",
  "niche": "AI Engineering",
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
    aggregated_text = ""
    articles = []
    
    # 1. Fetch multiple raw contents
    for raw_id in raw_ids:
        raw_item = get_raw_item(raw_id)
        if not raw_item:
            print(f"[agent] Warning: Raw content {raw_id} not found.")
            continue
        
        try:
            raw_data = json.loads(raw_item["data_json"])
            title = raw_data.get("title", raw_item["title"])
            body = raw_data.get("body", raw_data.get("summary", "No body text."))
            url = raw_data.get("source_url", "")
            
            aggregated_text += f"\nTITLE: {title}\nURL: {url}\nBODY: {body[:3000]}\n---\n"
            articles.append(raw_item)
        except Exception as e:
            print(f"[agent] Error parsing {raw_id}: {e}")

    if not articles:
        return None

    # 2. Get template placeholders
    try:
        from src.generator.base import get_template_path
        pptx_path = get_template_path(template_id)
        # Template config is usually "template.json" in the same folder as the pptx
        tpl_json_path = pptx_path.parent / "template.json"
        
        with open(tpl_json_path, "r") as f:
            template_json = json.load(f)
        placeholders = template_json.get("placeholders", [])
    except Exception as e:
        print(f"[agent] Error loading template placeholders: {e}")
        return None

    # 3. Call Gemini
    prompt = PROMPT_TEMPLATE.format(
        articles_text=aggregated_text,
        placeholders=", ".join(placeholders)
    )

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        
        result = json.loads(response.text)
        
        # Metadata for DB
        result["id"] = f"post_ai_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        result["status"] = "draft"
        result["niche"] = articles[0].get("niche", "ai-engineering")
        result["template"] = template_id
        result["platforms"] = template_json.get("platforms", ["linkedin"])
        result["raw_ref_ids"] = [a["id"] for a in articles] # track multiple refs
        
        return result
        
    except Exception as e:
        print(f"[agent] Gemini synthesis failed: {e}")
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
