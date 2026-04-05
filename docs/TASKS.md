# 📝 TASKS — Baba-App Development Roadmap
**Last updated:** 2026-04-05 · **Version:** 2.2

Quick legend: ✅ Done · 🔜 Next · ⏳ In Progress · ❌ Not Started

---

## ✅ Phase 1 — Scraping Engine
- [x] Complete (RSS, URL, Trends, Portal Discovery)

---

## ✅ Phase 2 — Database Layer
- [x] `src/database.py` — SQLite helpers
- [x] Added `caption` column for AI-generated posts

---

## ✅ Phase 3 — Visual Generator
- [x] Core Generate Engine
- [x] Fixed `output/images` path structure and API serving
- [x] Fixed LinkedIn generator to produce PNGs

---

## ⏳ Phase 9 — AI Agent (Brain)
- [ ] `agent/generator.py` — LLM drafting logic
- [ ] Prompt engineering for Carousel Slides + Social Caption
- [ ] `POST /api/agent/draft` endpoint
- [ ] "✨ AI Draft" button in Content Studio

---

## 🔜 Phase 10 — Desktop Automation (Hand)
- [ ] `scripts/desktop_publisher.py` — Playwright headless/non-headless bridge
- [ ] Automated file upload (LinkedIn/Insta/TikTok)
- [ ] Automated caption pasting
- [ ] Post status workflow (Ready → Publishing → Published)

---

## 🔜 Phase 6–7–8 — APIs & Scheduling
- [ ] LinkedIn API
- [ ] Instagram / TikTok API
- [ ] APScheduler Integration

---

## 🐛 Known Issues & Tech Debt
- [x] ~~Visual Generator gallery doesn't show images~~ (Fixed)
- [x] ~~LinkedIn generator only makes PDF~~ (Fixed)
- [ ] Bundle size optimization
- [ ] No authentication (Local only)
