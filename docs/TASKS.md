# 📝 TASKS — Baba-App Development Roadmap
**Last updated:** 2026-04-07 · **Version:** 4.0 (Autonomous Orchestrator)

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

### ✅ Phase 10: Desktop Publisher Assistant [DONE]
- [x] Reveal in Finder bridge (Direct local file access on Mac).
- [x] Smart PPTX Discovery (Multi-style dynamic onboarding).
- [x] LinkedIn PDF Carousel download/view integration.
- [x] Manual Posting Mission Control UI.

### ✅ Phase 11: Template Expansion [DONE]
- [x] **13+ Premium Templates**: All styles (Minimal, Myth, Chart, Playbook, Cyberpunk) are live.
- [x] **AI Alignment**: Every template in the library is 100% "Magic Draft" compatible.

---

## ✅ Phase 12 — GenAI SDK Migration [DONE]
- [x] **New SDK**: Transitioned to the `google-genai` SDK for low-latency synthesis.
- [x] **Agentic Reasoning**: Implemented **Manual Tool Execution Loop** (Multi-turn conversation) for "Pro Mode".
- [x] **Resilience**: Integrated **Exponential Backoff** retry mechanism for 503/Service Busy errors.

## ✅ Phase 13 — Autonomous Design Orchestration [DONE]
- [x] **AI-Generated Templates**: AI creates custom slide schemas based on content intent.
- [x] **Template Registry Integration**: AI designs are auto-saved to `templates/` and available for reuse in "Template Studio".
- [x] **Adaptive Schema Discovery**: Tools for the AI to "inspect" and "explore" the registry before designing.

---

### Phase 14: Automated Publishing Bridge [IN PROGRESS]
- [x] Reveal in Finder bridge (Direct local file access on Mac).
- [ ] Playwright automation for LinkedIn Document posts.
- [ ] Implement Playwright automation for Instagram/TikTok.
