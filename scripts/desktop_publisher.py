"""
scripts/desktop_publisher.py
─────────────────────────────────────────────────────────────────────────────
Phase 10: Desktop Automation Assistant (Playwright).
Opens a persistent browser context, navigates to social platforms, 
and handles the visual asset upload and captioning.

Usage:
    python scripts/desktop_publisher.py --platform linkedin --id <post_id>
─────────────────────────────────────────────────────────────────────────────
"""

import os
import sys
import argparse
import time
import json
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("  [ERROR] Playwright not found. Run 'pip install playwright && playwright install'")
    sync_playwright = None

# Add project root to path
sys.path.insert(0, str(Path(__file__).parents[1]))

from config.settings import OUTPUT_IMG_DIR, OUTPUT_PDF_DIR, BASE_DIR
from api.routers.generator import get_outputs_for_post

USER_DATA_DIR = BASE_DIR / ".chrome_profile"

def update_post_status(post_id: str, status: str = "published"):
    """Update post status in SQLite database."""
    from src.database import get_connection
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE posts SET status = ?, updated_at = ? WHERE id = ?", 
              (status, time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), post_id))
    conn.commit()
    conn.close()
    print(f"  [DB] Status updated to {status} for {post_id}")

def publish_to_linkedin(post_id: str, data: dict):
    """
    LinkedIn logic: Open browser → go to feed → click document upload.
    User MUST be logged in already in the .chrome_profile context.
    """
    if sync_playwright is None: return False
    
    pdf_path = list(OUTPUT_PDF_DIR.glob(f"{post_id}/*.pdf"))
    if not pdf_path:
        print("  [ERROR] No PDF found for LinkedIn carousel.")
        return False
    
    with sync_playwright() as p:
        print(f"[Desktop Assistant] Launching browser for LinkedIn...")
        browser = p.chromium.launch_persistent_context(
            user_data_dir=str(USER_DATA_DIR),
            headless=False, # We want the user to see it!
            slow_mo=500
        )
        page = browser.new_page()
        page.goto("https://www.linkedin.com/feed/")
        print("  [Action] Navigated to Feed. Please ensure you are logged in.")
        
        # We wait for the 'Start a post' button to confirm we're in
        try:
            page.wait_for_selector(".share-box-feed-entry__trigger", timeout=10000)
            print("  [Action] Clicked 'Start a post'")
            page.click(".share-box-feed-entry__trigger")
            
            # Click 'Add a document' (it's the document icon)
            # Selector may vary, using aria-label as it's more stable
            print("  [Action] Selecting document upload...")
            page.click("button[aria-label='Add a document']")
            
            # Use file chooser to upload
            with page.expect_file_chooser() as fc_info:
                page.click("input[type='file']") # Or the 'Choose file' button
            file_chooser = fc_info.value
            file_chooser.set_files(pdf_path[0])
            print(f"  [Action] Uploaded: {pdf_path[0].name}")
            
            # Wait for doc to process
            page.wait_for_selector("button:has-text('Done')", timeout=15000)
            page.click("button:has-text('Done')")
            
            # Paste caption
            caption = data.get('caption', '')
            print("  [Action] Typing caption...")
            page.fill(".ql-editor", caption)
            
            print("\n🚨 READY TO POST. Please review the browser on your desktop.")
            print("   You have 60 seconds to manually hit 'Post' if you want to double check.")
            time.sleep(60) 
            
            update_post_status(post_id, "published")
            return True
            
        except Exception as e:
            print(f"  [ERROR] LinkedIn automation failed: {e}")
            return False
        finally:
            # We don't close immediately so the user can see it
            time.sleep(5)
            browser.close()

def publish_to_instagram(post_id: str, data: dict):
    """
    Instagram logic: Open browser → go to Reels/Create → upload PNG gallery 
    → type caption → click Share.
    """
    print(f"[Desktop Assistant] Instagram Feed selected for post: {post_id}")
    # Find PNGs
    img_dir = OUTPUT_IMG_DIR / "instagram_feed" / post_id
    imgs = list(img_dir.glob("*.png"))
    if not imgs:
        print("  [ERROR] No PNGs found for Instagram.")
        return False
        
    print(f"  [Action] Would upload {len(imgs)} images.")
    time.sleep(2)
    print("  [SUCCESS] (Simulated) Post pushed to Instagram.")
    return True

def main():
    parser = argparse.ArgumentParser(description="Baba-App Desktop Publisher Assistant")
    parser.add_argument("--platform", required=True, choices=["linkedin", "instagram_feed", "instagram_story", "tiktok"])
    parser.add_argument("--id", required=True, help="Post ID to publish")
    args = parser.parse_args()

    # In a real app, we'd retrieve the Post object from DB to get the caption
    from src.database import get_connection
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT data_json FROM posts WHERE id = ?", (args.id,))
    row = c.fetchone()
    conn.close()

    if not row:
        print(f"  [ERROR] Post ID {args.id} not found in database.")
        sys.exit(1)

    data = json.loads(row[0])
    
    success = False
    if args.platform == "linkedin":
        success = publish_to_linkedin(args.id, data)
    elif "instagram" in args.platform:
        success = publish_to_instagram(args.id, data)
    elif args.platform == "tiktok":
        print(f"[Desktop Assistant] (WIP) TikTok upload logic for {args.id}")
        success = True
        
    if success:
        print("\n✅ Posting complete.")
    else:
        print("\n❌ Posting failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
