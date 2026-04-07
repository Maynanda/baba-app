# 📋 BRD — Baba-App: Automated Content Creation Platform
**Version:** 3.0 · **Date:** 2026-04-06 · **Status:** Active Development

---

## 1. Executive Summary

**Baba-App** is a local, Python + React content automation platform for a personal brand in the **AI Engineering & Data Science** niche. The system automates the full content lifecycle:

> **Trend Research & Scraping → Content Writing (4-Panel Ultimate Workspace) → Visual Generation (Dynamic) → Desktop/Manual Publishing (Finder Bridge)**

Runs entirely on a local machine. Built on a fully decoupled architecture: a FastAPI Python backend communicating with a React/Vite frontend via a typed REST API. No Streamlit.

---

## 2. Brand Context

- **Owner:** Personal brand — AI Engineer & Data Scientist
- **Niche:** AI Engineering, Data Science, practical ML explanations
- **Voice:** "AI practitioner who explains it simply"
- **Platforms (priority order):** LinkedIn → Instagram Feed → Instagram Story → TikTok

---

## 3. Goals & Objectives

| # | Goal | Status |
|---|------|--------|
| G1 | Automate trend discovery & research | ✅ Done |
| G2 | 4-Panel Ultimate Content Studio (resizable, edge-to-edge) | ✅ Done |
| G3 | Produce platform-ready visual assets (Images + PDF Carousels) | ✅ Done |
| G4 | Productivity Bridge: Reveal in Finder for local publication | ✅ Done |
| G5 | Reusable PPTX template library (Dynamic detection) | ✅ Done |
| G6 | AI agent for autonomous drafting (Slides + Captions) | ✅ Done |
| G7 | Desktop Publishing Assistant (Playwright-driven manual bridge) | ⏳ In Progress |

---

## 4. Decisions & Constraints

| Item | Decision |
|------|----------|
| UI Framework | React + Vite + TypeScript + Ant Design |
| API Framework | FastAPI + Uvicorn |
| Navigation | Top horizontal header nav (no sidebar) |
| Content DB | SQLite via `src/database.py` |
| Niche | AI Engineering + Data Science (expandable) |
| Platforms | LinkedIn, Instagram Feed, Instagram Story, TikTok |
| Integration | Frontend and Backend MUST operate completely independently |
| AI provider | TBD (OpenAI / Claude / Gemini) |
| Approval workflow | Manual save + manual generate (no auto-post yet) |
| Runtime | Local machine only |
| Language | Python 3.11+, TypeScript/Node.js 18+ |
| Legacy | Streamlit (`app.py`) is deprecated — not maintained |

---

## 5. Current State

### What's Working ✅

| Feature | Details |
|---------|---------|
| **Scraper Console** | RSS, Single URL (with Stealth Mode), Google/Reddit Trends, Portal Discovery, Add Portal |
| **Autonomous Mode** | **"Pro Mode"**: Enables the model to explore the local template registry, analyze schemas, and design new layouts via `register_custom_template`. |
| **Design Assistant**| **"Magic Design"**: Translates natural language descriptions into a valid `template.json` schema (colors, logic, and structure). |
| **Context Window** | Synthesizes up to 10 articles simultaneously using long-context metadata. |
| **Data Management** | Raw Content table, Content Pipeline table, Discovered Links table |
| **Content Studio** | **Ultimate Workspace (4-panel)**: Resizable panels, Research Inspector, flat JSON save |
| **AI Magic Draft** | One-click carousel drafting via Google Gemini 1.5 Flash |
| **Visual Generator** | Smart PPTX discovery, PDF Carousel serving, Auto-refresh gallery |
| **Finder Bridge** | "Reveal in Finder" button to jump to local output files instantly |
| **FastAPI Backend** | `/api/data/`, `/api/scrape/`, `/api/generator/` routers fully wired |
| **React Frontend** | 4-page app with top-nav, modular service layer, full-width edge-to-edge layout |

### What's Missing ❌

| Feature | Phase |
|---------|-------|
| Automated Platform Posting (Fully Unattended) | Phase 10 (Playwright) |
| Scheduler (APScheduler) | Phase 8 |
| Template Library Expansion | Phase 11 |

---

## 6. System Architecture (Extended)

```
baba-app/
├── main_api.py              ← FastAPI entry point
├── api/
│   └── routers/
│       ├── data.py          ← /api/data/*
│       ├── scraper.py       ← /api/scrape/*
│       └── generator.py     ← /api/generator/*
├── scripts/
│   └── desktop_publisher.py ← Playwright automation engine
├── scraper/                 ← Scrapling + feedparser scraping engines
├── src/
│   ├── database.py          ← SQLite read/write helpers
│   └── generator/           ← PPTX → PDF → PNG pipeline
├── templates/               ← PPTX files + template.json schemas + registry.json
├── config/                  ← feeds.yaml, portals.yaml, .env
├── data/                    ← baba_app.sqlite
├── output/images/           ← Generated PNGs organized by platform/post_id
└── frontend/
    └── src/
        ├── App.tsx          ← Top-nav layout + React Router
        ├── api/             ← Service layer (typed functions per endpoint)
        │   ├── client.ts    ← Axios base client (http://localhost:8000/api)
        │   ├── dataService.ts
        │   ├── scraperService.ts
        │   └── generatorService.ts
        ├── pages/           ← One file per page
        │   ├── ScraperConsole.tsx
        │   ├── DataManagement.tsx
        │   ├── ContentStudio.tsx
        │   └── VisualGenerator.tsx
        ├── components/      ← Reusable UI components
        └── types/index.ts   ← TypeScript interfaces (mirrors DB schema)
```

### Data Flow

```
[Browser] → GET/POST http://localhost:5173
                     ↓ (Vite dev proxy)
            React Pages → API Service Layer → Axios → http://localhost:8000/api
                                                              ↓
                                                       FastAPI Routers
                                                              ↓
                                                    src/database.py (SQLite)
                                                    scraper/ engines
                                                    src/generator/ pipeline
```

---

## 7. Module Specifications

### Module 1 — Scraper (`scraper/`)
**Purpose:** Intelligence gathering from the web.
- `rss_scraper.py` → reads `config/feeds.yaml`, performs automated Deep Scraping (full text/images) for high-quality ingestion, saves to `raw_content` table
- `url_scraper.py` → single URL deep scrape using Scrapling (with optional Stealth/patchright mode)
- `trends_scraper.py` → Google Trends via `pytrends`, Reddit via `praw`
- `portal_scraper.py` → crawls portals in `config/portals.yaml`, saves to `discovered_links`
- **API:** `POST /api/scrape/{rss|url|trends|discovery|portal}`

### Module 2 — Data Store (`data/baba_app.sqlite`)
**Purpose:** Central content pipeline database.

| Table | Purpose |
|-------|---------|
| `raw_content` | All scraped articles (id, niche, source, title, data_json, scraped_at) |
| `posts` | Content pipeline drafts (id, status, niche, template, platforms, data_json) |
| `discovered_links` | Portal-found URLs awaiting scraping |
| `seen_urls` | URL deduplication log |

**API:** `GET/POST/DELETE /api/data/{raw|content|discovered}`

### Module 3 — Visual Generator (`src/generator/`)
**Purpose:** Render approved JSON content into platform visuals.
- Reads post JSON → fills PPTX placeholders via `python-pptx`
- Converts PPTX → PDF via LibreOffice headless
- Converts PDF → PNG via `pdf2image` / `Pillow`
- Outputs to `output/images/{platform}/{post_id}/`
- **API:** `POST /api/generator/generate` (BackgroundTasks, non-blocking)

### Module 4 — Template Engine (`templates/`)
**Purpose:** Library of PPTX templates per niche and platform.
- Each template is a folder with `template.pptx` + `template.json`
- **Style Categories:** 
  - **Dark High-Impact:** (Neon/Deep Blue - current default)
  - **Light Minimalist:** (White background, high contrast, 1 image focus - NEW)
- Each template.json defines: placeholders, slide types, colors, supported platforms
- **Design Rule:** 1 Idea per slide + 24pt+ bold typography for high mobile readability.
- **API:** Content Studio reads placeholder list to auto-generate form fields.
- **API:** Live Preview reads color palette to render accurate CSS slide mockups.

### Module 5 — Publisher & Scheduler *(Phase 6-8)*
**Purpose:** Post approved content to platforms on schedule.
- LinkedIn API integration
- Instagram Graph API
- TikTok API
- APScheduler for time-based triggers

### Module 8 — Source & Scheduler Manager *(Phase 8 - NEW)*
**Purpose:** Manage intelligence sources and automation frequencies.
- **Source Dashboard**: CRUD UI for `feeds.yaml` and `portals.yaml`.
- **Scheduler UI**: View current background jobs, next run times, and execution logs.
- **Dynamic Config**: Change scraping frequency (1h, 6h, 24h) per source without code edits.
- **Autonomous Digesting**: Background service to keep the database fresh 24/7.

### Module 6 — AI Agent *(Phase 9)*
**Purpose:** Autonomous content orchestrator.
- Auto-drafts slide content from raw scraped articles
- Selects optimal template per niche/topic
- Queues for human review before publishing

### Module 7 — Frontend (`frontend/`)
**Purpose:** React web app — the sole user interface.
- **ScraperConsole:** 5 independent scraper cards, each triggers a background API job
- **DataManagement:** 3-tab database browser with lazy loading + CRUD
- **ContentStudio:** 3-panel live studio (Source Inspector + Slide Editor + Live Preview)
- **VisualGenerator:** Post/template/platform picker + auto-refresh image gallery
- **Rule:** Pages never call `apiClient` directly — always use the service layer

---

## 8. Content Studio — Detailed UX Spec

### Panel 1 — Source Material (collapsible left)
- Searchable list of all raw scraped articles
- Click article → shows: title (copyable), source URL, date, author, keywords (copyable), full body (copyable)
- Establishes `raw_ref_id` link on saved post for traceability

### Panel 2 — Slide Editor (center)
- Template info badge at top (name, aspect ratio, platforms)
- Slide navigation chips: `🪝 Hook` `① Body 1` `② Body 2` `③ Body 3` `📣 CTA`
- Click chip → shows only that slide's fields
- Fields dynamically generated from `template.json` `placeholders` array
- Character counters: title (80 chars), body/subtitle (280 chars)
- **Content Name field** — human label for the post
- **Platform selector** — multi-select override for platform targets
- Save → `POST /api/data/content`

### Panel 3 — Live Preview (collapsible right)
- Dark background CSS slide cards matching template colors
- Updates on every keystroke (no button)
- Click any slide card → navigates the Slide Editor to that slide's fields
- Green dot indicator when content is being written

---

## 9. Visual Generator — Detailed UX Spec

- Post selector shows content_name (human label) not just post ID
- Post detail card shows: status, niche, template, platforms, slide types
- Template + Platform are **independent** from what was saved — user can mix/match freely
- InfoCircle tooltip explains: "re-generate with different template/platform to add images"
- After Generate click: status shows "⏱ Generating… auto-refreshing in ~8s"
- Auto-polls at 8s and 20s after generation — shows "✅ Done!" when images loaded
- Manual Refresh button always available
- Images grouped by platform in output gallery

---

## 10. Technology Stack

| Layer | Tool |
|-------|------|
| **Backend** | Python 3.11+, FastAPI, Uvicorn |
| **Database** | SQLite via `sqlite3` stdlib |
| **Scraping** | `scrapling`, `feedparser`, `pytrends`, `praw` |
| **PPTX Gen** | `python-pptx` |
| **PDF Export** | LibreOffice (headless) |
| **Image Export** | `pdf2image`, `Pillow` |
| **Frontend** | React 18, Vite, TypeScript |
| **UI Library** | Ant Design 5 |
| **HTTP Client** | Axios |
| **Routing** | React Router v6 |
| **Config** | `python-dotenv`, `PyYAML` |
| **AI (planned)** | OpenAI / Anthropic / Gemini |

---

## 11. Agent/Developer Rules

1. **No Python in frontend, no UI in Python** — strict separation at the API boundary
2. **API contract first** — update `src/types/index.ts` before adding new endpoints
3. **Service layer required** — all API calls go through `dataService`, `scraperService`, or `generatorService`
4. **Adding a page:** `src/pages/NewPage.tsx` → import in `App.tsx` → add `<Route>` → add nav item
5. **Adding an endpoint:** `api/routers/router.py` → add function to matching frontend service file
6. **Background jobs only** — generation and scraping must use FastAPI `BackgroundTasks`

---

## 12. Versioning

| Version | Changes |
|---------|---------|
| 1.0–1.4 | Streamlit iterations, Scrapling stealth integration |
| 2.0 | Full architecture revamp: FastAPI backend + React/Vite frontend |
| 2.1 | Feature complete: Content Studio (live), Visual Generator (auto-refresh), header nav, save pipeline fix |
