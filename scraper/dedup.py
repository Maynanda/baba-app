"""
scraper/dedup.py
Duplicate URL tracker — prevents re-scraping already processed items.
Stores a set of seen URLs in data/raw/_seen.json.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from src.database import is_url_seen, mark_url_seen

def load_seen() -> set:
    """Legacy function - not needed with sqlite"""
    pass

def save_seen(seen: set):
    """Legacy function - not needed with sqlite"""
    pass

def is_duplicate(url: str) -> bool:
    """Check if URL exists in sqlite seen_urls table."""
    return is_url_seen(url)

def mark_seen(url: str):
    """Mark URL as seen in sqlite seen_urls table."""
    mark_url_seen(url)


def clear_seen() -> None:
    """Reset the seen list (use with caution)."""
    _save_seen(set())
    print("Seen list cleared.")


def list_seen() -> list:
    """Return all seen URLs."""
    return list(_load_seen())
