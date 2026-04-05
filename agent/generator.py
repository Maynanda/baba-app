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
Your goal is to transform a technical article into a high-engagement social media carousel.

SOURCE ARTICLE:
---
TITLE: {article_title}
BODY: {article_body}
---

INSTRUCTIONS:
1. Extract the most valuable insights from the source.
2. Draft a 5-slide carousel in the following format. 
3. The tone should be "AI practitioner who explains it simply".
4. You MUST fill every single placeholder defined for the template.
5. Also, draft a highly engaging post caption for LinkedIn/Instagram. Use emojis and hashtags.

TEMPLATE PLACEHOLDERS:
{placeholders}

OUTPUT FORMAT (JSON ONLY):
{{
  "content_name": "Short catchy name for this post",
  "slides": [
    {{
      "type": "hook",
      "HOOK_TITLE": "...",
      "HOOK_SUB": "..."
    }},
    {{
      "type": "body_1",
      "BODY_1_TITLE": "...",
      "BODY_1_TEXT": "..."
    }},
    {{
      "type": "body_2",
      "BODY_2_TITLE": "...",
      "BODY_2_TEXT": "..."
    }},
    {{
      "type": "body_3",
      "BODY_3_TITLE": "...",
      "BODY_3_TEXT": "..."
    }},
    {{
      "type": "cta",
      "CTA_TITLE": "...",
      "CTA_TEXT": "..."
    }}
  ],
  "caption": "Your LinkedIn/Insta post body text goes here..."
}}
"""

def generate_draft(raw_id: str, template_id: str = "carousel_dark_1x1") -> Optional[dict]:
    """
    Uses Gemini to generate a post draft from a raw article ID.
    Returns a dict that can be used to populate the 'posts' table.
    """
    # 1. Fetch raw content
    raw_item = get_raw_item(raw_id)
    if not raw_item:
        print(f"[agent] Error: Raw content {raw_id} not found.")
        return None

    # Parse raw data_json if it exists to get the body
    try:
        raw_data = json.loads(raw_item["data_json"])
        article_title = raw_data.get("title", raw_item["title"])
        article_body = raw_data.get("body", "")
        # If body is empty, try to use summary or other field
        if not article_body:
            article_body = raw_data.get("summary", "No body text found.")
    except Exception:
        article_title = raw_item["title"]
        article_body = "Could not parse body text."

    # 2. Get template placeholders
    try:
        template_meta = load_template_metadata(template_id)
        # registry path is "folder/filename.pptx"
        pptx_rel_path = template_meta["path"]
        pptx_full_path = (BASE_DIR / "templates" / pptx_rel_path)
        
        # template config is usually "template.json" in the same folder
        tpl_json_path = pptx_full_path.parent / "template.json"
        
        with open(tpl_json_path, "r") as f:
            template_json = json.load(f)
        placeholders = template_json.get("placeholders", [])
    except Exception as e:
        print(f"[agent] Error loading template metadata: {e}")
        return None

    # 3. Call Gemini
    prompt = PROMPT_TEMPLATE.format(
        article_title=article_title,
        article_body=article_body[:10000],  # Truncate if too long
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
        
        # Parse result
        result = json.loads(response.text)
        
        # Add metadata for DB
        result["id"] = f"post_ai_{raw_id}_{template_id}"
        result["status"] = "draft"
        result["niche"] = raw_item.get("niche", "ai-engineering")
        result["template"] = template_id
        result["platforms"] = template_json.get("platforms", ["linkedin"]) # default to what's in template
        
        return result
        
    except Exception as e:
        print(f"[agent] Gemini call failed: {e}")
        return None

if __name__ == "__main__":
    # Quick test
    import sys
    if len(sys.argv) > 1:
        rid = sys.argv[1]
        print(f"Generating draft for {rid}...")
        draft = generate_draft(rid)
        if draft:
            print(json.dumps(draft, indent=2))
    else:
        print("Usage: python agent/generator.py <raw_content_id>")
