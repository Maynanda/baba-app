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

### Phase 15: Ultimate Content Studio Overhaul [DONE]
- [x] Refactor UI to 4-panel resizable workspace (Navigation, Inspector, Editor, Preview).
- [x] Support manual drag-to-resize for all panels using Flexbox.
- [x] Implement persistent collapsing for sidebars.
- [x] Flatten `data_json` save payload for reliable database mapping.
- [x] Fix 500 Error during save (added `caption` column if missing).

### Phase 10: Desktop Publisher Assistant [IN PROGRESS]
- [x] Reveal in Finder bridge (Direct local file access on Mac).
- [x] Smart PPTX Discovery (Multi-style dynamic onboarding).
- [x] LinkedIn PDF Carousel download/view integration.
- [x] Manual Posting Mission Control UI.
- [/] Playwright automation for LinkedIn Document posts.
- [ ] Implement Playwright automation for Instagram/TikTok.

### Phase 8: Scheduler & Automation (Next UP)
- [ ] Implement APScheduler in `main_api.py`.
- [ ] Create UI for viewing/canceling scheduled jobs.
- [ ] Support "Time to Post" windows (e.g. 9:00 AM local).

### Phase 11: Template Expansion (Visual Library) [PLANNED]
- [ ] Create `T-LIGHT-01` (Minimalist White, 1 Image/Slide).
- [ ] Create `T-PLAYBOOK-01` (5-step process layout with progress bars).
- [ ] Create `T-COMPARE-01` (Split-screen Comparison: Old vs. AI way).

---

## 🐛 Known Issues & Tech Debt
- [x] ~~Visual Generator gallery doesn't show images~~ (Fixed - CORS + API Mapping)
- [x] ~~LinkedIn generator only makes PDF~~ (Fixed - PNG Export Active)
- [x] ~~Post saving fails with 500 error~~ (Fixed - Schema Migrated)
- [x] ~~Double-stringified JSON data~~ (Fixed via `safeParseJson`)
- [ ] Bundle size optimization
- [ ] No authentication (Local only)
