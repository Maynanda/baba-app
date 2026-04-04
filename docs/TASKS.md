# 📌 TASKS.md — Baba-App Development Tracker
**Last Updated:** 2026-04-03 · **Reference:** [BRD.md](./BRD.md)

---

## How to Use This File
- `[ ]` Not started
- `[/]` In progress
- `[x]` Done
- Each task is labeled with its **Module** and is independently buildable.
- Agents and developers should update status here as they work.

---

## Phase 1 — Foundation & Repository Cleanup
> Goal: Establish correct folder structure, config, enhanced data schema, and unified CLI.

### Structure
- [x] Create `docs/` folder with BRD.md and TASKS.md
- [x] Create `scraper/` top-level folder with `__init__.py`
- [x] Create `publisher/` top-level folder with `__init__.py`
- [x] Create `agent/` top-level folder with `__init__.py`
- [x] Reorganize `src/generator/` as a sub-package (base, linkedin, instagram, tiktok)
- [x] Create `data/raw/`, `data/research/`, `data/content/`, `data/archive/` folders
- [x] Create `config/` folder with `.env.example` and `settings.py`
- [x] Create `templates/carousel_dark_1x1/` and move `main_carousel.pptx` into it
- [x] Create `templates/carousel_dark_1x1/template.json`
- [x] Create `templates/registry.json`

### Config
- [x] `config/.env.example` — document all required API keys
- [x] `config/settings.py` — load `.env`, expose config constants
- [x] `config/feeds.yaml` — RSS feed catalog for AI/DS blogs

### Enhanced Data Schema
- [x] Update existing `data/*.json` files to new schema (add `id`, `status`, `platform`, `niche`, `template`)
- [x] Move existing `data/*.json` files → `data/content/`

### Unified CLI
- [x] Create `main.py` with argparse CLI
  - [x] `main.py scrape rss --niche ai`
  - [x] `main.py scrape trends --source google|reddit|all`
  - [x] `main.py scrape url --url https://...`
  - [x] `main.py content list`
  - [x] `main.py content create <name>`
  - [x] `main.py generate --post <id> --platform linkedin`
  - [x] `main.py generate --post <id> --all-platforms`
  - [x] `main.py templates list`

---

## Phase 2 — Scraper Module ✅ COMPLETE
> Goal: Automate trend discovery and raw content research. Saves to `data/raw/`.

### `scraper/trend_scraper.py`
- [x] `get_google_trends(keywords, niche)` — pytrends integration
- [x] `get_reddit_trending(subreddit, niche)` — praw integration
- [x] Save each result to `data/raw/<id>.json`
- [x] CLI: `main.py scrape trends --source google --niche ai`

### `scraper/blog_scraper.py`
- [x] `scrape_article(url)` — extract title, body text, author, date
- [x] `extract_images(url)` — list image URLs from page
- [x] Handle anti-bot headers and common site structures
- [x] Save to `data/raw/<id>.json`
- [x] CLI: `main.py scrape url --url https://example.com/article`

### `scraper/rss_scraper.py`
- [x] Define a feed list in `config/feeds.yaml`
- [x] `fetch_rss(feed_url)` — parse feed, extract items
- [x] `run_all_feeds()` — iterate feed list, scrape all new items
- [x] Save to `data/raw/<id>.json`
- [x] CLI: `main.py scrape rss`

### `scraper/image_scraper.py`
- [x] `download_image(url, post_id)` — save to `data/raw/images/<post_id>/`
- [x] Called by blog_scraper automatically

### `scraper/dedup.py`
- [x] `is_duplicate(url)` — check against existing raw items
- [x] `mark_seen(url)` — record scraped URLs in `data/raw/_seen.json`

---

## Phase 3 — Generator Refactor ✅ COMPLETE
> Goal: Multi-platform visual generation. User picks platform + template at generation time.

### `src/generator/base.py`
- [x] Refactor existing `generator.py` logic into `base.py`
- [x] `load_template(template_id)` — look up from `templates/registry.json`
- [x] `fill_placeholders(pptx, data)` — existing replace logic
- [x] `export_pdf(pptx_path)` — LibreOffice conversion
- [x] `export_images(pdf_path, output_dir)` — pdf2image conversion

### `src/generator/linkedin.py`
- [x] `generate(post_id, template_id)` → PDF carousel in `output/pdf/`

### `src/generator/instagram.py`
- [x] `generate_feed(post_id, template_id)` → 1:1 PNG images in `output/images/instagram_feed/`
- [x] `generate_story(post_id, template_id)` → 9:16 PNG images in `output/images/instagram_story/`

### `src/generator/tiktok.py`
- [x] `generate_slideshow(post_id, template_id)` → 9:16 PNG images in `output/images/tiktok/`

### Template Engine
- [x] Create `templates/story_dark_9x16/` — 9:16 dark template for IG Story + TikTok
- [x] `src/create_template.py` → parametrize for 1:1 vs 9:16


---

## Phase 3.5 — SQLite & Streamlit Frontend ✅ COMPLETE
> Goal: Replace JSON file pipeline with SQLite DB and provide a visual dashboard.

### `src/database.py`
- [x] Implement `init_db()`
- [x] Implement `save_raw()` & `get_all_raw()`
- [x] Implement `save_post()`, `get_post()`, `get_all_posts()`

### Scraper refactor
- [x] `scraper/trend_scraper.py` → saves to sqlite
- [x] `scraper/blog_scraper.py` → saves to sqlite
- [x] `scraper/rss_scraper.py` → saves to sqlite
- [x] `scraper/dedup.py` → query sqlite instead of JSON files

### CLI refactor
- [x] `main.py` `content list` → queries sqlite
- [x] `main.py` `content create` → inserts to sqlite
- [x] `main.py` `generate` → fetches from sqlite

### Generator refactor
- [x] `src/generator/base.py` and `main.py` dispatch decoupled from file loading

### Streamlit `app.py`
- [x] Streamlit dependencies (`pandas`, `streamlit`)
- [x] **Tab 1: Scraper Console** — visual trigger for scrapers
- [x] **Tab 2: Data Management** — `st.dataframe` for raw & content pipelines
- [x] **Tab 3: Visual Generator** — post selection, multi-platform rendering, image preview

---

## Phase 3.6 — Portal Discovery & Auto-Parser ✅ COMPLETE
> Goal: Advanced multi-step scraping system that auto-generates CSS rules for any info source.

### Database updates
- [x] Add `discovered_links` table in `src/database.py`

### Auto-Parser & Discovery
- [x] `scraper/parser_generator.py` — Auto-detect rules using heuristics
- [x] `config/portals.yaml` — Initialize config format
- [x] `scraper/portal_scraper.py` — Scrape portals based on generated config

### Streamlit `app.py` updates
- [x] **Tab: Portal Manager** — Connect auto-parser to Streamlit UI
- [x] **Discovery Interactive Table** — Connect selection to `database.py`
- [x] **Deep Scrape trigger** — Connect `blog_scraper` over selected curated items

---

## Phase 3.7 — Manual Content Studio ✅ COMPLETE
> Goal: Provide a side-by-side UI to manually copywrite visual carousels using raw scraped reference data.

### Streamlit `app.py` updates
- [x] Add `✍️ Content Studio` Split-Screen Tab 
- [x] Implement Left Column: Interactive Raw Intelligence Inspector
- [x] Implement Right Column: Dynamic Form Engine based on `template.json` logic
- [x] Implement DB save utilizing `src.database.save_post()`

---

## Phase 3.8 — Content Studio V2 ✅ COMPLETE
> Goal: Enhance Content Studio with editable raw states, relaxed naming conventions, and real-time previews.

- [x] Fix strict alphanumeric post name convention
- [x] Add editable feature to raw intelligence viewer
- [x] Add Preview Visuals functionality using `_run_generator`

---

## Phase 4 — Publisher & Scheduler
> Goal: Post approved content to platforms at scheduled times. Manual approval required.

### `publisher/scheduler.py`
- [ ] Switch from `schedule` to `APScheduler`
- [ ] `add_to_queue(post_id, platform, datetime)`
- [ ] `run_queue()` — background process dispatching at scheduled times
- [ ] `list_queue()` — show pending posts
- [ ] On success: update status → `published`, move to `data/archive/`

### `publisher/linkedin_publisher.py`
- [ ] LinkedIn REST API v2 auth (OAuth2)
- [ ] `upload_pdf(pdf_path)` — LinkedIn document upload
- [ ] `create_post(text, document_urn)` — publish carousel post
- [ ] `publish(post_id)` — end-to-end wrapper

### `publisher/instagram_publisher.py`
- [ ] Meta Graph API auth
- [ ] `publish_feed(post_id)` — upload 1:1 images as carousel post
- [ ] `publish_story(post_id)` — upload 9:16 image as story

### `publisher/tiktok_publisher.py`
- [ ] TikTok for Developers API auth
- [ ] `publish_slideshow(post_id)` — upload image slideshow

---

## Phase 5 — AI Agent
> Goal: Autonomous pipeline. Research → Write → Generate → Schedule. Minimal human input.

### `agent/content_writer.py`
- [ ] LLM integration (OpenAI / Claude / Gemini)
- [ ] `generate_from_topic(topic, niche)` → structured slide JSON
- [ ] Prompt templates per content type (carousel, story, etc.)

### `agent/researcher.py`
- [ ] `summarize_raw(raw_id)` → structured research notes in `data/research/`
- [ ] `create_content_plan(research_id)` → draft JSON in `data/content/`

### `agent/orchestrator.py`
- [ ] `run_pipeline(niche, platform)` — full end-to-end automated run
- [ ] Human-in-the-loop: pause at `approved` step
- [ ] Logging & status reporting

---

## Bugs & Tech Debt
- [ ] `scheduler.py` runs every 10 seconds — replace with real time-based scheduling
- [ ] `generator.py` replaces all slides at once with same data — fix for multi-slide different content
- [ ] `content_manager.py` has no status tracking — upgrade schema
- [ ] No `.gitignore` entry for `.env` and `config/credentials/`

---

## Notes for Future Agents
- BRD is in `docs/BRD.md` — read this first before making any structural changes
- All modules are **independent** — each can be built without the others being complete
- Data schemas are in BRD Section 7 — follow them strictly for consistency
- Current working code: `src/generator.py`, `src/create_template.py`
- Current template: `templates/main_carousel.pptx` (1:1, dark, LinkedIn)
- Do NOT auto-publish — always require `status: approved` before posting
