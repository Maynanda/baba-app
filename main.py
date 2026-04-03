"""
main.py — Baba-App Unified CLI
The single entry point for all pipeline operations.

Usage examples:
    python main.py scrape rss
    python main.py scrape rss --niche ai-engineering
    python main.py scrape trends --source google
    python main.py scrape trends --source reddit --subreddit MachineLearning,datascience
    python main.py scrape url --url https://example.com/article

    python main.py content list
    python main.py content list --status raw --folder content
    python main.py content create my-post-slug
    python main.py content create my-post --platform linkedin,instagram_feed

    python main.py generate --post post_ai_agents_20260405 --platform linkedin
    python main.py generate --post post_ai_agents_20260405 --all-platforms

    python main.py templates list
"""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent


# ─────────────────────────────────────────────────────────────
# SCRAPE handlers
# ─────────────────────────────────────────────────────────────

def cmd_scrape_rss(args):
    sys.path.insert(0, str(BASE_DIR))
    from scraper.rss_scraper import run_all_feeds, scrape_feed
    from config.settings import DEFAULT_NICHE

    niche_filter = args.niche if args.niche else None
    if args.feed_url:
        items = scrape_feed(feed_url=args.feed_url, niche=args.niche or DEFAULT_NICHE)
    else:
        items = run_all_feeds(niche_filter=niche_filter)
    print(f"\n✅ {len(items)} new items saved to data/raw/")


def cmd_scrape_trends(args):
    sys.path.insert(0, str(BASE_DIR))
    from scraper.trend_scraper import scrape_google_trends, scrape_reddit

    subs = [s.strip() for s in args.subreddit.split(",")] if args.subreddit else None
    total = []
    if args.source in ("google", "all"):
        total += scrape_google_trends(niche=args.niche)
    if args.source in ("reddit", "all"):
        total += scrape_reddit(subreddits=subs, sort=args.sort, limit=args.limit, niche=args.niche)
    print(f"\n✅ {len(total)} trend items saved to data/raw/")


def cmd_scrape_url(args):
    sys.path.insert(0, str(BASE_DIR))
    from scraper.blog_scraper import scrape_article

    result = scrape_article(url=args.url, niche=args.niche, download_imgs=not args.no_images)
    if result:
        print(f"\n✅ Scraped: {result['title']}")
        print(f"   ID      : {result['id']}")
        print(f"   Keywords: {', '.join(result['keywords'])}")
    else:
        print("\n❌ Scrape failed or duplicate.")


# ─────────────────────────────────────────────────────────────
# CONTENT handlers
# ─────────────────────────────────────────────────────────────

def cmd_content_list(args):
    sys.path.insert(0, str(BASE_DIR))
    from config.settings import DATA_DIR

    data_folder = DATA_DIR / args.folder
    if not data_folder.exists():
        print(f"Folder not found: data/{args.folder}/")
        return

    files = sorted(data_folder.glob("*.json"))
    if not files:
        print(f"No items found in data/{args.folder}/")
        return

    print(f"\n{'─'*65}")
    print(f"  data/{args.folder}/ — {len(files)} items")
    print(f"{'─'*65}")
    count = 0
    for f in files:
        if f.name.startswith("_"):
            continue
        try:
            with open(f) as fp:
                item = json.load(fp)
            item_status = item.get("status", "?")
            if args.status and item_status != args.status:
                continue
            title = item.get("title", f.stem)[:48]
            platforms = ", ".join(item.get("platform", [])) or "—"
            niche = item.get("niche", "—")
            print(f"  [{item_status:10}]  {title:<50} | {platforms}")
            count += 1
        except Exception:
            print(f"  [error     ]  {f.name}")
            count += 1
    print(f"{'─'*65}")
    print(f"  {count} item(s) shown\n")


def cmd_content_create(args):
    sys.path.insert(0, str(BASE_DIR))
    from config.settings import DATA_CONTENT_DIR

    filename = f"post_{args.name}.json"
    filepath = DATA_CONTENT_DIR / filename

    if filepath.exists():
        print(f"❌ Content '{filename}' already exists.")
        sys.exit(1)

    platforms = [p.strip() for p in args.platform.split(",") if p.strip()]
    post_id = f"post_{args.name}_{datetime.now().strftime('%Y%m%d')}"
    content = {
        "id": post_id,
        "status": "draft",
        "platform": platforms,
        "niche": args.niche,
        "template": args.template,
        "post_date": "",
        "scheduled_time": "",
        "source_url": "",
        "slides": [
            {
                "HOOK_TITLE": "Your hook title here",
                "HOOK_SUB": "Your hook subtitle \u2192",
                "BODY_1_TITLE": "1. Point One",
                "BODY_1_TEXT": "Explanation for point one.",
                "BODY_2_TITLE": "2. Point Two",
                "BODY_2_TEXT": "Explanation for point two.",
                "BODY_3_TITLE": "3. Point Three",
                "BODY_3_TEXT": "Explanation for point three.",
                "CTA_TITLE": "Found this helpful?",
                "CTA_TEXT": "I share real-world AI and Data Science lessons every week. Hit follow."
            }
        ]
    }

    with open(filepath, "w") as f:
        json.dump(content, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Created: {filepath}")
    print(f"   Platforms : {', '.join(platforms)}")
    print(f"   Template  : {args.template}")
    print(f"   Edit the file, set status → 'approved', then run:")
    print(f"   python main.py generate --post {post_id} --all-platforms\n")


# ─────────────────────────────────────────────────────────────
# GENERATE handler
# ─────────────────────────────────────────────────────────────

def cmd_generate(args):
    sys.path.insert(0, str(BASE_DIR))
    from config.settings import DATA_CONTENT_DIR

    # Locate post file
    post_file = DATA_CONTENT_DIR / f"{args.post}.json"
    if not post_file.exists():
        candidates = list(DATA_CONTENT_DIR.glob(f"*{args.post}*.json"))
        if not candidates:
            print(f"❌ Post not found: {args.post}")
            sys.exit(1)
        post_file = candidates[0]

    with open(post_file) as f:
        content = json.load(f)

    if content.get("status") not in ("approved", "draft"):
        print(f"⚠️  Post status is '{content.get('status')}'. Only 'approved' or 'draft' posts can be generated.")
        sys.exit(1)

    print(f"\n🎨 Generating: {content.get('id')} ...")

    if args.platform:
        platforms_to_run = [args.platform]
    elif args.all_platforms:
        platforms_to_run = content.get("platform", ["linkedin"])
    else:
        platforms_to_run = ["linkedin"]

    for plt in platforms_to_run:
        print(f"   → Platform: {plt}")
        _run_generator(content, plt, args.template or content.get("template", "carousel_dark_1x1"))

    print("\n✅ Generation complete. Check output/ folder.")


def _run_generator(content, platform, template_id):
    if platform == "linkedin":
        try:
            sys.path.insert(0, str(BASE_DIR / "src"))
            from generator import generate_carousel
            from config.settings import DATA_CONTENT_DIR
            tmp = DATA_CONTENT_DIR / f"{content['id']}.json"
            if not tmp.exists():
                with open(tmp, "w") as f:
                    json.dump(content, f)
            generate_carousel(str(tmp))
        except Exception as e:
            print(f"   ❌ Generator error: {e}")
    else:
        print(f"   ⏳ Platform '{platform}' generator coming in Phase 3.")


# ─────────────────────────────────────────────────────────────
# TEMPLATES handler
# ─────────────────────────────────────────────────────────────

def cmd_templates_list(args):
    sys.path.insert(0, str(BASE_DIR))
    from config.settings import TEMPLATES_DIR

    registry_path = TEMPLATES_DIR / "registry.json"
    if not registry_path.exists():
        print("❌ Template registry not found.")
        sys.exit(1)

    with open(registry_path) as f:
        registry = json.load(f)

    print(f"\n{'─'*60}")
    print("  Available Templates")
    print(f"{'─'*60}")
    for t in registry.get("templates", []):
        status_icon = "[READY]" if t.get("status") == "ready" else "[PLANNED]"
        print(f"  {status_icon} {t['id']}")
        print(f"      Name      : {t['name']}")
        print(f"      Platforms : {', '.join(t['platforms'])}")
        print(f"      Ratio     : {t['aspect_ratio']}")
        print(f"      Niche     : {', '.join(t['niche'])}")
        print()
    print(f"{'─'*60}\n")


# ─────────────────────────────────────────────────────────────
# CLI definition
# ─────────────────────────────────────────────────────────────

def build_parser():
    parser = argparse.ArgumentParser(
        prog="baba-app",
        description="Baba-App — Automated Content Creation for LinkedIn, TikTok & Instagram",
    )
    sub = parser.add_subparsers(dest="command", metavar="COMMAND")
    sub.required = True

    # ── scrape ─────────────────────────────────────────────────
    scrape = sub.add_parser("scrape", help="Scrape content from the web")
    scrape_sub = scrape.add_subparsers(dest="scrape_cmd", metavar="SOURCE")
    scrape_sub.required = True

    # scrape rss
    rss = scrape_sub.add_parser("rss", help="Fetch articles from RSS feeds (config/feeds.yaml)")
    rss.add_argument("--niche", default="", help="Filter feeds by niche (blank = all)")
    rss.add_argument("--feed-url", dest="feed_url", default="", help="Scrape a specific feed URL")
    rss.set_defaults(func=cmd_scrape_rss)

    # scrape trends
    trends = scrape_sub.add_parser("trends", help="Scrape trending topics from Google/Reddit")
    trends.add_argument("--source", choices=["google", "reddit", "all"], default="all")
    trends.add_argument("--niche", default="ai-engineering")
    trends.add_argument("--subreddit", default="", help="Comma-separated subreddits")
    trends.add_argument("--sort", choices=["hot", "top", "new", "rising"], default="hot")
    trends.add_argument("--limit", type=int, default=25)
    trends.set_defaults(func=cmd_scrape_trends)

    # scrape url
    url = scrape_sub.add_parser("url", help="Scrape a single blog/article URL")
    url.add_argument("--url", required=True, help="Article URL to scrape")
    url.add_argument("--niche", default="ai-engineering")
    url.add_argument("--no-images", dest="no_images", action="store_true", help="Skip image downloads")
    url.set_defaults(func=cmd_scrape_url)

    # ── content ────────────────────────────────────────────────
    content = sub.add_parser("content", help="Manage content plans")
    content_sub = content.add_subparsers(dest="content_cmd", metavar="ACTION")
    content_sub.required = True

    # content list
    cl = content_sub.add_parser("list", help="List content items")
    cl.add_argument("--status", default="", help="Filter: raw | draft | approved | published")
    cl.add_argument("--folder", default="content", help="Subfolder: raw | research | content | archive")
    cl.set_defaults(func=cmd_content_list)

    # content create
    cc = content_sub.add_parser("create", help="Create a new blank content plan")
    cc.add_argument("name", help="Post slug (e.g. ai-agent-explained)")
    cc.add_argument("--platform", default="linkedin", help="Comma-separated: linkedin,instagram_feed,instagram_story,tiktok")
    cc.add_argument("--template", default="carousel_dark_1x1", help="Template ID from registry")
    cc.add_argument("--niche", default="ai-engineering")
    cc.set_defaults(func=cmd_content_create)

    # ── generate ───────────────────────────────────────────────
    gen = sub.add_parser("generate", help="Generate visual assets from a content plan")
    gen.add_argument("--post", required=True, help="Post ID or slug")
    gen.add_argument("--platform", default="", help="linkedin | instagram_feed | instagram_story | tiktok")
    gen.add_argument("--all-platforms", dest="all_platforms", action="store_true", help="Generate for all platforms in the post")
    gen.add_argument("--template", default="", help="Override template ID")
    gen.set_defaults(func=cmd_generate)

    # ── templates ──────────────────────────────────────────────
    tmpl = sub.add_parser("templates", help="Manage visual templates")
    tmpl_sub = tmpl.add_subparsers(dest="tmpl_cmd", metavar="ACTION")
    tmpl_sub.required = True

    tl = tmpl_sub.add_parser("list", help="List all available templates")
    tl.set_defaults(func=cmd_templates_list)

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
