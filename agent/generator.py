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

# --- Robust Initialization ---
# 1. Sanitize API Key (strip potential whitespace/quotes)
_RAW_KEY = (GEMINI_API_KEY or "").strip().strip("'").strip('"')

# 2. Sanitize Model Name
# The new google-genai SDK handles prefixing, but passing 'models/' manually can sometimes 
# cause issues depending on the specific API endpoint or SDK version.
_CLEAN_MODEL = GEMINI_MODEL.replace("models/", "") if GEMINI_MODEL else "gemini-1.5-flash"

# Configure Gemini Client
logger.info(f"[agent] Initializing Gemini Client (Model: {_CLEAN_MODEL}, Key: {_RAW_KEY[:6]}...{_RAW_KEY[-3:] if len(_RAW_KEY) > 6 else ''} Len: {len(_RAW_KEY)})")
client = genai.Client(api_key=_RAW_KEY)

# Define the model — centrally managed in config/settings.py
MODEL_NAME = _CLEAN_MODEL
MODEL_FALLBACKS = [MODEL_NAME, "gemini-flash-latest", "gemini-2.0-flash", "gemini-2.5-flash"]

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
AVAILABLE PLACEHOLDERS FOR CHOSEN TEMPLATE:
{placeholders}

TEMPLATE BRIEF:
{template_brief}
{template_ai_instructions}

OUTPUT FORMAT (STRICT JSON ONLY):
{{
  "content_name": "Catchy headline",
  "template_id": "Chosen template ID",
  "caption": "Short, engaging social caption with hooks and hashtags",
  "slides_data": {{
      "[PLACEHOLDER_NAME_1]": "High-impact value statement...",
      "[PLACEHOLDER_NAME_2]": "Visual link: [FILENAME.png] -- Brief text...",
      ...
  }},
  "remarks": "Any technical notes for the editor...",
  "suggested_schema": {{
      "optimal_slide_count": 7,
      "best_visual_strategy": "Diagram-heavy comparison",
      "reason": "Why this content is perfect for this design"
  }}
}}
"""

def generate_draft(raw_ids: list[str], template_id: str = "carousel_dark_1x1", pro_mode: bool = False, user_description: str = "") -> Optional[dict]:
    """
    Uses Gemini to generate a post draft from one or more raw article IDs.
    Returns a dict that can be used to populate the 'posts' table.
    
    pro_mode: If True, enables Automatic Function Calling (AFC) for tools.
    """
    # 1. Aggregated Research
    articles = []
    visual_inventory = []
    
    # If pro_mode is triggered by a description, we might have NO raw_ids initially.
    if user_description and not raw_ids:
        pro_mode = True
        logger.info("[agent] strategic intent mode (Freedom Mode) activated.")
    
    for raw_id in raw_ids:
        raw_row = get_raw_item(raw_id)
        if not raw_row:
            logger.warning(f"[agent] Warning: Raw content {raw_id} not found.")
            continue
        
        item = dict(raw_row)
        articles.append(item)
        
        # Pull images for this specific item as well
        from src.database import get_connection
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT data_json FROM raw_content WHERE id = ?", (raw_id,))
        row = cursor.fetchone()
        if row:
            p = json.loads(row[0])
            for img in (p.get("local_images") or []):
                visual_inventory.append({"article_id": raw_id, "filename": img.split("/")[-1], "url": img})
        conn.close()

    aggregated_text = ""
    for item in articles:
        data = json.loads(item.get("data_json", "{}"))
        aggregated_text += f"\nSOURCE: {item.get('title')}\n"
        aggregated_text += f"LINK: {data.get('source_url', 'N/A')}\n"
        aggregated_text += f"{data.get('body', '')[:3000]}\n"
    
    # If no articles were provided, but we have a description, we rely on tools during Turn 1
    # Force Pro Mode if user gave a description so the agent can SEARCH the DB.
    if user_description:
        pro_mode = True

    # Limit inventory size for prompt efficiency
    inv_lines = [f"- {iv['filename']} (From: {iv['article_id']})" for iv in visual_inventory[:12]]
    visual_inventory_text = "\n".join(inv_lines) if inv_lines else "None available."

    # 2. Get template placeholders
    try:
        from src.generator.base import load_template_metadata
        template_metadata = load_template_metadata(template_id)
        placeholders = template_metadata.get("placeholders", [])
    except Exception:
        placeholders = ["HOOK_TITLE", "HOOK_SUB", "BODY_TITLE", "BODY_TEXT", "CTA_TITLE"]
        template_metadata = {"brief": "General carousel", "ai_instructions": "Focus on high-value points."}

    prompt = PROMPT_TEMPLATE.format(
        articles_text=aggregated_text or "No initial articles provided. Please RESEARCH the database for relevant info.",
        visual_inventory_text=visual_inventory_text,
        placeholders=", ".join(placeholders),
        template_brief=template_metadata.get("brief", "General carousel"),
        template_ai_instructions=template_metadata.get("ai_instructions", "Provide a clear summary.")
    )

    if user_description:
        prompt += f"\n\nUSER'S SPECIAL INSTRUCTION: \"{user_description}\""

    if pro_mode:
        # 2a. Pre-load Context to SAVE TURNS and QUOTA
        # By giving the AI the lists immediately, we save 1-2 network roundtrips (Turn 1/2)
        try:
            from agent.tools import list_all_templates, list_recent_trends
            template_list = list_all_templates()
            recent_trends = list_recent_trends()
        except Exception:
            template_list = "Static: carousel_dark_1x1, carousel_light_1x1"
            recent_trends = "No recent trends found."

        prompt += f"\n\nAUTONOMOUS ORCHESTRATION MODE:\n" \
                  f"SYSTEM CONTEXT (Pre-loaded to save quota):\n" \
                  f"--- AVAILABLE TEMPLATES ---\n{template_list}\n" \
                  f"--- RECENT RESEARCH ---\n{recent_trends}\n\n" \
                  "INSTRUCTIONS:\n" \
                  "1. Read the user instruction carefully.\n" \
                  "2. If context is missing, use 'search_research' and 'get_research_content' to find article bodies (REQUIRED if you don't have enough facts).\n" \
                  "3. Use the TEMPLATES list above to select a design. CALL tools ONLY if you need deep details (get_template_schema).\n" \
                  "4. If no existing template is perfect, use 'register_custom_template' to DESIGN a pixel-perfect layout.\n" \
                  "5. CRITICAL: Once you have facts and a template, RETURN THE DRAFT JSON IMMEDIATELY. Do not talk unnecessarily.\n"

    import time
    import random
    from agent.tools import AVAILABLE_TOOLS
    
    # 3. Agentic Execution Loop (Manual Orchestration)
    if not pro_mode:
        # LEGACY/SIMPLE PATH: Standard Magic Draft
        final_post_raw = None
        for model_to_try in MODEL_FALLBACKS:
            max_retries = 3
            retry_delay = 2
            for attempt in range(max_retries):
                try:
                    logger.info(f"[agent] Standard synthesis with {model_to_try} (attempt {attempt+1})...")
                    response = client.models.generate_content(
                        model=model_to_try,
                        contents=[prompt],
                        config=types.GenerateContentConfig(
                            temperature=0.7,
                            response_mime_type="text/plain",
                        )
                    )
                    final_post_raw = response
                    break
                except Exception as e:
                    err_str = str(e).upper()
                    if ("503" in err_str or "UNAVAILABLE" in err_str or "HIGH DEMAND" in err_str) and attempt < max_retries - 1:
                        wait_time = retry_delay * (2 ** attempt) + (random.uniform(0, 1))
                        logger.warning(f"[agent] Gemini Busy (503). Retrying in {wait_time:.1f}s... (Attempt {attempt+1}/{max_retries})")
                        time.sleep(wait_time)
                        continue
                    elif "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                        logger.warning(f"[agent] Quota Exceeded (429) for {model_to_try}. Falling back...")
                        break # Try next model
                    else:
                        logger.error(f"[agent] Standard Gemini synthesis failed: {e}")
                        return None
            if final_post_raw:
                response = final_post_raw
                break
        else:
            logger.error("[agent] All model fallbacks exhausted.")
            return None
    if pro_mode:
        from agent.tools import AVAILABLE_TOOLS
        
        # Tool schemas for manual orchestration loop
        TOOL_SCHEMAS = {
            "register_custom_template": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "name": {"type": "string"},
                    "aspect_ratio": {"type": "string"},
                    "placeholders": {"type": "array", "items": {"type": "string"}},
                    "description": {"type": "string"}
                },
                "required": ["id", "name", "aspect_ratio", "placeholders"]
            },
            "get_template_schema": {
                "type": "object",
                "properties": {"template_id": {"type": "string"}},
                "required": ["template_id"]
            },
            "search_research": {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"]
            },
            "get_research_content": {
                "type": "object",
                "properties": {"article_ids": {"type": "array", "items": {"type": "string"}}},
                "required": ["article_ids"]
            },
            "list_all_templates": {"type": "object", "properties": {}},
            "list_recent_trends": {"type": "object", "properties": {}}
        }

        # Properly declare tools for the Gemini model
        tool_declarations = [types.Tool(function_declarations=[
            types.FunctionDeclaration(
                name=f_name,
                description=f_func.__doc__ or "Agent tool for research or design.",
                parameters=TOOL_SCHEMAS.get(f_name, {"type": "object", "properties": {}})
            ) for f_name, f_func in AVAILABLE_TOOLS.items()
        ])]
        
        messages = [types.Content(role="user", parts=[types.Part(text=prompt)])]
        final_response = None
        
        # We cycle through models for the WHOLE multi-turn loop if needed
        for model_to_try in MODEL_FALLBACKS:
            completed_loop = True
            current_messages = list(messages)
            
            for turn in range(4): # Reduced turns to save quota
                max_retries = 3
                retry_delay = 3
                
                response = None
                for attempt in range(max_retries):
                    try:
                        logger.info(f"[agent] Pro Mode turn {turn+1} ({model_to_try}) (attempt {attempt+1})...")
                        response = client.models.generate_content(
                            model=model_to_try,
                            contents=current_messages,
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
                            logger.warning(f"[agent] Gemini Busy (503). Retrying in {wait_time:.1f}s...")
                            time.sleep(wait_time)
                            continue
                        elif "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                             logger.warning(f"[agent] Quota Hit (429) for {model_to_try} at Turn {turn+1}.")
                             completed_loop = False
                             break # Break attempt loop
                        else:
                            logger.error(f"[agent] Pro Mode Gemini failed at turn {turn+1}: {e}")
                            return None
                
                if not completed_loop:
                    break # Break turn loop, try next model
                    
                if not response or not response.candidates:
                    logger.error("[agent] No candidates in Gemini response.")
                    return None
                    
                candidate = response.candidates[0]
                current_messages.append(candidate.content)
                
                # Check for Tool Calls
                tool_calls = [p.function_call for p in candidate.content.parts if p.function_call]
                
                if not tool_calls:
                    # Check if we have VALID JSON in the response
                    text_content = candidate.content.parts[0].text if candidate.content.parts else ""
                    import re # Ensure re is imported
                    json_match = re.search(r'\{.*\}', text_content, re.DOTALL)
                    
                    if json_match:
                        try:
                            json.loads(json_match.group())
                            logger.info(f"[agent] Found valid JSON in Turn {turn+1}. Synthesis complete.")
                            final_response = response
                            break
                        except json.JSONDecodeError:
                            pass 
                    
                    if turn < 3:
                        logger.info(f"[agent] Turn {turn+1} conversational. Nudging for JSON...")
                        current_messages.append(types.Content(role="user", parts=[
                            types.Part.from_text("Excellent analysis. Now PROVIDE the final carousel draft in strict JSON format (content_name, template_id, caption, slides_data).")
                        ]))
                        continue
                    else:
                        final_response = response
                        break
                    
                # Execute Tool Calls
                logger.info(f"[agent] AI requested {len(tool_calls)} tool calls.")
                response_parts = []
                for fc in tool_calls:
                    tool_name = fc.name
                    args = fc.args or {}
                    if tool_name in AVAILABLE_TOOLS:
                        logger.info(f"[agent] Executing: {tool_name}({args})")
                        try:
                            result = AVAILABLE_TOOLS[tool_name](**args)
                            response_parts.append(types.Part(function_response=types.FunctionResponse(name=tool_name, response={"result": result})))
                        except Exception as tool_err:
                            response_parts.append(types.Part(function_response=types.FunctionResponse(name=tool_name, response={"error": str(tool_err)})))
                    else:
                        response_parts.append(types.Part(function_response=types.FunctionResponse(name=tool_name, response={"error": "Tool not found."})))
                
                current_messages.append(types.Content(role="tool", parts=response_parts))
            
            if completed_loop and final_response:
                break # Success!
            
        else:
            logger.error("[agent] All model fallbacks for Pro Mode exhausted.")
            return None

        response = final_response
        

    # 4. Final Parse of JSON Draft
    raw_response_text = ""
    try:
        # Try to get text from the latest turn's response
        if response and response.candidates and response.candidates[0].content.parts:
            raw_response_text = response.candidates[0].content.parts[0].text or ""
        
        # If still empty, look at the very last message in the agent's memory
        if not raw_response_text and messages:
            last_msg = messages[-1]
            if last_msg.parts:
                raw_response_text = last_msg.parts[0].text or ""

        # Extract JSON block using regex
        import re
        json_match = re.search(r'(\{.*\})', raw_response_text, re.DOTALL)
        if not json_match:
            logger.error(f"[agent] Could not find JSON block in AI text: {raw_response_text[:200]}...")
            return None
        
        result_data = json.loads(json_match.group(1))
        
        # Schema Validation & Normalization
        if not isinstance(result_data, dict):
            logger.error(f"[agent] AI returned JSON that is not an object: {type(result_data)}")
            return None
            
        # Ensure 'slides_data' exists
        if "slides_data" not in result_data:
            if "slides" in result_data:
                result_data["slides_data"] = result_data["slides"]
            else:
                result_data["slides_data"] = {k: v for k, v in result_data.items() if k not in ["content_name", "template_id", "caption", "niche", "platform"]}
        
        # Map Images (Back to inventory)
        slides_data = result_data.get("slides_data", {})
        if isinstance(slides_data, list):
            # Convert list of single-key dicts to a single dict
            new_slides = {}
            for item in slides_data:
                if isinstance(item, dict): new_slides.update(item)
            slides_data = new_slides

        for key, val in slides_data.items():
            if "_IMAGE" in key.upper() and val:
                match = next((iv for iv in visual_inventory if iv["filename"] == str(val).strip()), None)
                if match:
                    slides_data[key] = match["url"]
        
        # Build Final Canonical Object
        from datetime import datetime
        final_post = {
            "id": f"post_ai_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "status": "draft",
            "niche": result_data.get("niche", "AI Engineering"),
            "template": result_data.get("template_id", template_id),
            "platforms": result_data.get("platforms", ["linkedin", "instagram_feed"]),
            "caption": result_data.get("caption", ""),
            "content_name": result_data.get("content_name", "AI Draft"),
            "slides_data": slides_data, 
            "slides": slides_data, 
            "raw_ref_ids": [a["id"] for a in articles],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        logger.info(f"[agent] Synthesis Successful! Draft: {final_post['content_name']}")
        return final_post

    except Exception as e:
        logger.error(f"[agent] Final synthesis parsing error: {e}")
        logger.error(traceback.format_exc())
        return None

def generate_template_design(description: str) -> Optional[dict]:
    """
    Experimental Agent: Designs a new carousel template schema based on a text description.
    """
    prompt = f"""
    SYSTEM: You are a Lead UI/UX Designer for the Baba-App Carousel platform.
    TASK: Design a complete JSON schema for a new carousel template based on the user's description.
    
    TIPS FOR SUCCESS:
    1. Select a high-end color palette (background, accent_primary, text_primary).
    2. Define logical placeholders (e.g., HOOK_TITLE, BODY_1_SUB, BODY_3_CHART).
    3. Determine the structure (Hook, Body, CTA).
    
    USER DESCRIPTION: "{description}"
    
    OUTPUT FORMAT (STRICT JSON ONLY):
    {{
      "id": "slug_style_id",
      "name": "Human Readable Name",
      "aspect_ratio": "1:1" or "4:5",
      "platforms": ["linkedin", "instagram_feed"],
      "niche": ["e.g., tech-news", "business"],
      "status": "draft",
      "description": "Short explanation of the intent",
      "placeholders": ["P1", "P2", ...],
      "slides": [
        {{ "index": 0, "type": "hook" }},
        {{ "index": 1, "type": "body" }},
        ...
      ],
      "colors": {{
        "background": "#HEX",
        "accent_primary": "#HEX",
        "text_primary": "#HEX",
        "text_secondary": "#HEX"
      }}
    }}
    """

    import time
    import random
    max_retries = 3
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            logger.info(f"[design_agent] Designing template for: {description} (attempt {attempt+1})...")
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    temperature=0.8,
                    response_mime_type="application/json",
                )
            )
            
            if not response.text:
                return None
                
            return json.loads(response.text)
            
        except Exception as e:
            err_str = str(e).upper()
            if ("503" in err_str or "UNAVAILABLE" in err_str or "HIGH DEMAND" in err_str) and attempt < max_retries - 1:
                wait_time = retry_delay * (2 ** attempt) + (random.uniform(0, 1))
                logger.warning(f"[design_agent] Gemini Busy (503). Retrying in {wait_time:.1f}s... (Attempt {attempt+1})")
                time.sleep(wait_time)
                continue
            else:
                logger.error(f"[design_agent] Design failed: {e}")
                logger.error(traceback.format_exc())
                return None
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
