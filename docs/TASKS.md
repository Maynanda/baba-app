# 📝 TASKS — Baba-App Development Roadmap
**Last updated:** 2026-04-05 · **Version:** 2.1

Quick legend: ✅ Done · 🔜 Next · ⏳ In Progress · ❌ Not Started

---

## ✅ Phase 1 — Scraping Engine

- [x] `rss_scraper.py` — feedparser, saves to `raw_content` table
- [x] `url_scraper.py` — Scrapling deep scrape with optional patchright stealth
- [x] `trends_scraper.py` — Google Trends (pytrends) + Reddit (praw)
- [x] `portal_scraper.py` — Portal homepage crawl → `discovered_links` table
- [x] `config/feeds.yaml` — RSS feed configuration
- [x] `config/portals.yaml` — Portal source configuration

---

## ✅ Phase 2 — Database Layer

- [x] `src/database.py` — SQLite helpers, all CRUD for all tables
- [x] `raw_content` table — scraped articles
- [x] `posts` table — content pipeline (draft → approved → published)
- [x] `discovered_links` table — portal-found URLs queue
- [x] `seen_urls` table — URL deduplication

---

## ✅ Phase 3 — Visual Generator

- [x] `src/generator/base.py` — PPTX fill + LibreOffice PDF export + PNG conversion
- [x] `src/generator/linkedin.py` — LinkedIn PDF carousel
- [x] `src/generator/instagram.py` — Feed (1:1) and Story (9:16) PNGs
- [x] Template registry schema (`templates/registry.json`)
- [x] Template JSON schema (`template.json` per template folder)
- [x] `carousel_dark_1x1` reference template

---

## ✅ Phase 4 — FastAPI Backend

- [x] `main_api.py` — FastAPI entry point, mounts all routers
- [x] `api/routers/data.py` — GET/DELETE raw, GET/POST/DELETE content, GET discovered
- [x] `api/routers/scraper.py` — POST rss, url, trends, discovery, portal
- [x] `api/routers/generator.py` — GET templates, GET template/{id}, POST generate, GET outputs, GET image
- [x] CORS middleware configured for React dev server
- [x] BackgroundTasks for all scraping and generation jobs

---

## ✅ Phase 5 — React Frontend

### Foundation
- [x] Vite + React + TypeScript scaffold (`frontend/`)
- [x] Ant Design, Axios, React Router installed
- [x] `src/App.tsx` — horizontal top-nav header layout
- [x] `src/types/index.ts` — TypeScript interfaces for all DB records
- [x] `src/api/client.ts` — Axios base client (`http://localhost:8000/api`)
- [x] `src/api/dataService.ts` — fetchRawData, fetchContentData, fetchDiscoveredLinks, deleteRaw, deletePost
- [x] `src/api/scraperService.ts` — runRss, runUrl, runTrends, runDiscovery, addPortal
- [x] `src/api/generatorService.ts` — fetchTemplates, fetchTemplate, triggerGenerate, fetchOutputs, getImageUrl

### Pages
- [x] `ScraperConsole.tsx` — 5 independent scraper cards, background jobs
- [x] `DataManagement.tsx` — 3 tabs, lazy loading, Inspect + Delete
- [x] `ContentStudio.tsx` — 3-panel live studio (source + editor + preview)
- [x] `VisualGenerator.tsx` — post picker, template/platform selectors, auto-refresh gallery

### Content Studio features
- [x] Collapsible Source panel and Preview panel
- [x] Full article inspector (title, author, date, keywords, body — all copyable)
- [x] Slide chip navigation (Hook, Body 1–3, CTA)
- [x] Dynamic form fields from `template.json` placeholders
- [x] Live preview on every keystroke (no button)
- [x] Click slide in preview → navigates editor to that slide
- [x] Content Name field
- [x] Platform multi-select
- [x] Save to `/api/data/content` (fixed: `async Request.json()`)

### Visual Generator features
- [x] Post detail card (name, slides, status, platforms)
- [x] Independent template + platform selection (re-generate freely)
- [x] Auto-poll after generation (~8s and ~20s)
- [x] Images grouped by platform in gallery
- [x] Alert when no posts saved yet

---

## 🔜 Phase 6 — Publisher: LinkedIn

- [ ] LinkedIn OAuth 2.0 flow
- [ ] `publisher/linkedin.py` — post PDF carousel via LinkedIn API
- [ ] `POST /api/publish/linkedin` endpoint
- [ ] "Publish" button on post detail in Data Management
- [ ] Post status update: draft → published

---

## 🔜 Phase 7 — Publisher: Instagram & TikTok

- [ ] Instagram Graph API integration
- [ ] TikTok API integration
- [ ] Batch publish (multiple platforms at once)

---

## 🔜 Phase 8 — Scheduler

- [ ] APScheduler integration into FastAPI startup
- [ ] `POST /api/schedule` — schedule a post for a future time
- [ ] Calendar/queue view in Data Management

---

## ❌ Phase 9 — AI Agent

- [ ] `agent/` module — LLM-powered auto-draft
- [ ] Input: raw article → Output: filled slides JSON
- [ ] Template selection heuristic (niche → best template)
- [ ] Human-in-the-loop review step before save
- [ ] `POST /api/agent/draft` endpoint

---

## 🐛 Known Issues & Tech Debt

| Item | Priority | Notes |
|------|----------|-------|
| `tiktok` generator module may not exist | Medium | `src/generator/tiktok.py` not confirmed |
| `instagram.py` generate_story/generate_feed — verify function signatures | Medium | Need to match generator router calls |
| Large bundle size warning (~1.1MB) | Low | Consider code splitting in Vite config |
| No authentication on any API endpoint | Low | Local machine only for now |
| Antd `bodyStyle` deprecation warnings | Low | Cosmetic, no functional impact |
