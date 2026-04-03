# 🚀 Baba-App

**Baba-App** is a local, Python-based content automation platform. It is designed to automate the full content lifecycle for a personal brand in the **AI Engineering & Data Science** niche. 

Instead of manually writing and designing posts for every platform, Baba-App acts as a localized Content Management Platform (CMP). It automatically scrapes trending topics, manages your backlog of content plans, renders beautiful platform-ready visuals from PPTX templates, and (soon) schedules them natively to LinkedIn, TikTok, and Instagram.

---

## ✨ Features

- **Trend Research Pipeline**: Automatically scrape RSS feeds, Google Trends, Reddit, and specific blogs to find what people are talking about.
- **Unified CLI Interface**: Manage the entire pipeline using a single command-line tool `python main.py`.
- **Database Architecture**: Manage content states from `raw` (scraped) → `draft` → `approved` → `published` entirely through localized JSON files, rather than messy spreadsheets.
- **Dynamic Template Engine**: Render high-quality images and PDF carousels using simple `.pptx` templates. It supports both square (1:1) and vertical (9:16) aspect ratios.
- **Multi-Platform Visual Generation**: Generate assets optimized for all major platforms simultaneously:
  - LinkedIn (PDF Carousel)
  - Instagram Feed (1:1 PNGs)
  - Instagram Story (9:16 PNGs)
  - TikTok (9:16 PNG Slideshows)
- **Modular Pipeline**: Cleanly separates Scraping, Generators, Publishers, and the upcoming AI AI orchestrator.

---

## 🛠️ Usage Guide

Everything is controlled via the `main.py` CLI. 

Make sure your virtual environment is active first:
```bash
source venv/bin/activate
```

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
├── scraper/          ← Trend pulling engines (Reddit, Google, RSS, URL)
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
