# 📋 BRD — Baba-App: Automated Content Creation Platform
**Version:** 1.1 · **Date:** 2026-04-03 · **Status:** Approved for Development

---

## 1. Executive Summary

**Baba-App** is a local, Python-powered content automation platform for a personal brand in the **AI Engineering & Data Science** niche. The system automates the full content lifecycle:

> **Trend Research & Scraping → Content Planning → Visual Generation → Scheduling & Publishing**

Runs entirely on a local machine. Will grow into an AI-agent-driven pipeline over time.

> **Yes, this is a Content Management Platform (CMP)** — but with an AI content engine layered on top. Unlike Buffer or Later where you write content manually, Baba-App generates original content from scraped trends, renders branded visuals automatically, and publishes on a schedule.

---

## 2. Brand Context

- **Owner:** Personal brand — AI Engineer & Data Scientist
- **Niche:** AI Engineering, Data Science, practical ML explanations for technical and non-technical audiences
- **Voice:** "AI practitioner who explains it simply"
- **Platforms (priority order):** LinkedIn → TikTok → Instagram Story + Feed

---

## 3. Goals & Objectives

| # | Goal |
|---|------|
| G1 | Automate trend discovery & research |
| G2 | Auto-generate brand-consistent content |
| G3 | Produce platform-ready visual assets (per platform, per niche, per template) |
| G4 | Schedule & post to LinkedIn / TikTok / Instagram |
| G5 | Build a reusable template library (niche + platform selectable) |
| G6 | Enable AI agent integration in future |

---

## 4. Decisions & Constraints

| Item | Decision |
|------|----------|
| Niche | AI Engineering + Data Science only for now (expandable later) |
| Platforms | LinkedIn → TikTok → Instagram (all eventually) |
| Instagram formats | Both Story (9:16) and Feed Post (1:1) |
| TikTok formats | Both slideshow images and video (future) |
| AI provider | TBD (OpenAI / Claude / Gemini — all possible) |
| Approval workflow | Manual review before publish (no auto-post) |
| Runtime | Local machine only |
| Language | Python 3.11+ |

---

## 5. Current State (What Exists)

```
baba-app/
├── src/
│   ├── content_manager.py   ← CLI: create/list JSON post files
│   ├── generator.py         ← PPTX → PDF → PNG pipeline (WORKING)
│   ├── create_template.py   ← Programmatically builds .pptx template
│   └── scheduler.py         ← Placeholder loop scheduler
├── data/
│   ├── sample_post.json
│   ├── post_llm_explained.json
│   ├── post_ml_vs_dl.json
│   └── post_small_models.json
├── templates/
│   └── main_carousel.pptx   ← 1 template, dark theme, 1:1 LinkedIn
└── output/
    ├── pptx/ · pdf/ · images/
```

### What's Working ✅
- PPTX → PDF → PNG generation pipeline
- Template builder (programmatic PPTX)
- Content manager CLI (list/create)

### What's Missing ❌
- Scraper (no trend/content research)
- AI content generator (no LLM)
- Platform publishers (no API integrations)
- Multi-template / multi-platform support
- Config / credentials system
- Content plan DB with status tracking
- Unified CLI entry point

---

## 6. System Architecture

```
baba-app/
├── scraper/                  ← MODULE 1: Trend & content research
├── src/
│   └── generator/            ← MODULE 3: Visual asset generation (per platform)
├── publisher/                ← MODULE 5: Platform posting & scheduling
├── agent/                    ← MODULE 6: AI orchestrator (future)
├── templates/                ← MODULE 4: Template library
├── data/                     ← MODULE 2: Content plan database
├── output/                   ← Generated assets
├── config/                   ← Credentials & settings
├── docs/                     ← BRD, tasks, agent docs
└── main.py                   ← Unified CLI
```

### Pipeline Flow

```
Scraper → data/raw/ → (AI review) → data/content/ → Generator → output/ → Publisher → Platform
```

---

## 7. Module Specifications

### Module 1 — Scraper (`scraper/`)
**Focus area for current development sprint.**

**Purpose:** Gather trending topics, blog posts, articles, images from the web. Feed the data store.

| File | Responsibility |
|------|---------------|
| `trend_scraper.py` | Google Trends, Reddit, Twitter trends |
| `blog_scraper.py` | Extract title, body, images from article URLs |
| `image_scraper.py` | Download referenced images |
| `rss_scraper.py` | Subscribe to topic RSS feeds |
| `dedup.py` | Avoid re-scraping existing items |

**Output schema** (`data/raw/<id>.json`):
```json
{
  "id": "raw_20260403_ai_agents",
  "scraped_at": "2026-04-03T09:00:00",
  "source": "reddit",
  "source_url": "https://...",
  "niche": "ai-engineering",
  "title": "Article title",
  "body": "Full text content...",
  "images": ["https://..."],
  "keywords": ["AI agents", "LLM", "automation"]
}
```

**Tech:** `requests`, `beautifulsoup4`, `feedparser`, `pytrends`, `praw` (Reddit)

---

### Module 2 — Data Store (`data/`)
**Purpose:** Central content pipeline DB. Tracks content from raw → review → approved → published.

```
data/
├── raw/        ← scraped items (unreviewed)
├── research/   ← curated ideas with metadata
├── content/    ← approved content plans (ready to generate)
└── archive/    ← published content
```

**Content JSON schema** (`data/content/<id>.json`):
```json
{
  "id": "post_ai_agents_20260405",
  "status": "draft",
  "platform": ["linkedin", "instagram_story", "tiktok"],
  "niche": "ai-engineering",
  "template": "carousel_dark",
  "post_date": "2026-04-05",
  "scheduled_time": "09:00",
  "source_url": "https://...",
  "slides": [
    {
      "HOOK_TITLE": "...",
      "HOOK_SUB": "...",
      "BODY_1_TITLE": "...",
      "BODY_1_TEXT": "...",
      "BODY_2_TITLE": "...",
      "BODY_2_TEXT": "...",
      "BODY_3_TITLE": "...",
      "BODY_3_TEXT": "...",
      "CTA_TITLE": "...",
      "CTA_TEXT": "..."
    }
  ]
}
```

**Status values:** `raw → draft → approved → scheduled → published → archived`

---

### Module 3 — Content Generator (`src/generator/`)
**Purpose:** Render approved JSON content into platform-specific visual assets.

| File | Responsibility |
|------|---------------|
| `base.py` | Shared PPTX/PDF/image logic (refactored from generator.py) |
| `linkedin.py` | 1:1 PDF carousel for LinkedIn |
| `instagram.py` | 1:1 feed post + 9:16 story images |
| `tiktok.py` | 9:16 vertical slideshow images |

**Platform formats:**
| Platform | Format | Dimensions |
|----------|--------|------------|
| LinkedIn | PDF carousel | 1:1 (10×10 in) |
| Instagram Feed | PNG images | 1:1 (1080×1080 px) |
| Instagram Story | PNG images | 9:16 (1080×1920 px) |
| TikTok | PNG slideshow | 9:16 (1080×1920 px) |

---

### Module 4 — Template Engine (`templates/`)
**Purpose:** Library of PPTX templates per niche and platform. User picks template at generation time.

```
templates/
├── carousel_dark_1x1/      ← current: LinkedIn + IG Feed
│   ├── main_carousel.pptx
│   └── template.json
├── carousel_minimal_1x1/   ← future
├── story_dark_9x16/        ← future: IG Story + TikTok
└── registry.json           ← catalog of all templates
```

**template.json schema:**
```json
{
  "id": "carousel_dark_1x1",
  "name": "Dark Carousel",
  "niche": ["ai-engineering", "data-science"],
  "platforms": ["linkedin", "instagram_feed"],
  "aspect_ratio": "1:1",
  "placeholders": ["HOOK_TITLE", "HOOK_SUB", "BODY_1_TITLE", "BODY_1_TEXT",
                   "BODY_2_TITLE", "BODY_2_TEXT", "BODY_3_TITLE", "BODY_3_TEXT",
                   "CTA_TITLE", "CTA_TEXT"]
}
```

---

### Module 5 — Publisher & Scheduler (`publisher/`)
**Purpose:** Post approved + generated content to platforms on a schedule. Manual approval required before posting.

| File | Responsibility |
|------|---------------|
| `scheduler.py` | Queue management, cron-like dispatch |
| `linkedin_publisher.py` | LinkedIn REST API — PDF carousel upload |
| `instagram_publisher.py` | Meta Graph API — Feed + Story |
| `tiktok_publisher.py` | TikTok for Developers API — slideshow |

**Workflow:**
1. Content in `data/content/` with `status: approved`
2. User runs `main.py schedule --post <id> --time "2026-04-05 09:00"`
3. Scheduler dispatches at time, calls correct publisher
4. On success: status → `published`, file moved to `data/archive/`

---

### Module 6 — AI Agent (`agent/`) *(Future)*
**Purpose:** Autonomous orchestrator. Runs full pipeline with minimal human input.

| File | Responsibility |
|------|---------------|
| `orchestrator.py` | Coordinates all modules |
| `content_writer.py` | LLM prompt → structured slide JSON |
| `researcher.py` | Summarizes raw data into content plans |

---

## 8. Target Project Structure

```
baba-app/
├── scraper/
│   ├── __init__.py
│   ├── trend_scraper.py
│   ├── blog_scraper.py
│   ├── image_scraper.py
│   ├── rss_scraper.py
│   └── dedup.py
│
├── src/
│   ├── generator/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── linkedin.py
│   │   ├── instagram.py
│   │   └── tiktok.py
│   ├── content_manager.py
│   └── create_template.py
│
├── publisher/
│   ├── __init__.py
│   ├── scheduler.py
│   ├── linkedin_publisher.py
│   ├── instagram_publisher.py
│   └── tiktok_publisher.py
│
├── agent/
│   ├── __init__.py
│   ├── orchestrator.py
│   ├── content_writer.py
│   └── researcher.py
│
├── templates/
│   ├── carousel_dark_1x1/
│   │   ├── main_carousel.pptx
│   │   └── template.json
│   └── registry.json
│
├── data/
│   ├── raw/
│   ├── research/
│   ├── content/
│   └── archive/
│
├── output/
│   ├── pptx/
│   ├── pdf/
│   └── images/
│
├── config/
│   ├── .env.example
│   └── settings.py
│
├── docs/
│   ├── BRD.md              ← this file
│   └── TASKS.md            ← development tasks
│
├── main.py
├── requirements.txt
└── README.md
```

---

## 9. Technology Stack

| Layer | Tool |
|-------|------|
| Language | Python 3.11+ |
| PPTX Generation | `python-pptx` |
| PDF Conversion | LibreOffice (headless) |
| Image Conversion | `pdf2image`, `Pillow` |
| Web Scraping | `requests`, `beautifulsoup4`, `feedparser` |
| Trend Data | `pytrends`, `praw` (Reddit) |
| Scheduling | `APScheduler` |
| LinkedIn API | LinkedIn REST API v2 |
| Instagram API | Meta Graph API |
| TikTok API | TikTok for Developers API |
| AI / LLM | OpenAI / Anthropic / Gemini (TBD) |
| Config | `python-dotenv` |
| CLI | `argparse` |

---

## 10. Versioning

| Version | Changes |
|---------|---------|
| 1.0 | Initial BRD draft |
| 1.1 | Decisions updated: all platforms, both IG formats, both TikTok formats, manual approval, niche = AI/DS only for now |
| 1.2 | Phase 3 completion: Updated template sizes, switched CLI from typer to argparse |
| 1.3 | Phases 3.5–3.7 completion: Replaced flat JSON files with SQLite database. Replaced CLI with Streamlit GUI Dashboard. Added Universal Portal Auto-Parser for discovery engine. Added side-by-side Content Studio. |
