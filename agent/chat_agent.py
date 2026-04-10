"""
agent/chat_agent.py
─────────────────────────────────────────────────────────────────────────────
AI Chat Agent module with dynamic tool usage.
─────────────────────────────────────────────────────────────────────────────
"""
import logging
import json
from google import genai
from google.genai import types

from config.settings import GEMINI_API_KEY, GEMINI_MODEL
from agent.tools import AVAILABLE_TOOLS

logger = logging.getLogger("agent.chat")

_RAW_KEY = (GEMINI_API_KEY or "").strip().strip("'").strip('"')
_CLEAN_MODEL = GEMINI_MODEL.replace("models/", "") if GEMINI_MODEL else "gemini-1.5-flash"
client = genai.Client(api_key=_RAW_KEY)

MODEL_FALLBACKS = [_CLEAN_MODEL, "gemini-flash-latest", "gemini-2.0-flash", "gemini-2.5-flash"]

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

tool_declarations = [types.Tool(function_declarations=[
    types.FunctionDeclaration(
        name=f_name,
        description=f_func.__doc__ or "Agent tool for research or design.",
        parameters=TOOL_SCHEMAS.get(f_name, {"type": "object", "properties": {}})
    ) for f_name, f_func in AVAILABLE_TOOLS.items()
])]

SYSTEM_PROMPT = """You are an advanced AI assistant integrated into the Baba-App platform.
Your objective is to help the user manage content, query the local database, design templates, and provide insights.
You have access to a set of specialized tools. Whenever the user makes a request that requires looking up data, Use the provided tools (like search_research, list_all_templates, get_research_content). 
Always be concise, intelligent, and understand the user's intent. Do not output raw JSON unless specifically asked; formulate a readable, helpful response."""

def chat_with_agent(history: list) -> tuple[list, str]:
    """
    history: List of dicts e.g., [{"role": "user", "parts": [{"text": "hello"}]}, ...]
    Returns (updated_history, final_response_text)
    """
    # Convert history dicts to types.Content
    messages = []
    
    # Add System Instruction as the first message if needed, or rely on model instructions.
    # GenAI Python SDK handles system instructions in GenerateContentConfig.
    
    for msg in history:
        role = msg.get("role")
        parts = []
        for p in msg.get("parts", []):
            if "text" in p:
                parts.append(types.Part(text=p["text"]))
            elif "function_call" in p:
                # Reconstruct function call
                fc = types.FunctionCall(name=p["function_call"]["name"], args=p["function_call"]["args"])
                parts.append(types.Part(function_call=fc))
            elif "function_response" in p:
                fr = types.FunctionResponse(name=p["function_response"]["name"], response=p["function_response"]["response"])
                parts.append(types.Part(function_response=fr))
        
        messages.append(types.Content(role=role, parts=parts))

    # Fallback to model cycle
    active_model = MODEL_FALLBACKS[0]
    
    # Let the agent take up to 4 turns (tool execution loops)
    for turn in range(4):
        logger.info(f"[chat_agent] Turn {turn+1} with {active_model}")
        try:
            response = client.models.generate_content(
                model=active_model,
                contents=messages,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.7,
                    tools=tool_declarations,
                )
            )
        except Exception as e:
            logger.error(f"[chat_agent] Error calling Gemini: {e}")
            raise e

        if not response.candidates:
            return _dictify_history(messages), "Error: No response generated."
            
        candidate = response.candidates[0]
        messages.append(candidate.content)
        
        tool_calls = [p.function_call for p in candidate.content.parts if getattr(p, "function_call", None)]
        
        if not tool_calls:
            # Done! Agent provided text.
            final_text = "".join([p.text for p in candidate.content.parts if getattr(p, "text", None)])
            return _dictify_history(messages), final_text
            
        # Execute tool calls
        response_parts = []
        for fc in tool_calls:
            tool_name = fc.name
            args = dict(fc.args) if fc.args else {}
            logger.info(f"[chat_agent] Executing tool: {tool_name}({args})")
            
            if tool_name in AVAILABLE_TOOLS:
                try:
                    result = AVAILABLE_TOOLS[tool_name](**args)
                    response_parts.append(types.Part(function_response=types.FunctionResponse(name=tool_name, response={"result": result})))
                except Exception as ex:
                    response_parts.append(types.Part(function_response=types.FunctionResponse(name=tool_name, response={"error": str(ex)})))
            else:
                response_parts.append(types.Part(function_response=types.FunctionResponse(name=tool_name, response={"error": "Tool not found"})))
                
        # Append tool results as user role
        messages.append(types.Content(role="user", parts=response_parts))

    return _dictify_history(messages), "Internal limit reached. The agent stopped answering."

def _dictify_history(messages):
    """ Converts types.Content back into simple dicts for JSON serialization to the frontend. """
    history = []
    for m in messages:
        parts = []
        for p in m.parts:
            if getattr(p, "text", None):
                parts.append({"text": p.text})
            elif getattr(p, "function_call", None):
                parts.append({
                    "function_call": {
                        "name": p.function_call.name,
                        "args": dict(p.function_call.args) if p.function_call.args else {}
                    }
                })
            elif getattr(p, "function_response", None):
                parts.append({
                    "function_response": {
                        "name": p.function_response.name,
                        "response": dict(p.function_response.response) if p.function_response.response else {}
                    }
                })
        # The genai SDK uses 'model' instead of 'assistant'.
        role = m.role if m.role else "user"
        history.append({"role": role, "parts": parts})
    return history
