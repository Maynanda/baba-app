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
from google import genai
from google.genai import types
from typing import Optional
from datetime import datetime
import logging
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agent")

from config.settings import GEMINI_API_KEY, GEMINI_MODEL
from src.database import get_raw_item
# Import our new Modular Agent Tools
from agent.tools import register_custom_template, list_recent_trends

# Configure Gemini Client
client = genai.Client(api_key=GEMINI_API_KEY)

# Define the model — centrally managed in config/settings.py
MODEL_NAME = GEMINI_MODEL

def list_available_models():
    """Diagnostic tool to see what models your API key can access."""
    try:
        models = client.models.list()
        logger.info("[agent] Available models:")
        for m in models:
            logger.info(f" - {m.name}")
    except Exception as e:
        logger.error(f"[agent] Could not list models: {e}")

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
7. VISUAL STRATEGY: If the technical insights are text-heavy or complex, favor 'Visual Slides'. 
   - Assign source diagrams/photos to [PLACEHOLDER_IMAGE] keys.
   - If no source image fits, describe a pixel-perfect visualization prompt for that slide.
8. OPTIONAL: If you suspect a different structure would better convey the story, suggest it in the "suggested_schema" field.

REQUIRED PLACEHOLDERS (STRICT - ONLY REALIZE THESE):
{placeholders}

OUTPUT FORMAT (STRICT JSON ONLY):
{{
  "content_name": "Short catchy name for this post",
  "template_id": "ONLY include if you used 'register_custom_template' to create a custom one",
  "slides_data": {{
      "[PLACEHOLDER_NAME_1]": "Value for placeholder 1...",
      "[PLACEHOLDER_NAME_2]": "Value for placeholder 2...",
      ...
  }},
  "caption": "Your LinkedIn/Insta post body text goes here...",
  "remarks": "Any technical notes for the editor...",
  "suggested_schema": {{
      "optimal_slide_count": 7,
      "best_visual_strategy": "Diagram-heavy comparison",
      "reason": "Why this content is perfect for this design"
  }}
}}
"""

def generate_draft(raw_ids: list[str], template_id: str = "carousel_dark_1x1", pro_mode: bool = False) -> Optional[dict]:
    """
    Uses Gemini to generate a post draft from one or more raw article IDs.
    Returns a dict that can be used to populate the 'posts' table.
    
    pro_mode: If True, enables Automatic Function Calling (AFC) for tools.
    """
    # 1. Aggregated Research
    aggregated_text = ""
    visual_inventory = []
    articles = []
    
    # Mode Switch: If no IDs, grab the latest 5 research entries for "Strategic Freedom"
    articles_text = ""
    if not raw_ids:
        from src.database import get_all_raw
        raw_list = get_all_raw()
        if raw_list:
            raw_ids = [r["id"] for r in raw_list[:5]]
            logger.info(f"[agent] {'Pro Mode ' if pro_mode else ''}Autopilot on {len(raw_ids)} items.")
        else:
            logger.info("[agent] DB Empty. AI Creative Strategy Mode.")
            articles_text = "No local research available currently. Synthesis from your internal 2026 AI Engineering knowledge base."

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
        
        # Collect images for AI selection (using full URL for frontend preview)
        local_imgs = data.get("local_images", [])
        for img in local_imgs:
            visual_inventory.append({
                "article_id": raw_id,
                "filename": img,
                "url": f"http://localhost:8000/api/data/image/{raw_id}/{img}"
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
    # We provide tools for AFC if pro_mode is enabled
    tools = []
    if pro_mode:
        from agent.tools import AVAILABLE_TOOLS
        tools = list(AVAILABLE_TOOLS.values())
        logger.info(f"[agent] Pro Mode: Enabling Tools {list(AVAILABLE_TOOLS.keys())}")

    prompt = PROMPT_TEMPLATE.format(
        articles_text=aggregated_text,
        visual_inventory_text=visual_inventory_text,
        placeholders=", ".join(placeholders),
        template_brief=template_metadata.get("brief", "General technical carousel"),
        template_ai_instructions=template_metadata.get("ai_instructions", "Provide a clear summary of concepts.")
    )

    if pro_mode:
        prompt += "\n\nAUTONOMOUS DESIGN ORCHESTRATION MODE:\n" \
                  "1. Perform a deep meta-analysis of ALL selected research materials.\n" \
                  "2. Use 'list_all_templates' to see if an existing design fits your synthesis strategy.\n" \
                  "3. Use 'get_template_schema' to inspect a potential template's placeholders and colors.\n" \
                  "4. If no existing template is perfect, use 'register_custom_template' to DESIGN a pixel-perfect layout (colors, aspect ratio, and custom placeholders) for this specific data story.\n" \
                  "5. Return the finalized content matching your chosen or newly created template."

    import time
    import random
    from agent.tools import AVAILABLE_TOOLS
    
    # 3. Agentic Execution Loop (Manual Orchestration)
    # The models.generate_content expects tool declarations (functions) or None
    tool_declarations = list(AVAILABLE_TOOLS.values()) if pro_mode else None
    
    messages = [types.Content(role="user", parts=[types.Part.from_text(prompt)])]
    final_response = None
    
    for turn in range(5):
        max_retries = 3
        retry_delay = 2
        
        response = None
        for attempt in range(max_retries):
            try:
                logger.info(f"[agent] Synthesis turn {turn+1} (attempt {attempt+1})...")
                response = client.models.generate_content(
                    model=MODEL_NAME,
                    contents=messages,
                    config=types.GenerateContentConfig(
                        temperature=0.7,
                        tools=tool_declarations,
                        response_mime_type="text/plain",
                    )
                )
                break
            except Exception as e:
                err_str = str(e).upper()
                if ("503" in err_str or "UNAVAILABLE" in err_str or "HIGH DEMAND" in err_str) and attempt < max_retries - 1:
                    wait_time = retry_delay * (2 ** attempt) + (random.uniform(0, 1))
                    logger.warning(f"[agent] Gemini Busy (503). Retrying in {wait_time:.1f}s... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"[agent] Gemini synthesis failed at turn {turn+1}: {e}")
                    return None

        if not response or not response.candidates:
            logger.error("[agent] No candidates in Gemini response.")
            return None
            
        candidate = response.candidates[0]
        messages.append(candidate.content) # Add model's "thinking" or "call" to history
        
        # Check for Tool Calls
        tool_calls = [p.function_call for p in candidate.content.parts if p.function_call]
        
        if not tool_calls:
            # No more tool calls? This is the final synthesis text.
            final_response = response
            break
            
        # Execute Tool Calls
        logger.info(f"[agent] AI requested {len(tool_calls)} tool calls.")
        response_parts = []
        
        for fc in tool_calls:
            tool_name = fc.name
            args = fc.args or {}
            
            if tool_name in AVAILABLE_TOOLS:
                logger.info(f"[agent] Executing tool: {tool_name}({args})")
                try:
                    # Run the actual local function
                    # Note: We wrap it to match the expected tool signature if needed
                    result = AVAILABLE_TOOLS[tool_name](**args)
                    response_parts.append(types.Part.from_function_response(
                        name=tool_name,
                        response={"result": result}
                    ))
                except Exception as tool_err:
                    logger.error(f"[agent] Tool execution error: {tool_err}")
                    response_parts.append(types.Part.from_function_response(
                        name=tool_name,
                        response={"error": str(tool_err)}
                    ))
            else:
                logger.warning(f"[agent] AI requested unknown tool: {tool_name}")
                response_parts.append(types.Part.from_function_response(
                    name=tool_name,
                    response={"error": "Tool not found."}
                ))
        
        # Add tool responses back to the conversation
        messages.append(types.Content(role="tool", parts=response_parts))
        # Loop continues to the next turn for Gemini to process the tool results
    
    if not final_response:
        logger.error("[agent] Max turns reached without final response.")
        return None
    
    # Correct the reference for follow-up code
    response = final_response
        

    raw_response_text = ""
    try:
        if response.text:
            raw_response_text = response.text
            # Cleanup if Gemini wrapped it in markdown code blocks
            if "```json" in raw_response_text:
                raw_response_text = raw_response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in raw_response_text:
                raw_response_text = raw_response_text.split("```")[1].split("```")[0].strip()
        else:
            logger.error(f"[agent] No text in response. Candidates: {response.candidates}")
            return None
    except ValueError as ve:
         logger.error(f"[agent] Gemini response blocked: {ve}")
         return None
    except Exception as e:
        logger.error(f"[agent] Unexpected text error: {e}")
        logger.error(traceback.format_exc())
        return None
        
    # Basic cleanup in case Gemini wrapped it in markdown code blocks
    if raw_response_text.startswith("```json"):
        raw_response_text = raw_response_text.strip("```json").strip("```").strip()
        
    try:
        decoded_json = json.loads(raw_response_text)
    except json.JSONDecodeError:
        logger.error(f"[agent] Failed to parse JSON from Gemini: {raw_response_text}")
        return None
    
    # Ensure we have a dict
    if isinstance(decoded_json, list) and len(decoded_json) > 0:
        result_data = decoded_json[0]
    elif isinstance(decoded_json, dict):
        result_data = decoded_json
    else:
        logger.error(f"[agent] Unexpected JSON structure: {type(decoded_json)}")
        return None
    
    # 4. Final Processing (Mapping Images)
    raw_slides = result_data.get("slides_data", {})
    
    # Coerce list to dict if Gemini returned a list of slide objects
    slides_data = {}
    if isinstance(raw_slides, list):
        for item in raw_slides:
            if isinstance(item, dict):
                slides_data.update(item)
    elif isinstance(raw_slides, dict):
        slides_data = raw_slides
    
    # Cross-reference selected filenames with inventory to get full URLs
    for key, val in slides_data.items():
        if "_IMAGE" in key.upper() and val:
            # Check if it was a source image selection
            match = next((iv for iv in visual_inventory if iv["filename"] == str(val).strip()), None)
            if match:
                slides_data[key] = match["url"]
    
    # Canonical structure for database 'posts' table and frontend
    final_post = {
        "id": f"post_ai_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "status": "draft",
        "niche": "AI Engineering",
        "template": result_data.get("template_id", template_id), # support autonomous template override
        "platforms": ["linkedin", "instagram_feed"],
        "caption": result_data.get("caption", ""),
        "content_name": result_data.get("content_name", "AI Draft"),
        "slides_data": slides_data, 
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
