"""
scraper/image_scraper.py
Downloads images from a URL or a list of image URLs.
Saves to data/raw/images/<post_id>/
Called automatically by blog_scraper and rss_scraper.
"""

import os
import sys
import hashlib
import requests
from PIL import Image
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import DATA_RAW_DIR

IMAGE_DIR = DATA_RAW_DIR / "images"
VAULT_DIR = IMAGE_DIR / "_vault"  # Global unique images
VAULT_DIR.mkdir(parents=True, exist_ok=True)

# ... (HEADERS and constants remain same) ...

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/",
}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
TIMEOUT = 10
MIN_SIZE_BYTES = 5000  # 5KB — ignore small icons/pixels

def _get_extension(url: str) -> str:
    path = urlparse(url).path
    ext = os.path.splitext(path)[-1].lower()
    return ext if ext in ALLOWED_EXTENSIONS else ".jpg"

def download_image(url: str, post_id: str) -> str | None:
    """
    Download a single image, validate with PIL, and deduplicate using content hash.
    Saves to data/raw/images/_vault/ for uniqueness.
    Returns the final absolute filepath.
    """
    post_img_cache_dir = IMAGE_DIR / post_id
    post_img_cache_dir.mkdir(parents=True, exist_ok=True)

    try:
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        resp.raise_for_status()
        content = resp.content

        # 1. Size Check
        if len(content) < MIN_SIZE_BYTES:
            print(f"  [image_scraper] Skipping small image ({len(content)} bytes): {url}")
            return None

        # 2. Content Fingerprint (MD5)
        content_hash = hashlib.md5(content).hexdigest()
        ext = _get_extension(url)
        vault_filename = f"{content_hash}{ext}"
        vault_path = VAULT_DIR / vault_filename

        # If already in vault, skip re-validation and just use it
        if vault_path.exists():
            # Link/Copy to post folder for local tracking
            target_path = post_img_cache_dir / vault_filename
            if not target_path.exists():
                with open(target_path, "wb") as f:
                    f.write(content)
            return str(target_path)

        # 3. Breadth/Broken Validation (PILLOW)
        try:
            img = Image.open(BytesIO(content))
            img.verify() # Ensure not corrupted
        except Exception as img_err:
            print(f"  [image_scraper] Corrupted image detected: {url} -> {img_err}")
            return None

        # 4. Save to Vault (Global Uniqueness)
        with open(vault_path, "wb") as f:
            f.write(content)

        # 5. Save to Post folder (Local access)
        target_path = post_img_cache_dir / vault_filename
        with open(target_path, "wb") as f:
            f.write(content)

        print(f"  [image_scraper] Downloaded & Verified → {vault_path.name}")
        return str(target_path)

    except Exception as e:
        print(f"  [image_scraper] Failed to download {url}: {e}")
        return None


def download_images(urls: list[str], post_id: str) -> list[str]:
    """
    Download a list of image URLs for a given post.
    Returns list of saved file paths (skipping failures).
    """
    saved = []
    for url in urls:
        path = download_image(url, post_id)
        if path:
            saved.append(path)
    return saved
