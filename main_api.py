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

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from contextlib import asynccontextmanager
from datetime import datetime
from src.scheduler_manager import init_scheduler, stop_scheduler, scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup scheduler on start
    init_scheduler()
    yield
    # Shutdown on stop
    stop_scheduler()

# ── Router imports ─────────────────────────────────────────────────────────────
from api.routers import data, scraper, generator, agent, publisher, sources, chat

app = FastAPI(
    title="Baba-App API",
    version="2.2.0",
    description="Content Automation Platform — AI Engineering & Data Science",
    lifespan=lifespan
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
app.include_router(publisher.router, prefix="/api/publisher", tags=["Publisher"])
app.include_router(sources.router,   prefix="/api/sources",   tags=["Sources"])
app.include_router(chat.router,      prefix="/api/chat",      tags=["Chat"])

@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "app": "Baba-App API", "version": "2.2.0"}

from src.scheduler_manager import scheduler, update_job_setting, load_settings

class SchedulerUpdate(BaseModel):
    job_id: str
    enabled: bool
    frequency_hours: int

@app.get("/api/scheduler/settings", tags=["Scheduler"])
def get_scheduler_settings():
    return load_settings()

@app.post("/api/scheduler/settings", tags=["Scheduler"])
def update_scheduler_settings(body: SchedulerUpdate):
    success = update_job_setting(body.job_id, body.enabled, body.frequency_hours)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"status": "Job configuration updated", "config": body}

@app.get("/api/scheduler/jobs", tags=["Scheduler"])
def get_scheduled_jobs():
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "next_run_time": str(job.next_run_time),
            "trigger": str(job.trigger)
        })
    return jobs

@app.post("/api/scheduler/trigger/{job_id}", tags=["Scheduler"])
def trigger_job(job_id: str):
    job = scheduler.get_job(job_id)
    if not job:
        return {"error": "Job not found"}
    # Force run now by updating next_run_time to now
    job.modify(next_run_time=datetime.now())
    return {"status": "Job triggered successfully", "job": job_id}


if __name__ == "__main__":
    uvicorn.run("main_api:app", host="0.0.0.0", port=8000, reload=True)
