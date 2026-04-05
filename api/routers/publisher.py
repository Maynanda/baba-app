"""
api/routers/publisher.py
─────────────────────────────────────────────────────────────────────────────
Publisher Assistant Router — Bridge to Phase 10: Desktop Automation.
Triggers scripts/desktop_publisher.py via subprocess. 
Endpoints are non-blocking where possible.
─────────────────────────────────────────────────────────────────────────────
"""

import subprocess
import os
import sys
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pathlib import Path

router = APIRouter()

# Get absolute path to scripts folder
BASE_DIR = Path(__file__).resolve().parent.parent.parent
SCRIPT_PATH = BASE_DIR / "scripts" / "desktop_publisher.py"
PYTHON_EXE = sys.executable

def run_publisher_script(platform: str, post_id: str):
    """
    Run the desktop_publisher.py script in a subprocess. 
    This is where Playwright will launch the browser on the desktop.
    """
    try:
        print(f"[API Publisher] Triggering background publishing for {platform} on post {post_id}")
        env = os.environ.copy()
        env["PYTHONPATH"] = str(BASE_DIR)
        
        # In a real environment, we'd log the output or stream it.
        subprocess.run(
            [PYTHON_EXE, str(SCRIPT_PATH), "--platform", platform, "--id", post_id],
            env=env, 
            check=True
        )
        print(f"[API Publisher] Successfully completed background process for {platform} / {post_id}")
        
    except subprocess.CalledProcessError as e:
        print(f"  [ERROR] Publisher script failed for {platform}: {e}")
    except Exception as e:
        print(f"  [CRITICAL ERROR] Error triggering publisher: {e}")

@router.post("/push/{platform}/{post_id}")
async def push_to_assistant(platform: str, post_id: str, background_tasks: BackgroundTasks):
    """
    Trigger the Desktop Assistant (Playwright) to open and post.
    Returns immediately while the browser automation runs in the background.
    """
    if platform not in ["linkedin", "instagram_feed", "instagram_story", "tiktok"]:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")
        
    # Check if script exists
    if not SCRIPT_PATH.exists():
        raise HTTPException(status_code=500, detail="Desktop script not found.")
        
    # Add to background tasks
    background_tasks.add_task(run_publisher_script, platform, post_id)
    
    return {
        "status": "started",
        "message": f"Desktop Assistant is launching for {platform}. Please check your browser on the desktop.",
        "post_id": post_id,
        "platform": platform
    }
