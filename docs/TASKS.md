# 📌 TASKS.md — Baba-App Development Tracker
**Last Updated:** 2026-04-04 · **Reference:** [BRD.md](./BRD.md)

---

## How to Use This File
- `[ ]` Not started
- `[/]` In progress
- `[x]` Done
- Each task is labeled with its **Module** and is independently buildable.
- Agents and developers should update status here as they work.

---

## Phase 1 — Foundation & Repository Cleanup ✅ COMPLETE
> Goal: Establish correct folder structure, config, enhanced data schema, and CLI base.

## Phase 2 — Scraper Module ✅ COMPLETE
> Goal: Automate trend discovery and raw content research yielding DB artifacts. Powered by Scrapling.

## Phase 3 — Generator Refactor ✅ COMPLETE
> Goal: Multi-platform visual generation. User picks platform + template at generation time.

## Phase 3.5 - 3.10 — Streamlit Integrations ❌ DEPRECATED
> Goal: Legacy Streamlit phases. The features built here (Scrapling, Auto-Parsers, SQLite, Stealth Checkboxes) are **migrated**, but the Streamlit UI components are **deprecated** in favor of Phase 5.

---

## Phase 4 — REST API Integration (FastAPI)
> Goal: Wrap all legacy backend features into a centralized HTTP API to be consumable by independent frontend apps.

### `main_api.py` Core
- [x] Integrate FastAPI, Uvicorn, CORS Middleware.
- [x] Refactored to router-only entry point — all logic in `api/routers/`

### `api/routers/data.py` — Data endpoints
- [x] `GET /api/data/raw` — all raw scraped items
- [x] `GET /api/data/content` — all content pipeline posts
- [x] `GET /api/data/discovered` — all portal-discovered links
- [x] `DELETE /api/data/raw/{id}` — delete a raw item
- [x] `DELETE /api/data/content/{id}` — delete a post

### `api/routers/scraper.py` — Scraper trigger endpoints
- [x] `POST /api/scrape/rss` — trigger RSS feed scraping (background)
- [x] `POST /api/scrape/url` — deep scrape a single URL (background)
- [x] `POST /api/scrape/trends` — Google Trends + Reddit (background)
- [x] `POST /api/scrape/discovery` — portal discovery engine (background)
- [x] `POST /api/scrape/portal` — auto-generate portal config (sync)

### Remaining
- [x] `api/routers/generator.py` — trigger PPTX → PDF generation & serve images
- [x] `POST /api/data/content` — save new posts from Content Studio

---

## Phase 5 — React UI Implementation
> Goal: Completely decouple user presentation, using Vite, React, Ant Design, and Axios to talk to the Backend API.

### Foundation
- [x] Initial Vite + React + TS App Scaffold (`frontend/`)
- [x] Install Dependencies (`antd`, `react-router-dom`, `axios`)
- [x] General App Layout Component — Sidebar, Header, Footer, Router
- [x] `src/types/index.ts` — TypeScript interfaces for all DB records and API responses
- [x] `src/api/client.ts` — Centralized Axios instance (base URL config)
- [x] `src/api/dataService.ts` — Pure functions for all data endpoints
- [x] `src/api/scraperService.ts` — Pure functions for all scraper endpoints
- [x] `src/api/generatorService.ts` — Pure functions for template listing, generation, image serving

### Pages & Components
- [x] `ScraperConsole.tsx` — 5 independent scraper cards (RSS, URL, Trends, Discovery, Add Portal)
- [x] `DataManagement.tsx` — 3 tabs: Raw Content, Content Pipeline, Discovered Links
- [x] `RawDataTable.tsx` — Isolated Ant Design table component with Inspect + Delete
- [x] `VisualGenerator.tsx` — Template + platform selectors, generate button, live image grid
- [x] `ContentStudio.tsx` — Split-screen: raw source inspector + dynamic template form + save to pipeline

---

## Phase 6 — Publisher & Scheduler
> Goal: Post approved content to platforms at scheduled times. Manual approval required.
*(See previous iterations for granular platform-specific tasks. Paused pending UI integration)*

## Phase 7 — AI Agent
> Goal: Autonomous pipeline. Research → Write → Generate → Schedule. Minimal human input.
*(Paused pending UI integration)*

---

## Notes for Future Agents
- **STRICT ARCHITECTURE:** The Frontend and Backend are decoupled. NEVER write Python logic into the Frontend, and NEVER write UI templating logic into the Python Backend.
- BRD is in `docs/BRD.md` — read this first before making any structural changes.
- Ensure API error handling is passed gracefully to the user via Ant Design `message` or `notification`.
