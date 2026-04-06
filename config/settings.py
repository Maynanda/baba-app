"""
config/settings.py
Centralized config loader. Reads from .env and exposes typed constants.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# BASE_DIR is project root
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env (Standard: Root folder only)
load_dotenv(BASE_DIR / ".env")

# ── Paths ─────────────────────────────────────────────────────
DATA_DIR         = BASE_DIR / "data"
DATA_RAW_DIR     = DATA_DIR / "raw"
DATA_RESEARCH_DIR= DATA_DIR / "research"
DATA_CONTENT_DIR = DATA_DIR / "content"
DATA_ARCHIVE_DIR = DATA_DIR / "archive"

TEMPLATES_DIR    = BASE_DIR / "templates"
OUTPUT_DIR       = BASE_DIR / "output"
OUTPUT_PPTX_DIR  = OUTPUT_DIR / "pptx"
OUTPUT_PDF_DIR   = OUTPUT_DIR / "pdf"
OUTPUT_IMG_DIR   = OUTPUT_DIR / "images"

SCRAPER_SEEN_FILE = DATA_RAW_DIR / "_seen.json"
SOFFICE_PATH     = "/Applications/LibreOffice.app/Contents/MacOS/soffice"

# ── LinkedIn ──────────────────────────────────────────────────
LINKEDIN_CLIENT_ID     = os.getenv("LINKEDIN_CLIENT_ID", "")
LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET", "")
LINKEDIN_ACCESS_TOKEN  = os.getenv("LINKEDIN_ACCESS_TOKEN", "")
LINKEDIN_PERSON_URN    = os.getenv("LINKEDIN_PERSON_URN", "")

# ── Meta / Instagram ──────────────────────────────────────────
META_APP_ID           = os.getenv("META_APP_ID", "")
META_APP_SECRET       = os.getenv("META_APP_SECRET", "")
META_ACCESS_TOKEN     = os.getenv("META_ACCESS_TOKEN", "")
INSTAGRAM_ACCOUNT_ID  = os.getenv("INSTAGRAM_ACCOUNT_ID", "")

# ── TikTok ────────────────────────────────────────────────────
TIKTOK_CLIENT_KEY     = os.getenv("TIKTOK_CLIENT_KEY", "")
TIKTOK_CLIENT_SECRET  = os.getenv("TIKTOK_CLIENT_SECRET", "")
TIKTOK_ACCESS_TOKEN   = os.getenv("TIKTOK_ACCESS_TOKEN", "")

# ── Reddit ────────────────────────────────────────────────────
REDDIT_CLIENT_ID      = os.getenv("REDDIT_CLIENT_ID", "")
REDDIT_CLIENT_SECRET  = os.getenv("REDDIT_CLIENT_SECRET", "")
REDDIT_USER_AGENT     = os.getenv("REDDIT_USER_AGENT", "baba-app/1.0")

# ── LLM ───────────────────────────────────────────────────────
OPENAI_API_KEY        = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY     = os.getenv("ANTHROPIC_API_KEY", "")
GEMINI_API_KEY        = os.getenv("GEMINI_API_KEY", "")

# ── App ───────────────────────────────────────────────────────
DEFAULT_NICHE    = os.getenv("DEFAULT_NICHE", "ai-engineering")
DEFAULT_PLATFORM = os.getenv("DEFAULT_PLATFORM", "linkedin")
LOG_LEVEL        = os.getenv("LOG_LEVEL", "INFO")

# ── Ensure output dirs exist ──────────────────────────────────
for _dir in [
    DATA_RAW_DIR, DATA_RESEARCH_DIR, DATA_CONTENT_DIR, DATA_ARCHIVE_DIR,
    OUTPUT_PPTX_DIR, OUTPUT_PDF_DIR, OUTPUT_IMG_DIR,
]:
    _dir.mkdir(parents=True, exist_ok=True)
