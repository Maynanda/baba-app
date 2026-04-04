# 📋 BRD — Baba-App: Automated Content Creation Platform
**Version:** 2.0 · **Date:** 2026-04-04 · **Status:** Approved for Development

---

## 1. Executive Summary

**Baba-App** is a local, Python and Node.js powered content automation platform for a personal brand in the **AI Engineering & Data Science** niche. The system automates the full content lifecycle:

> **Trend Research & Scraping → Content Planning → Visual Generation → Scheduling & Publishing**

Runs entirely on a local machine. Will grow into an AI-agent-driven pipeline over time. Built on a completely decoupled architecture, consisting of a fast Python backend REST API and a robust React/Vite web application.

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
| G7 | Decoupled Architecture: Ensure Python engine and React UI interact strictly via REST |

---

## 4. Decisions & Constraints

| Item | Decision |
|------|----------|
| UI Framework | React + Vite + Ant Design |
| API Framework | FastAPI + Uvicorn |
| Niche | AI Engineering + Data Science only for now (expandable later) |
| Platforms | LinkedIn → TikTok → Instagram (all eventually) |
| Integration | Frontend and Backend MUST operate completely independently |
| AI provider | TBD (OpenAI / Claude / Gemini) |
| Approval workflow | Manual review before publish (no auto-post) |
| Runtime | Local machine only |
| Language | Python 3.11+, TypeScript/Node.js |

---

## 5. Current State (What Exists)

```
baba-app/
├── backend/ (Python API layer context)
│   ├── scraper/                ← Scrapling & portals setup
│   ├── src/generator/          ← PPTX → PDF → PNG pipeline
│   ├── config/                 ← Credentials & settings
│   ├── data/                   ← SQLite database (baba_app.sqlite)
│   └── main_api.py             ← FastAPI entry point
│
├── frontend/ (Node/React presentation layer)
│   └── src/
│       ├── App.tsx             ← Ant Design Layout setup
│       └── pages/              ← DataManagement module initialized
```

### What's Working ✅
- Fully functional backend Python SQLite database
- Fast web scraping pipeline powered by `Scrapling`.
- High quality PPTX → PDF → PNG automated generator.
- Basic FastAPI wrapper serving database via HTTP REST endpoints.
- React/Vite scaffolding initialized with Ant Design layout.

### What's Missing ❌
- Complete React UI parity with legacy Streamlit tool.
- Comprehensive REST endpoints mapped to `src/generator` and `scraper`.
- Platform publishers (no API integrations).
- Content scheduler.
- AI content generator.

---

## 6. System Architecture

```
baba-app/
├── frontend/                 ← MODULE 7: React + Vite + TS UI
├── scraper/                  ← MODULE 1: Trend & content research
├── src/
│   └── generator/            ← MODULE 3: Visual asset generation (per platform)
├── publisher/                ← MODULE 5: Platform posting & scheduling
├── agent/                    ← MODULE 6: AI orchestrator (future)
├── templates/                ← MODULE 4: Template library
├── data/                     ← MODULE 2: Content plan database (SQLite)
├── output/                   ← Generated assets
├── config/                   ← Credentials & settings
├── docs/                     ← BRD, tasks, agent docs
└── main_api.py               ← Unified FastAPI Entry Point
```

### Pipeline Flow

```
(User via Frontend) → REST API → Scraper → SQLite DB → (User Review) → REST API → Generator → Output → Publisher
```

---

## 7. Module Specifications

### Module 1 — Scraper (`scraper/`)
**Purpose:** Gather trending topics, blog posts, articles, images from the web. Feed the data store. Driven by the `Scrapling` framework. Exposed via `/api/scrape/` endpoints.

### Module 2 — Data Store (`data/`)
**Purpose:** Central content pipeline DB (SQLite format, `baba_app.sqlite`). Exposed via `/api/data/` endpoints. 

### Module 3 — Content Generator (`src/generator/`)
**Purpose:** Render approved JSON content into platform-specific visual assets via `python-pptx` and LibreOffice. Exposed via `/api/generate/` endpoints.

### Module 4 — Template Engine (`templates/`)
**Purpose:** Library of PPTX templates per niche and platform. User picks template at generation time.

### Module 5 — Publisher & Scheduler (`publisher/`)
**Purpose:** Post approved + generated content to platforms on a schedule.

### Module 6 — AI Agent (`agent/`)
**Purpose:** Autonomous orchestrator. Runs full pipeline with minimal human input.

### Module 7 — Frontend Application (`frontend/`)
**Focus area for current development sprint.**
**Purpose:** Modern React web application serving as the sole interface for the user to control the rest of the modules. Communicates to `main_api.py`.
- **Scraper Console:** Forms and Toggles for Discovery Portals and Deep Scrape URLs.
- **Data Browser:** Paginated `antd` table views of the raw scraped database and processed content pipelines.
- **Visual Generator:** Post selection drop downs leading into automated image preview carousels.
- **Content Studio:** Spilt-screen interface featuring raw web intelligence next to dynamic form generation based on selected PPTX templates.

---

## 8. Technology Stack

| Layer | Tool |
|-------|------|
| **Backend Lang** | Python 3.11+ |
| **API Framework** | FastAPI, Uvicorn |
| **Frontend Framework**| React, Vite, TypeScript |
| **Frontend UI** | Ant Design, Axios, React Router |
| **PPTX Gen** | `python-pptx` |
| **PDF Conversion** | LibreOffice (headless) |
| **Web Scraping** | `scrapling`, `feedparser` |
| **Trend Data** | `pytrends`, `praw` (Reddit) |
| **AI / LLM** | OpenAI / Anthropic / Gemini (TBD) |
| **Config** | `python-dotenv` |

---

## 9. Versioning

| Version | Changes |
|---------|---------|
| 1.0 - 1.4 | Initial iterations, Streamlit development up to Scrapling Stealth integrations |
| 2.0 | Complete architecture revamp. Strip Streamlit logic, convert to FastAPI Backend + React/Vite Frontend decoupled architecture |
