"""
api/routers/scraper.py
─────────────────────────────────────────────────────────────────────────────
Scraper router — triggers background scraping jobs.
Each endpoint maps directly to one scraper module function.

All scraping is run in a BackgroundTask so the endpoint returns immediately
and the user gets fast feedback while the scrape runs in the background.

Endpoints:
  POST /api/scrape/rss           → Run RSS feeds (from config/feeds.yaml)
  POST /api/scrape/url           → Deep scrape a single article URL
  POST /api/scrape/trends        → Google Trends & Reddit trending
  POST /api/scrape/discovery     → Portal link discovery (all portals)
  POST /api/scrape/portal        → Auto-generate parser for a new portal URL
─────────────────────────────────────────────────────────────────────────────
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, HttpUrl

router = APIRouter()


# ── Request body schemas ───────────────────────────────────────────────────────

class ScrapeUrlRequest(BaseModel):
    url: str
    niche: str = "ai-engineering"
    use_stealth: bool = False

class ScrapeTrendsRequest(BaseModel):
    source: str = "all"          # "google" | "reddit" | "all"
    niche: str = "ai-engineering"

class ScrapeRssRequest(BaseModel):
    niche: str | None = None     # None = all niches

class PortalDiscoveryRequest(BaseModel):
    use_stealth: bool = False

class AddPortalRequest(BaseModel):
    url: str
    niche: str = "ai-engineering"
    use_stealth: bool = False


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/rss")
def scrape_rss(body: ScrapeRssRequest, background_tasks: BackgroundTasks):
    """
    Trigger RSS feed scraping for all feeds in config/feeds.yaml.
    Runs in background; returns immediately.
    """
    def _run():
        from scraper.rss_scraper import run_all_feeds
        run_all_feeds(niche_filter=body.niche)

    background_tasks.add_task(_run)
    return {"status": "started", "job": "rss_scrape", "niche": body.niche}


@router.post("/url")
def scrape_url(body: ScrapeUrlRequest, background_tasks: BackgroundTasks):
    """
    Deep scrape a single article URL using Scrapling.
    Set use_stealth=True to activate patchright anti-bot mode.
    Runs in background; returns immediately.
    """
    def _run():
        from scraper.blog_scraper import scrape_article
        scrape_article(url=body.url, niche=body.niche, use_stealth=body.use_stealth)

    background_tasks.add_task(_run)
    return {"status": "started", "job": "url_scrape", "url": body.url}


@router.post("/trends")
def scrape_trends(body: ScrapeTrendsRequest, background_tasks: BackgroundTasks):
    """
    Trigger Google Trends and/or Reddit trending topic scraping.
    source: "google" | "reddit" | "all"
    Runs in background; returns immediately.
    """
    def _run():
        from scraper.trend_scraper import scrape_google_trends, scrape_reddit
        if body.source in ("google", "all"):
            scrape_google_trends(niche=body.niche)
        if body.source in ("reddit", "all"):
            scrape_reddit(niche=body.niche)

    background_tasks.add_task(_run)
    return {"status": "started", "job": "trends_scrape", "source": body.source}


@router.post("/discovery")
def run_portal_discovery(body: PortalDiscoveryRequest, background_tasks: BackgroundTasks):
    """
    Run the portal link discovery engine over all configured portals.
    Saves discovered article links to the discovered_links table.
    Runs in background; returns immediately.
    """
    def _run():
        from scraper.portal_scraper import run_all_portals
        run_all_portals(use_stealth=body.use_stealth)

    background_tasks.add_task(_run)
    return {"status": "started", "job": "portal_discovery"}


@router.post("/portal")
def add_portal(body: AddPortalRequest):
    """
    Auto-generate a CSS parser config for a new portal URL and save it
    to config/portals.yaml. Returns the generated config for preview.
    This is a synchronous call (returns result directly).
    """
    try:
        from scraper.parser_generator import generate_parser_for_url, save_portal_config
        result = generate_parser_for_url(
            url=body.url,
            niche=body.niche,
            use_stealth=body.use_stealth,
        )
        if result.get("success"):
            save_portal_config(result["config"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
