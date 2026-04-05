# 🤖 Baba-App — Content Automation Platform

> **Your personal AI content machine.** Scrape trending topics, write carousel content in a live studio, generate platform-ready visuals, and publish — all from one local web app.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- [LibreOffice](https://www.libreoffice.org/download/download/) (required for PDF generation)

### 1. Start the Backend API
```bash
cd /path/to/baba-app
source venv/bin/activate
uvicorn main_api:app --reload
# → API running at http://localhost:8000
```

### 2. Start the Frontend
```bash
cd frontend
npm install          # first time only
npm run dev
# → App running at http://localhost:5173
```

Open **http://localhost:5173** in your browser. You're ready.

---

## 🗺️ The 4-Page Workflow

Baba-App follows a linear content creation pipeline across 4 pages accessible from the **top navigation bar**:

```
Scraper  →  Data  →  Content Studio  →  Generator
```

---

### 📡 Page 1 — Scraper Console

**What it does:** Pulls fresh content from the internet into your local database.

| Card | What it scrapes |
|------|----------------|
| **RSS Feed Scraper** | Reads all feeds in `config/feeds.yaml`, saves new articles. Optionally filter by niche. |
| **Single URL Scrape** | Deep-scrapes one article URL. Enable **Stealth Mode** to bypass anti-bot protections. |
| **Trends Scraper** | Fetches Google Trends + top Reddit posts from AI/DS subreddits. |
| **Portal Discovery** | Crawls portal homepages (in `config/portals.yaml`) to find new article links. |
| **Add New Portal** | Enter any blog/news URL → auto-detects article link patterns → saves to `portals.yaml`. |

> **Tip:** All jobs run in the background. Switch to the **Data** tab to see results.

---

### 🗃️ Page 2 — Data Management

**What it does:** View and manage everything in your SQLite database.

Three tabs:

| Tab | Content |
|-----|---------|
| **Raw Content** | All scraped articles. Inspect full body text. Delete unwanted items. |
| **Content Pipeline** | All posts saved from Content Studio. Track draft → ready → published. |
| **Discovered Links** | URLs found by Portal Discovery that haven't been deeply scraped yet. |

> **Tip:** Use the **Inspect** button on any raw item to read the full article before writing about it.

---

### ✍️ Page 3 — Content Studio

**What it does:** A 3-panel live authoring workspace to turn raw research into finished slide drafts.

#### Layout

```
[ Source Material ] | [ Write Content ] | [ Live Preview ]
```

**Panel 1 — Source Material** *(collapsible)*
- Search your 1700+ scraped articles
- Click any article → full body text, author, date, source link all appear below
- Click any keyword or the copy button to copy text directly into the editor

**Panel 2 — Write Content**
- Slide navigation chips at the top: `🪝 Hook` `① Body 1` `② Body 2` `③ Body 3` `📣 CTA`
- Click a chip to switch to that slide's fields
- Character counters on every field (title: 80 chars, body: 280 chars)
- **Content Name** — give your post a memorable label (shows in Generator)
- **Publish to Platforms** — pick which platforms this post targets

**Panel 3 — Live Preview** *(collapsible)*
- Renders your slide deck as you type — no button clicks needed
- Click any slide card → jumps the editor to that slide's fields
- Dark background matches actual output template colors

#### Saving
1. Fill all slide fields
2. Give the post a **Content Name**
3. Select **platforms**
4. Click **Save to Content Pipeline**

> ✅ Saved posts appear in **Data → Content Pipeline** and are ready for the **Generator**.

---

### 🎨 Page 4 — Visual Generator

**What it does:** Takes a saved content post and renders it into platform-ready images.

#### How to use

1. **Select a Post** — picks from your Content Pipeline. Shows the post's name, slides, status, and platforms.
2. **Select a Template** — choose any installed PPTX template.
3. **Select a Platform** — LinkedIn, Instagram Feed, Instagram Story, or TikTok.
4. **Click Generate** — fires a background job. Page **auto-refreshes in ~8 seconds**.
5. **Images appear** grouped by platform below the controls.

> 🔁 **You can re-generate the same post** with different templates. Each run adds new images to the gallery. (Fixed: Now correctly serves images via API).

---

### 🤖 Page 5 — AI Agent (New)

**What it does:** Automatically draft carousels from raw articles.

1. Pick a raw article in Content Studio.
2. Click **AI Draft**.
3. AI generates the Hook, 3 Body slides, CTA, and a **Social Media Caption**.

---

## 🏗️ Architecture Overview

```
baba-app/
├── main_api.py              ← FastAPI entry point
├── agent/                   ← AI Drafting (LLM Orchestrator)
├── publisher/               ← Platform Publishing (API + Automation)
├── api/
│   └── routers/
│       ├── data.py          ← /api/data/*
│       ├── scraper.py       ← /api/scrape/*
│       ├── generator.py     ← /api/generator/*
│       └── agent.py         ← /api/agent/* (New)
├── scraper/                 ← Web scraping engines (Scrapling + feedparser)
├── src/
│   ├── database.py          ← SQLite helpers (Extended for captions)
│   └── generator/           ← PPTX → PDF → PNG per platform
├── scripts/
│   └── desktop_publisher.py ← Multi-platform automation bridge
├── templates/               ← PPTX template files + registry.json
├── config/                  ← feeds.yaml, portals.yaml, .env
├── data/                    ← baba_app.sqlite lives here
├── output/                  ← Generated PDFs and PNGs
└── frontend/                ← React + Vite + Ant Design app
    └── src/
        ├── App.tsx           ← Top-nav layout + routing
        ├── api/              ← Service layer (dataService, scraperService, generatorService)
        ├── pages/            ← ScraperConsole, DataManagement, ContentStudio, VisualGenerator
        ├── components/       ← Reusable UI components (RawDataTable, etc.)
        └── types/            ← TypeScript interfaces mirroring DB schema
```

### API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/data/raw` | All scraped articles |
| `DELETE` | `/api/data/raw/{id}` | Delete a raw item |
| `GET` | `/api/data/content` | All content pipeline posts |
| `POST` | `/api/data/content` | Save a new draft post |
| `DELETE` | `/api/data/content/{id}` | Delete a post |
| `GET` | `/api/data/discovered` | All portal-discovered links |
| `POST` | `/api/scrape/rss` | Run RSS feed scraper |
| `POST` | `/api/scrape/url` | Scrape a single URL |
| `POST` | `/api/scrape/trends` | Fetch Google + Reddit trends |
| `POST` | `/api/scrape/discovery` | Run portal discovery |
| `POST` | `/api/scrape/portal` | Add a new portal |
| `GET` | `/api/generator/templates` | List available templates |
| `GET` | `/api/generator/templates/{id}` | Get template schema (incl. placeholders) |
| `POST` | `/api/generator/generate` | Trigger visual generation job |
| `GET` | `/api/generator/outputs/{post_id}` | List generated images for a post |
| `GET` | `/api/generator/image/{platform}/{id}/{file}` | Serve a PNG image |

---

## ⚙️ Configuration

### RSS Feeds — `config/feeds.yaml`
Add your content sources here. Each feed entry needs a URL and a niche tag.

### Portals — `config/portals.yaml`
Auto-generated when you use the **Add New Portal** card. Controls what the Portal Discovery scraper crawls.

### Environment — `.env`
Copy `.env.example` and fill in:
```env
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
REDDIT_USER_AGENT=...
```
Reddit credentials are only needed for the Trends scraper. RSS, URL, and Portal scrapers work without it.

### LibreOffice Path
The generator expects LibreOffice at:
```
/Applications/LibreOffice.app/Contents/MacOS/soffice
```
If yours is elsewhere, update `src/generator/base.py`.

---

## 🧩 Adding a New Template

1. Create a folder in `templates/` — e.g. `templates/my_new_template/`
2. Add your `template.pptx` file
3. Create `template.json` with this schema:
```json
{
  "id": "my_new_template",
  "name": "My New Template",
  "aspect_ratio": "1:1",
  "platforms": ["linkedin", "instagram_feed"],
  "niche": ["ai-engineering"],
  "status": "active",
  "description": "A clean minimal carousel",
  "placeholders": ["HOOK_TITLE", "HOOK_SUB", "BODY_1_TITLE", "BODY_1_TEXT", "CTA_TITLE", "CTA_TEXT"],
  "slides": [
    { "index": 0, "type": "hook" },
    { "index": 1, "type": "body_1" },
    { "index": 2, "type": "cta" }
  ],
  "colors": {
    "background": "#0f172a",
    "accent_primary": "#38bdf8",
    "text_primary": "#f8fafc",
    "text_secondary": "#94a3b8"
  }
}
```
4. Add a reference in `templates/registry.json`
5. The template appears immediately in Content Studio and Generator dropdowns — no restart needed.

---

## 🗺️ Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Python scraping engine | ✅ Done |
| 2 | SQLite database layer | ✅ Done |
| 3 | PPTX → PDF → PNG generator | ✅ Done |
| 4 | FastAPI backend with routers | ✅ Done |
| 5 | React frontend (all 4 pages) | ✅ Done |
| 6 | Publisher — LinkedIn API | 🔜 Next |
| 7 | Publisher — Instagram/TikTok | 🔜 Planned |
| 8 | Scheduler (APScheduler) | 🔜 Planned |
| 9 | AI Agent (auto-draft from raw) | 🔜 Planned |

---

## 🛠️ Development Notes

### Running in development
Both servers must be running at the same time:
```bash
# Terminal 1 — Backend
uvicorn main_api:app --reload

# Terminal 2 — Frontend  
cd frontend && npm run dev
```

### API docs
FastAPI auto-generates interactive docs:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Agent / AI rules
- Frontend pages **never** import from Python code
- Pages **never** call `apiClient` directly — always use the service layer (`dataService`, `scraperService`, `generatorService`)
- Adding a new page: create in `src/pages/`, add import + route + nav item in `App.tsx`
- Adding a new API endpoint: add to the relevant router in `api/routers/`, update the matching service file in `frontend/src/api/`
