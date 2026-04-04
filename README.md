# 🚀 Baba-App

**Baba-App** is a local, Python-based content automation platform. It is designed to automate the full content lifecycle for a personal brand in the **AI Engineering & Data Science** niche. 

Instead of manually writing and designing posts for every platform, Baba-App acts as a localized Content Management Platform (CMP). It automatically scrapes trending topics, manages your backlog of content plans, renders beautiful platform-ready visuals from PPTX templates, and (soon) schedules them natively to LinkedIn, TikTok, and Instagram.

---

## ✨ Features

- **Streamlit Dashboard**: A beautiful local web interface to visually manage your entire content pipeline, replacing the need to use the terminal.
- **SQLite Database Architecture**: Manage content states from `raw` (scraped) → `draft` → `approved` → `published` entirely through a fast, local SQLite database instead of messy folders of JSON files.
- **Auto-Parser Curation Engine**: Give Baba-App *any* news portal URL, and it will mathematically deduce the CSS rules needed to extract articles from it, letting you deep-scrape headlines in bulk.
- **Scrapling Framework Integration**: Fetches articles reliably by combining general-purpose web scraping resilience with Scrapling's `Fetcher` and Adaptor classes, avoiding basic bot protections automatically!
- **Manual Content Studio**: A split-screen writing space. Read scraped reference material on the left while seamlessly filling out your visual template form on the right.
- **Dynamic Template Engine**: Render high-quality images and PDF carousels using simple `.pptx` templates. It supports both square (1:1) and vertical (9:16) aspect ratios.
- **Multi-Platform Visual Generation**: Generate assets optimized for all major platforms simultaneously:
  - LinkedIn (PDF Carousel)
  - Instagram Feed (1:1 PNGs)
  - Instagram Story (9:16 PNGs)
  - TikTok (9:16 PNG Slideshows)
- **Modular Pipeline**: Cleanly separates Scraping, Generators, Publishers, and the upcoming AI AI orchestrator.

---

## 🛠️ Usage Guide

Getting started is easy. Everything can now be controlled via the visual **Streamlit Dashboard**!

Make sure your virtual environment is active first, then start the server:
```bash
source venv/bin/activate
streamlit run app.py
```
This will open `http://localhost:8501` in your browser.

The Dashboard features 4 primary tabs:
1. **🧭 Portal Discovery**: Add news URLs, generate custom auto-parsers, and bulk deep-scrape entire portals.
2. **📡 Scraper Console**: One-off scraping for single URLs, Reddit Trends, Google Trends, and RSS feeds.
3. **🗃️ Content Database**: Your SQLite database viewer. Check what raw intelligence you've gathered and update the status of your post drafts.
4. **✍️ Content Studio**: Split-screen manual writing interface. Copy-paste from raw intel into your visual templates!
5. **🎨 Visual Generator**: Click a button to compile your approved templates into high-res PNGs and LinkedIn PDFs.

*(Note: You can still use the underlying `main.py` CLI for automation down the line)*

### 1. Trend Gathering (Scraping)
Find interesting content to write about. Scraped items are dumped into `data/raw/` as JSON files.

```bash
# Scrape articles from all RSS feeds defined in config/feeds.yaml
python main.py scrape rss

# Find trending topics on Reddit
python main.py scrape trends --source reddit --subreddit MachineLearning

# Scrape a specific blog post
python main.py scrape url --url https://some-ai-blog.com/post
```

### 2. Content Planning
When you're ready to create a post, generate a new draft plan in `data/content/`.

```bash
# Create a new draft post
python main.py content create my-new-post --platform linkedin,instagram_feed

# Check what content you currently have and what the status is
python main.py content list
```
**Important:** Open the new JSON file in `data/content/`, write your actual slide text in the `"slides"` array, and change `"status": "draft"` to `"status": "approved"`. **Assets will not generate unless the status is approved!**

### 3. Visual Generation
Once a content JSON file is marked `approved`, generate the final visual assets. They will be placed in the `output/` directory categorized by platform.

```bash
# See what UI templates are currently installed
python main.py templates list

# Generate visuals for all platforms defined in the JSON file
python main.py generate --post my-new-post --all-platforms

# Generate visual ONLY for LinkedIn
python main.py generate --post my-new-post --platform linkedin
```

### 4. Publishing & Scheduling (Coming Soon - Phase 4)
*Publishing tools are currently being built! Soon you will be able to schedule via:*
```bash
python main.py schedule --post my-new-post --time "2026-04-05 09:00"
```

---

## 📁 System Architecture

```text
baba-app/
├── scraper/          ← Trend pulling engines powered by Scrapling (Reddit, Google, RSS, URL)
├── src/generator/    ← Visual renderers (LinkedIn, Instagram, TikTok)
├── config/           ← Settings & configuration
├── templates/        ← Presentation layouts (PPTX) and registry
├── data/             ← Content database (raw/ vs content/)
├── output/           ← Generated PDF and PNG files ready for posting
├── publisher/        ← API Integrations [In Progress]
└── agent/            ← AI Automation [In Progress]
```

## ⚙️ Setup & Installation
1. Ensure LibreOffice is installed on your Mac (required for headless PPTX to PDF conversion).
2. Install Python dependencies:
```bash
pip install -r requirements.txt
```
3. Copy `.env.example` to `.env` and fill in any required API keys.
