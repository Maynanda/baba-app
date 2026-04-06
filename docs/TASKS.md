# 📝 TASKS — Baba-App Development Roadmap
**Last updated:** 2026-04-06 · **Version:** 3.0 (Autonomous Engine)

Quick legend: ✅ Done · 🔜 Next · ⏳ In Progress · ❌ Not Started

---

## ✅ Phase 8 — Scheduler & Automation [DONE]
- [x] **Autonomous Digester**: APScheduler in `main_api.py` for RSS/Portal auto-fetching.
- [x] **Dynamic Controls**: REAL-TIME Start/Stop and Frequency (1h-24h) from the UI.
- [x] **Persistent Config**: `scheduler_settings.json` saves automation states between resets.

## ✅ Phase 9 — AI Synthesis & Magic Draft [DONE]
- [x] **Gemini 1.5 Flash Integration**: Ultra-fast LLM-powered drafting in Content Studio.
- [x] **AI Brief Architecture**: Every template has a "Persona" for perfect styling missions.
- [x] **Visual Intelligence**: AI curates and selects source images for every slide. 
- [x] **Interactive Visual Picker**: One-click mapping from research to slide form.
- [x] **7-Day Freshness Filter**: Automatically skips stale 2024 content in RSS.

---

### Phase 10: Desktop Publisher Assistant [IN PROGRESS]
- [x] Reveal in Finder bridge (Direct local file access on Mac).
- [x] Smart PPTX Discovery (Multi-style dynamic onboarding).
- [x] LinkedIn PDF Carousel download/view integration.
- [x] Manual Posting Mission Control UI.
- [/] Playwright automation for LinkedIn Document posts.
- [ ] Implement Playwright automation for Instagram/TikTok.

### ✅ Phase 11: Template Expansion [DONE]
- [x] **13+ Premium Templates**: All styles (Minimal, Myth, Chart, Playbook, Cyberpunk) are live.
- [x] **AI Alignment**: Every template in the library is 100% "Magic Draft" compatible.

### 🔜 Phase 12: GenAI SDK Migration [NEXT]
- [ ] Transition from `google-generativeai` to the new `google-genai` SDK.
- [ ] Hardening retry logic and safety block handling.

### 🔜 Phase 13: Autonomous Design Orchestration [NEXT]
- [ ] **AI-Generated Templates**: AI creates custom slide schemas based on content intent.
- [ ] **Template Registration Factory**: Auto-save AI designs to `templates/` registry.
- [ ] **Adaptive Placeholders**: AI-suggested custom fields for unique research topics.
