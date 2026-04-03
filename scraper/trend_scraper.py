"""
scraper/trend_scraper.py
Scrapes trending topics from Google Trends and Reddit.
Saves each trend/thread as a raw item in data/raw/.

Usage:
    python scraper/trend_scraper.py --source google
    python scraper/trend_scraper.py --source reddit --subreddit MachineLearning
    python scraper/trend_scraper.py --source all
"""

import os
import sys
import json
import uuid
import argparse
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import (
    DATA_RAW_DIR, DEFAULT_NICHE,
    REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT,
)
from scraper.dedup import is_duplicate, mark_seen

# ─────────────────────────────────────────────────────────────
# AI/DS keyword sets for relevance filtering
# ─────────────────────────────────────────────────────────────
AI_KEYWORDS = {
    "ai", "artificial intelligence", "machine learning", "ml", "deep learning",
    "llm", "large language model", "gpt", "claude", "gemini", "neural network",
    "data science", "nlp", "natural language processing", "transformer",
    "computer vision", "reinforcement learning", "generative ai", "genai",
    "langchain", "rag", "retrieval augmented", "agent", "fine-tuning",
    "hugging face", "pytorch", "tensorflow", "scikit-learn", "python",
    "data engineering", "mlops", "model deployment",
}

# Subreddits to monitor
AI_SUBREDDITS = [
    "MachineLearning",
    "artificial",
    "datascience",
    "learnmachinelearning",
    "LocalLLaMA",
    "mlops",
    "LanguageModelNews",
]


def _is_relevant(text: str) -> bool:
    """Check if text contains any AI/DS keywords."""
    text_lower = text.lower()
    return any(kw in text_lower for kw in AI_KEYWORDS)


def _save_raw(item: dict) -> str:
    from src.database import save_raw
    save_raw(item)
    return str(item['id'])


# ─────────────────────────────────────────────────────────────
# Google Trends
# ─────────────────────────────────────────────────────────────
def scrape_google_trends(niche: str = DEFAULT_NICHE, keywords: list[str] | None = None) -> list[dict]:
    """
    Fetch related queries and rising topics for AI/DS keywords via pytrends.
    Returns list of saved raw items.
    """
    try:
        from pytrends.request import TrendReq
    except ImportError:
        print("[trend_scraper] pytrends not installed. Run: pip install pytrends")
        return []

    if keywords is None:
        keywords = ["AI engineering", "machine learning", "LLM", "data science", "AI agent"]

    print(f"[trend_scraper] Google Trends — querying {len(keywords)} keyword(s)...")
    pytrends = TrendReq(hl="en-US", tz=360)
    saved = []

    for kw in keywords:
        try:
            pytrends.build_payload([kw], timeframe="now 7-d", geo="")
            related = pytrends.related_queries()
            rising = related.get(kw, {}).get("rising")
            if rising is None or rising.empty:
                continue

            for _, row in rising.iterrows():
                query = row.get("query", "")
                value = row.get("value", 0)
                url = f"https://trends.google.com/trends/explore?q={query.replace(' ', '+')}"

                if is_duplicate(url):
                    continue

                raw_id = f"raw_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}"
                item = {
                    "id": raw_id,
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                    "source": "google_trends",
                    "source_url": url,
                    "niche": niche,
                    "title": query,
                    "author": "",
                    "published_date": datetime.now(timezone.utc).isoformat(),
                    "body": f"Rising Google Trend — '{query}' (breakout score: {value}). Seed keyword: '{kw}'.",
                    "image_urls": [],
                    "local_images": [],
                    "keywords": [kw, query],
                    "trend_score": value,
                    "status": "raw",
                    "content_plan_id": None,
                }

                _save_raw(item)
                mark_seen(url)
                print(f"  [trend_scraper] Google trend: {query} (score: {value})")
                saved.append(item)

        except Exception as e:
            print(f"  [trend_scraper] Google Trends error for '{kw}': {e}")

    print(f"[trend_scraper] Google Trends done — {len(saved)} new items")
    return saved


# ─────────────────────────────────────────────────────────────
# Reddit
# ─────────────────────────────────────────────────────────────
def scrape_reddit(
    subreddits: list[str] | None = None,
    sort: str = "hot",
    limit: int = 25,
    niche: str = DEFAULT_NICHE,
) -> list[dict]:
    """
    Fetch top posts from AI/DS subreddits via PRAW.
    sort options: hot | top | new | rising
    Returns list of saved raw items.
    """
    if not REDDIT_CLIENT_ID:
        print("[trend_scraper] Reddit credentials not set in .env — skipping.")
        return []

    try:
        import praw
    except ImportError:
        print("[trend_scraper] praw not installed. Run: pip install praw")
        return []

    if subreddits is None:
        subreddits = AI_SUBREDDITS

    reddit = praw.Reddit(
        client_id=REDDIT_CLIENT_ID,
        client_secret=REDDIT_CLIENT_SECRET,
        user_agent=REDDIT_USER_AGENT,
    )

    saved = []
    for sub_name in subreddits:
        print(f"[trend_scraper] Reddit r/{sub_name} ({sort}, limit={limit})...")
        try:
            subreddit = reddit.subreddit(sub_name)
            posts = {
                "hot": subreddit.hot,
                "top": subreddit.top,
                "new": subreddit.new,
                "rising": subreddit.rising,
            }.get(sort, subreddit.hot)

            for post in posts(limit=limit):
                url = f"https://www.reddit.com{post.permalink}"
                if is_duplicate(url):
                    continue

                # Filter for relevance
                combined = f"{post.title} {post.selftext}"
                if not _is_relevant(combined):
                    continue

                raw_id = f"raw_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}"
                body = post.selftext[:5000] if post.selftext else f"[Link post] {post.url}"
                keywords = [sub_name] + [w for w in post.title.split() if len(w) > 4][:5]

                # Try to grab image if it's an image post
                image_urls = []
                if post.url and any(ext in post.url for ext in [".jpg", ".jpeg", ".png", ".gif"]):
                    image_urls = [post.url]

                item = {
                    "id": raw_id,
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                    "source": "reddit",
                    "source_url": url,
                    "subreddit": sub_name,
                    "niche": niche,
                    "title": post.title,
                    "author": str(post.author) if post.author else "unknown",
                    "published_date": datetime.fromtimestamp(post.created_utc, tz=timezone.utc).isoformat(),
                    "body": body,
                    "image_urls": image_urls,
                    "local_images": [],
                    "keywords": keywords,
                    "upvotes": post.score,
                    "num_comments": post.num_comments,
                    "status": "raw",
                    "content_plan_id": None,
                }

                _save_raw(item)
                mark_seen(url)
                print(f"  [trend_scraper] Reddit: {post.title[:60]} (↑{post.score})")
                saved.append(item)

        except Exception as e:
            print(f"  [trend_scraper] Reddit error for r/{sub_name}: {e}")

    print(f"[trend_scraper] Reddit done — {len(saved)} new items")
    return saved


# ─────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Baba-App Trend Scraper")
    parser.add_argument(
        "--source",
        choices=["google", "reddit", "all"],
        default="all",
        help="Data source to scrape",
    )
    parser.add_argument("--niche", default=DEFAULT_NICHE, help="Niche tag for saved items")
    parser.add_argument("--subreddit", nargs="+", default=None, help="Specific subreddits to scrape")
    parser.add_argument(
        "--sort", choices=["hot", "top", "new", "rising"], default="hot",
        help="Reddit sort method"
    )
    parser.add_argument("--limit", type=int, default=25, help="Posts per subreddit")
    args = parser.parse_args()

    total = []
    if args.source in ("google", "all"):
        total += scrape_google_trends(niche=args.niche)
    if args.source in ("reddit", "all"):
        total += scrape_reddit(
            subreddits=args.subreddit,
            sort=args.sort,
            limit=args.limit,
            niche=args.niche,
        )

    print(f"\n✅ Trend scraping complete — {len(total)} new items saved to data/raw/")


if __name__ == "__main__":
    main()
