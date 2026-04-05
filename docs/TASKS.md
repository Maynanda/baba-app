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

### Phase 9: AI Content Agent [DONE]
- [x] Create AI Drafting engine using Google Gemini.
- [x] Implement `/api/agent/draft` endpoint.
- [x] Add "Magic AI Draft" button to Content Studio.
- [x] Support automatic social caption generation.

### Phase 10: Desktop Publisher Assistant [BETA]
- [x] Create Publisher Assistant UI matching the premium theme.
- [x] Implement `/api/publisher/push` background worker.
- [/] Implement Playwright automation for LinkedIn Document posts.
- [ ] Implement Playwright automation for Instagram Feed/Reels.
- [ ] Implement Playwright automation for TikTok.
- [ ] Add persistent `.chrome_profile` for session management.

### Phase 11: Template Expansion (Visual Library) [PLANNED]
- [ ] **Research:** Identify high-engagement typography (Inter, Outfit, Roboto) for AI niche.
- [ ] **Design:** Create `T-LIGHT-01` (Minimalist White, 1 Image/Slide).
- [ ] **Design:** Create `T-PLAYBOOK-01` (5-step process layout with progress bars).
- [ ] **Design:** Create `T-COMPARE-01` (Split-screen Comparison: Old vs. AI way).
- [ ] **Refine:** Update `registry.json` to categorize templates by "Style" (Dark, Light, Retro).

### Phase 6-8: Direct API Publisher (Future)
- [ ] LinkedIn API v2 (Direct Post)
- [ ] Instagram Graph API
- [ ] TikTok Content Posting API
- [ ] YouTube Shorts API (Researching)
- [ ] APScheduler for automated posting windows (e.g., 9AM Tuesday).

---

## 🐛 Known Issues & Tech Debt
- [x] ~~Visual Generator gallery doesn't show images~~ (Fixed)
- [x] ~~LinkedIn generator only makes PDF~~ (Fixed)
- [ ] Bundle size optimization
- [ ] No authentication (Local only)
