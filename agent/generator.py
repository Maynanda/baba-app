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

TEMPLATE CONTEXT:
Brief: {template_brief}
Styling Mission: {template_ai_instructions}

INSTRUCTIONS:
1. Synthesize the most valuable insights from ALL provided sources.
2. The tone should be "AI practitioner who explains it simply".
3. You MUST fill EVERY SINGLE placeholder defined below. 
4. If a placeholder implies an image (like 'BODY_IMAGE'), describe a high-quality visualization or diagram prompt for it in text.
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
        
        if not response or not response.text:
            logger.error("[agent] Empty response from Gemini.")
            return None

        result_data = json.loads(response.text)
        
        # Canonical structure for database 'posts' table and frontend
        final_post = {
            "id": f"post_ai_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "status": "draft",
            "niche": "AI Engineering",
            "template": template_id,
            "platforms": ["linkedin", "instagram_feed"],
            "caption": result_data.get("caption", ""),
            "content_name": result_data.get("content_name", "AI Draft"),
            "slides_data": result_data.get("slides_data", {}), # For frontend ...res.slides_data
            "slides": result_data.get("slides_data", {}),      # For DB saving logic
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
