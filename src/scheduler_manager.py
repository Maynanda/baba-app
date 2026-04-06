import json
from pathlib import Path
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scheduler")

BASE_DIR = Path(__file__).resolve().parent.parent
SETTINGS_PATH = BASE_DIR / "config" / "scheduler_settings.json"

scheduler = AsyncIOScheduler()

def load_settings():
    if not SETTINGS_PATH.exists():
        return {}
    with open(SETTINGS_PATH, "r") as f:
        return json.load(f)

def save_settings(data):
    with open(SETTINGS_PATH, "w") as f:
        json.dump(data, f, indent=2)

def run_rss_scrape():
    logger.info(f"[{datetime.now()}] Automated RSS Scrape triggered.")
    from scraper.rss_scraper import run_all_feeds
    try:
        run_all_feeds()
    except Exception as e:
        logger.error(f"RSS Scrape error: {e}")

def run_portal_discovery():
    logger.info(f"[{datetime.now()}] Automated Portal Discovery triggered.")
    from scraper.portal_scraper import run_all_portals
    try:
        run_all_portals(use_stealth=False)
    except Exception as e:
        logger.error(f"Portal Discovery error: {e}")

JOB_MAP = {
    "rss_auto_scrape": run_rss_scrape,
    "portal_auto_discovery": run_portal_discovery
}

def init_scheduler():
    """Load settings and schedule enabled jobs."""
    settings = load_settings()
    for job_id, config in settings.items():
        if config["enabled"]:
            func = JOB_MAP.get(job_id)
            if func:
                scheduler.add_job(
                    func,
                    IntervalTrigger(hours=config["frequency_hours"]),
                    id=job_id,
                    replace_existing=True,
                    next_run_time=datetime.now() if job_id == "rss_auto_scrape" else None
                )
                logger.info(f"Job {job_id} scheduled every {config['frequency_hours']}h.")
    
    scheduler.start()

def update_job_setting(job_id: str, enabled: bool, freq_h: int):
    """Update JSON and the live scheduler."""
    settings = load_settings()
    if job_id not in settings:
        return False
    
    settings[job_id]["enabled"] = enabled
    settings[job_id]["frequency_hours"] = freq_h
    save_settings(settings)

    # Update live scheduler
    if not enabled:
        if scheduler.get_job(job_id):
            scheduler.remove_job(job_id)
            logger.info(f"Job {job_id} DISABLED and removed from execution.")
    else:
        func = JOB_MAP.get(job_id)
        if func:
            scheduler.add_job(
                func,
                IntervalTrigger(hours=freq_h),
                id=job_id,
                replace_existing=True,
                next_run_time=datetime.now() # Trigger one run now if newly enabled/updated
            )
            logger.info(f"Job {job_id} UPDATED (Enabled={enabled}, Freq={freq_h}h).")
    return True
