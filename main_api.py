"""
main_api.py
─────────────────────────────────────────────────────────────────────────────
Baba-App FastAPI Backend — Central entry point for all REST endpoints.

Architecture rule (for agents):
  - This file registers ROUTERS only. All business logic lives in api/routers/.
  - To add a new feature: create a new file in api/routers/, define an
    APIRouter, then include it here with include_router().

Run: uvicorn main_api:app --reload
Docs: http://localhost:8000/docs
─────────────────────────────────────────────────────────────────────────────
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# ── Router imports ─────────────────────────────────────────────────────────────
from api.routers import data, scraper, generator, agent

app = FastAPI(
    title="Baba-App API",
    version="2.0.0",
    description="Content Automation Platform — AI Engineering & Data Science",
)

# ── CORS — allow local development access ──────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount routers ──────────────────────────────────────────────────────────────
# Agent instruction: Add new routers here. Pattern: include_router(module.router, prefix="/api/module")
app.include_router(data.router,      prefix="/api/data",      tags=["Data"])
app.include_router(scraper.router,   prefix="/api/scrape",    tags=["Scraper"])
app.include_router(generator.router, prefix="/api/generator", tags=["Generator"])
app.include_router(agent.router,     prefix="/api/agent",     tags=["Agent"])

@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "app": "Baba-App API", "version": "2.0.0"}


if __name__ == "__main__":
    uvicorn.run("main_api:app", host="0.0.0.0", port=8000, reload=True)
