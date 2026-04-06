"""
scraper/rss_scraper.py
Reads RSS/Atom feeds defined in config/feeds.yaml.
Fetches new articles, saves each as a raw item in data/raw/.
Skips duplicates automatically.

Usage:
    python scraper/rss_scraper.py
    python scraper/rss_scraper.py --niche ai-engineering
    python scraper/rss_scraper.py --feed-url https://example.com/feed
"""

import os
import sys
import json
import uuid
import argparse
from datetime import datetime, timezone
from pathlib import Path

import feedparser
import yaml

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import DATA_RAW_DIR, DEFAULT_NICHE
from scraper.dedup import is_duplicate, mark_seen
from src.database import save_raw

FEEDS_CONFIG = Path(__file__).resolve().parent.parent / "config" / "feeds.yaml"


def _load_feeds(niche_filter: str | None = None) -> list[dict]:
    """Load feed list from config/feeds.yaml, optionally filtered by niche."""
    with open(FEEDS_CONFIG, "r") as f:
        config = yaml.safe_load(f)
    feeds = config.get("feeds", [])
    if niche_filter:
        feeds = [fd for fd in feeds if fd.get("niche") == niche_filter]
    return feeds


def _parse_date(entry) -> str:
    """Extract published date string from a feedparser entry."""
    if hasattr(entry, "published"):
        return entry.published
    if hasattr(entry, "updated"):
        return entry.updated
    return datetime.now(timezone.utc).isoformat()


def _extract_body(entry) -> str:
    """Extract body text from RSS entry."""
    if hasattr(entry, "summary"):
        # Strip very basic HTML tags
        from bs4 import BeautifulSoup
        return BeautifulSoup(entry.summary, "html.parser").get_text(strip=True)
    if hasattr(entry, "content"):
        from bs4 import BeautifulSoup
        return BeautifulSoup(entry.content[0].value, "html.parser").get_text(strip=True)
    return ""


def _extract_image(entry) -> list[str]:
    """Try to grab the main image from an RSS entry."""
    images = []
    # media:thumbnail or media:content
    media = entry.get("media_thumbnail") or entry.get("media_content")
    if media and isinstance(media, list):
        for m in media:
            url = m.get("url", "")
            if url:
                images.append(url)
    # enclosures
    for enc in entry.get("enclosures", []):
        if enc.get("type", "").startswith("image/"):
            images.append(enc.get("href", ""))
    return images[:3]


def scrape_feed(feed_url: str, feed_name: str = "Unknown", niche: str = DEFAULT_NICHE) -> list[dict]:
    """
    Fetch a single RSS feed and save new items to data/raw/.
    Returns list of saved item dicts.
    """
    print(f"[rss_scraper] Fetching: {feed_name} ({feed_url})")
    parsed = feedparser.parse(feed_url)

    if parsed.bozo:
        print(f"[rss_scraper] ⚠️  Feed parse warning for {feed_url}: {parsed.bozo_exception}")

    saved_items = []

    for entry in parsed.entries:
        url = entry.get("link", "")
        if not url or is_duplicate(url):
            continue

        title = entry.get("title", "Untitled")
        body = _extract_body(entry)
        image_urls = _extract_image(entry)
        
        # --- DEEP SCRAPE UPGRADE ---
        # If the RSS body is too short (summary only) or missing images, 
        # we perform a deep scrape of the actual URL to get full content.
        if len(body) < 600 or not image_urls:
            print(f"  [rss_scraper] Snippet too short or no images. Deep scraping: {url}")
            from scraper.blog_scraper import scrape_article
            # We use scrape_article with save_to_db=False to get content without duplicates
            deep_data = scrape_article(url, niche=niche, download_imgs=True, use_stealth=False, save_to_db=False)
            if deep_data:
                body = deep_data.get("body", body)
                image_urls = deep_data.get("image_urls", image_urls)
                local_images = deep_data.get("local_images", [])
            else:
                local_images = []
        else:
            local_images = []

        keywords = [tag.term for tag in entry.get("tags", [])][:8] if entry.get("tags") else []
        author = entry.get("author", "")
        pub_date = _parse_date(entry)

        raw_id = f"raw_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}"

        item = {
            "id": raw_id,
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            "source": "rss",
            "source_name": feed_name,
            "source_url": url,
            "feed_url": feed_url,
            "niche": niche,
            "title": title,
            "author": author,
            "published_date": pub_date,
            "body": body[:5000],
            "image_urls": image_urls,
            "local_images": local_images,
            "keywords": keywords,
            "status": "raw",
            "content_plan_id": None,
        }

        save_raw(item)

        mark_seen(url)
        print(f"  [rss_scraper] Saved: {title[:60]}")
        saved_items.append(item)

    print(f"[rss_scraper] Done — {len(saved_items)} new items from {feed_name}")
    return saved_items


def run_all_feeds(niche_filter: str | None = None) -> list[dict]:
    """
    Scrape all feeds in config/feeds.yaml.
    Optionally filter by niche.
    Returns all newly saved items.
    """
    feeds = _load_feeds(niche_filter)
    if not feeds:
        print("[rss_scraper] No feeds found for the given filters.")
        return []

    all_items = []
    for feed in feeds:
        items = scrape_feed(
            feed_url=feed["url"],
            feed_name=feed.get("name", feed["url"]),
            niche=feed.get("niche", DEFAULT_NICHE),
        )
        all_items.extend(items)

    print(f"\n[rss_scraper] Total new items scraped: {len(all_items)}")
    return all_items


def main():
    parser = argparse.ArgumentParser(description="Baba-App RSS Scraper")
    parser.add_argument("--niche", default=None, help="Filter feeds by niche (e.g. ai-engineering)")
    parser.add_argument("--feed-url", default=None, help="Scrape a specific feed URL directly")
    args = parser.parse_args()

    if args.feed_url:
        items = scrape_feed(feed_url=args.feed_url, niche=args.niche or DEFAULT_NICHE)
    else:
        items = run_all_feeds(niche_filter=args.niche)

    print(f"\n✅ Scraping complete. {len(items)} new items saved to data/raw/")


if __name__ == "__main__":
    main()
