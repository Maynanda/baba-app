# 📝 TASKS — Baba-App Development Roadmap
**Last updated:** 2026-04-06 · **Version:** 3.0 (Autonomous Engine)

Quick legend: ✅ Done · 🔜 Next · ⏳ In Progress · ❌ Not Started

---

## ✅ Phase 8 — Scheduler & Automation [DONE]
- [x] **Autonomous Digester**: APScheduler in `main_api.py` for RSS/Portal auto-fetching.
- [x] **Dynamic Controls**: REAL-TIME Start/Stop and Frequency (1h-24h) from the UI.
- [x] **Persistent Config**: `scheduler_settings.json` saves automation states between resets.

## ✅ Phase 9 — AI Synthesis & Magic Draft [DONE]
- [x] **Gemini Integration**: High-performance LLM-powered drafting in Content Studio.
- [x] **Multi-Source Synthesis**: Select multiple research articles → AI merges insights into one post.
- [x] **Form Auto-Fill**: AI fills all slides (Hook, Body, CTA) and Caption instantly.
- [x] **Visual Hero Template**: Added `T-VISUAL-01` (9:16 mobile-first visual style).

---

### Phase 10: Desktop Publisher Assistant [IN PROGRESS]
- [x] Reveal in Finder bridge (Direct local file access on Mac).
- [x] Smart PPTX Discovery (Multi-style dynamic onboarding).
- [x] LinkedIn PDF Carousel download/view integration.
- [x] Manual Posting Mission Control UI.
- [/] Playwright automation for LinkedIn Document posts.
- [ ] Implement Playwright automation for Instagram/TikTok.

### Phase 11: Template Expansion (Visual Library) [IN PROGRESS]
- [x] Create `T-VISUAL-01` (Visual Hero, 9:16 Tiktok/Reels style).
- [ ] Create `T-LIGHT-01` (Minimalist White).
- [ ] Create `T-PLAYBOOK-01` (5-step process layout).
- [ ] Create `T-COMPARE-01` (Split-screen Comparison).
- [x] ~~Visual Generator gallery doesn't show images~~ (Fixed - CORS + API Mapping)
- [x] ~~LinkedIn generator only makes PDF~~ (Fixed - PNG Export Active)
- [x] ~~Post saving fails with 500 error~~ (Fixed - Schema Migrated)
- [x] ~~Double-stringified JSON data~~ (Fixed via `safeParseJson`)
- [ ] Bundle size optimization
- [ ] No authentication (Local only)
