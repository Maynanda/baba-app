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
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import DATA_RAW_DIR

IMAGE_DIR = DATA_RAW_DIR / "images"
IMAGE_DIR.mkdir(parents=True, exist_ok=True)

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


def _get_extension(url: str) -> str:
    """Extract file extension from URL."""
    path = urlparse(url).path
    ext = os.path.splitext(path)[-1].lower()
    return ext if ext in ALLOWED_EXTENSIONS else ".jpg"


def download_image(url: str, post_id: str) -> str | None:
    """
    Download a single image and save it under data/raw/images/<post_id>/.
    Returns the saved file path, or None on failure.
    """
    post_img_dir = IMAGE_DIR / post_id
    post_img_dir.mkdir(parents=True, exist_ok=True)

    # Use URL hash as filename to avoid collisions
    url_hash = hashlib.md5(url.encode()).hexdigest()[:10]
    ext = _get_extension(url)
    filename = f"{url_hash}{ext}"
    filepath = post_img_dir / filename

    if filepath.exists():
        return str(filepath)

    try:
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT, stream=True)
        resp.raise_for_status()

        # Basic content-type guard
        content_type = resp.headers.get("Content-Type", "")
        if not content_type.startswith("image/"):
            print(f"  [image_scraper] Skipping non-image content: {url}")
            return None

        with open(filepath, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)

        print(f"  [image_scraper] Downloaded → {filepath}")
        return str(filepath)

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
