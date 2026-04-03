"""
scraper/dedup.py
Duplicate URL tracker — prevents re-scraping already processed items.
Stores a set of seen URLs in data/raw/_seen.json.
"""

import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import SCRAPER_SEEN_FILE


def _load_seen() -> set:
    """Load the set of already-seen URLs from disk."""
    if SCRAPER_SEEN_FILE.exists():
        with open(SCRAPER_SEEN_FILE, "r") as f:
            return set(json.load(f))
    return set()


def _save_seen(seen: set) -> None:
    """Persist the seen-URL set to disk."""
    with open(SCRAPER_SEEN_FILE, "w") as f:
        json.dump(list(seen), f, indent=2)


def is_duplicate(url: str) -> bool:
    """Return True if this URL has already been scraped."""
    seen = _load_seen()
    return url in seen


def mark_seen(url: str) -> None:
    """Record a URL as scraped so it won't be processed again."""
    seen = _load_seen()
    seen.add(url)
    _save_seen(seen)


def clear_seen() -> None:
    """Reset the seen list (use with caution)."""
    _save_seen(set())
    print("Seen list cleared.")


def list_seen() -> list:
    """Return all seen URLs."""
    return list(_load_seen())
