from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scheduler")

scheduler = AsyncIOScheduler()

def run_rss_scrape():
    logger.info(f"[{datetime.now()}] Automated RSS Scrape started...")
    from scraper.rss_scraper import run_all_feeds
    try:
        count = run_all_feeds()
        logger.info(f"[{datetime.now()}] Automated RSS Scrape finished: found {len(count)} items.")
    except Exception as e:
        logger.error(f"[{datetime.now()}] Automated RSS Scrape failed: {e}")

def run_portal_discovery():
    logger.info(f"[{datetime.now()}] Automated Portal Discovery started...")
    from scraper.portal_scraper import run_all_portals
    try:
        count = run_all_portals(use_stealth=False)
        logger.info(f"[{datetime.now()}] Automated Portal Discovery finished: found {count} items.")
    except Exception as e:
        logger.error(f"[{datetime.now()}] Automated Portal Discovery failed: {e}")

def init_scheduler():
    """Start background jobs for automation"""
    # Run RSS every 6 hours
    scheduler.add_job(
        run_rss_scrape,
        IntervalTrigger(hours=6),
        id="rss_auto_scrape",
        replace_existing=True,
        next_run_time=datetime.now() # Run once immediately on start
    )
    
    # Run Portal Discovery once a day
    scheduler.add_job(
        run_portal_discovery,
        IntervalTrigger(hours=24),
        id="portal_auto_discovery",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Scheduler started with automated background jobs.")

def stop_scheduler():
    scheduler.shutdown()
    logger.info("Scheduler shut down.")
