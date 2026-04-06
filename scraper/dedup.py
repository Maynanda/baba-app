import urllib.parse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from src.database import is_url_seen, mark_url_seen, get_connection

def normalize_url(url: str) -> str:
    """Normalize URL by stripping trailing slashes and common tracking parameters."""
    if not url:
        return ""
    parsed = urllib.parse.urlparse(url)
    # Remove query params (tracking)
    path = parsed.path.rstrip("/")
    normalized = f"{parsed.scheme}://{parsed.netloc}{path}"
    return normalized.lower()

def is_duplicate(url: str) -> bool:
    """Check if URL exists in sqlite seen_urls table."""
    return is_url_seen(normalize_url(url))

def mark_seen(url: str):
    """Mark URL as seen in sqlite seen_urls table."""
    mark_url_seen(normalize_url(url))

def is_duplicate_title(title: str) -> bool:
    """Check if an article with this exact title already exists."""
    if not title or len(title) < 10:
        return False
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT 1 FROM raw_content WHERE title = ?", (title.strip(),))
    exists = c.fetchone() is not None
    conn.close()
    return exists
