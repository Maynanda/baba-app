# 🎨 Baba-App: Template Library & Design System

This directory contains the library of platform-ready PowerPoint (`.pptx`) templates and their corresponding logic schemas (`.json`). The system uses these to render structured JSON content into high-fidelity visuals.

---

## 🚀 High-Engagement Templates (2025 AI Engineering Research)

Based on recent research into LinkedIn and Instagram performance in the **AI Engineering / Data Science** niche, the following template types drive the highest saves and shares.

### 1. The "Minimalist Deep Dive" (NEW)
- **Style:** Light background, high-contrast bold typography.
- **Structure:** 1 Core Idea per slide. 
- **Visuals:** 1 high-quality technical image or diagram per slide.
- **Engagement Trigger:** High readability on mobile, looks extremely "premium" and clean.

### 2. The "Technical Playbook" (How-To)
- **Style:** Step-by-step progress bar at the top or bottom.
- **Structure:** 5-7 slides showing a workflow (e.g., "Fine-tuning in 5 steps").
- **Visuals:** Code snippets or architectural block diagrams.
- **Engagement Trigger:** Actionable and replicable value.

### 3. "Myth vs. Reality" (Comparison)
- **Style:** Split-screen layout or alternating color slides (Red vs Green).
- **Structure:** Direct comparison of old/wrong ways vs. new AI-driven ways.
- **Visuals:** Side-by-side tables or icons.
- **Engagement Trigger:** Authority and "thought leader" positioning.

### 4. The "Data Digest" (Cheat Sheet)
- **Style:** Grid-based layouts or large centralized metrics.
- **Structure:** Summarizing dense research (e.g., "DeepSeek-V3 vs Llama-3 Benchmarks").
- **Visuals:** Graphs, bar charts, and benchmark tables.
- **Engagement Trigger:** Extremely high "Save" rate for future reference.

---

## 🛠️ Implementation Plan for "Light" Templates

We are adding a new category of templates specifically for simplified, aesthetic-first content:

- [ ] **T-LIGHT-01**: "The Minimalist" (Pure white background, Jet black Inter/Outfit font, large image placeholder).
- [ ] **T-LIGHT-02**: "The Soft Sky" (Gentle blue/gray gradients, tech-minimalist icons).
- [ ] **T-LIGHT-03**: "The Modern Grid" (Dotted grid background, blueprint-style aesthetic).

---

## 📐 Template Schema Structure

Each template folder must contain:
1. `template.pptx`: The master PowerPoint file with named placeholders.
2. `template.json`: Defines the mapping, colors, and layout rules.

```json
{
  "id": "T-LIGHT-01",
  "name": "The Minimalist",
  "aspect_ratio": "4:5",
  "style": "light",
  "placeholders": ["HOOK_TITLE", "BODY_TITLE", "BODY_IMAGE"]
}
```
