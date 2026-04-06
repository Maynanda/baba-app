"""
scraper/blog_scraper.py
Scrapes a blog/article URL and extracts structured content.
Saves raw item to data/raw/<id>.json.

Usage:
    python scraper/blog_scraper.py --url https://example.com/article
    python -m scraper.blog_scraper --url https://example.com/article
"""

import os
import sys
import json
import uuid
import argparse
from datetime import datetime, timezone
from urllib.parse import urlparse

import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import DATA_RAW_DIR, DEFAULT_NICHE
from scraper.dedup import is_duplicate, mark_seen
from scraper.image_scraper import download_images

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "max-age=0",
    "Upgrade-Insecure-Requests": "1",
}
TIMEOUT = 15


def _extract_images(page, base_url: str) -> list[str]:
    """Extract all image src URLs from the article body or featured area."""
    imgs = []
    # Try common article image containers
    selectors = [
        "article img", 
        ".elementor-widget-theme-post-content img", 
        ".elementor-post__thumbnail img",
        ".attachment-full",
        ".post-content img", 
        ".entry-content img",
        "main img"
    ]
    for sel in selectors:
        for tag in page.css(sel):
            # Prefer data-src or srcset if available (for lazy loading)
            src = tag.attrib.get("data-src") or tag.attrib.get("src") or ""
            if not src and tag.attrib.get("srcset"):
                # Grab the first URL in srcset
                src = tag.attrib.get("srcset").split(",")[0].split()[0]
            
            if not src or "logo" in src.lower() or "avatar" in src.lower():
                continue
                
            if src.startswith("http"):
                imgs.append(src)
            elif src.startswith("/"):
                parsed = urlparse(base_url)
                imgs.append(f"{parsed.scheme}://{parsed.netloc}{src}")
                
    # Unique links in order
    result = []
    for i in imgs:
        if i not in result:
            result.append(i)
    return result[:10]


def _extract_body(page) -> str:
    """Extract main article body text."""
    # Try common article containers in order of preference
    # Added elementor-widget-theme-post-content for AI News and similar sites
    selectors = [
        ".elementor-widget-theme-post-content",
        "article", 
        "main", 
        ".post-content", 
        ".entry-content", 
        ".article-body"
    ]
    for selector in selectors:
        containers = page.css(selector)
        if containers:
            # We take the first container that has substantial text
            for c in containers:
                text = c.get_all_text().strip()
                if len(text) > 200:
                    return text
                    
    # Fallback: all paragraphs in a sensible way
    paras = page.css("p")
    return "\n\n".join(p.get_all_text().strip() for p in paras if p.get_all_text() and len(p.get_all_text().strip()) > 60)


def _extract_keywords(page, title: str) -> list[str]:
    """Extract keywords from meta tags and title."""
    kws = []
    meta_kw = page.css("meta[name='keywords']")
    if meta_kw and meta_kw[0].attrib.get("content"):
        kws = [k.strip() for k in meta_kw[0].attrib.get("content").split(",")][:8]
    if not kws:
        # Fallback: split title into words > 4 chars
        kws = [w for w in title.split() if len(w) > 4][:6]
    return kws


def scrape_article(url: str, niche: str = DEFAULT_NICHE, download_imgs: bool = True, use_stealth: bool = False, save_to_db: bool = True) -> dict | None:
    """
    Scrape a single article URL and return a structured raw item dict.
    Returns None if the URL is a duplicate or fetch fails.
    """
    if is_duplicate(url):
        print(f"[blog_scraper] Skipping duplicate: {url}")
        return None

    print(f"[blog_scraper] Scraping: {url} (stealth={use_stealth})")
    try:
        if use_stealth:
            # Fix for "Playwright Sync API inside asyncio loop"
            # If we are in an asyncio loop (FastAPI), sync playwright will crash.
            # We use Fetcher + Stealth headers as a fallback or suggest Async.
            try:
                from scrapling import StealthyFetcher
                page = StealthyFetcher.fetch(url)
            except RuntimeError as e:
                if "asyncio loop" in str(e):
                    print(f"  [blog_scraper] ⚠️  Async loop detected. Falling back to Fetcher with stealth headers.")
                    from scrapling import Fetcher
                    page = Fetcher.get(url, headers={**HEADERS, "Sec-Ch-Ua-Platform": "macOS"})
                else:
                    raise e
        else:
            from scrapling import Fetcher
            # We use custom headers to be more robust for WordPress sites
            page = Fetcher.get(url, headers=HEADERS)
    except Exception as e:
        print(f"[blog_scraper] Fetch failed: {e}")
        return None

    # Title & Content Check
    title_tags = page.css("h1") or page.css("title")
    title = title_tags[0].get_all_text().strip() if title_tags else "Untitled"
    
    from scraper.dedup import is_duplicate_title, normalize_url
    if is_duplicate_title(title):
        print(f"[blog_scraper] Duplicate title detected, skipping: {title}")
        return None
        
    url = normalize_url(url)

    # Author
    author = ""
    for sel in ['[rel="author"]', ".author", ".byline", 'meta[name="author"]']:
        tags = page.css(sel)
        if tags:
            author = tags[0].attrib.get("content", "") or tags[0].get_all_text().strip()
            break

    # Published date
    pub_date = ""
    for sel in ["time", 'meta[property="article:published_time"]', 'meta[name="date"]']:
        tags = page.css(sel)
        if tags:
            pub_date = tags[0].attrib.get("datetime", "") or tags[0].attrib.get("content", "") or tags[0].get_all_text().strip()
            break

    # Body & images
    body = _extract_body(page)
    image_urls = _extract_images(page, url)
    keywords = _extract_keywords(page, title)

    # Build raw item ID
    raw_id = f"raw_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}"

    # Download images locally
    local_images = []
    if download_imgs and image_urls:
        local_images = download_images(image_urls, raw_id)

    item = {
        "id": raw_id,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "source": "blog",
        "source_url": url,
        "niche": niche,
        "title": title,
        "author": author,
        "published_date": pub_date,
        "body": body[:5000],  # cap at 5k chars for storage
        "image_urls": image_urls,
        "local_images": local_images,
        "keywords": keywords,
        "status": "raw",
        "content_plan_id": None,
    }

    # Save to SQLite database
    if save_to_db:
        from src.database import save_raw
        save_raw(item)
        mark_seen(url)
        print(f"[blog_scraper] Saved to DB → {raw_id}")
    
    return item


def main():
    parser = argparse.ArgumentParser(description="Baba-App Blog Scraper")
    parser.add_argument("--url", required=True, help="Article URL to scrape")
    parser.add_argument("--niche", default=DEFAULT_NICHE, help="Content niche tag")
    parser.add_argument("--no-images", action="store_true", help="Skip image downloads")
    args = parser.parse_args()

    result = scrape_article(args.url, niche=args.niche, download_imgs=not args.no_images)
    if result:
        print(f"\n✅ Scraped: {result['title']}")
        print(f"   ID      : {result['id']}")
        print(f"   Keywords: {', '.join(result['keywords'])}")
        print(f"   Images  : {len(result['local_images'])} downloaded")
    else:
        print("\n❌ Scrape failed or duplicate.")


if __name__ == "__main__":
    main()
