"""
FastAPI Main Application Entrypoint for Neural Facial Media Forensics.
"""

import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Ensure repository root is on sys.path regardless of execution directory
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.utils.paths import RESULTS_DIR, UPLOADS_DIR, ensure_directories
from backend.app.database.database import init_db
from backend.app.api.routes_analysis import router as analysis_router
from backend.app.api.routes_reports import router as reports_router
from backend.app.api.routes_history import router as history_router
from backend.app.services.job_queue import ForensicJobQueue

# Ensure required runtime folders exist
ensure_directories()

# Ensure DB tables exist
init_db()

# Lifespan context manager for startup model caching & orphaned job recovery
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite Database tables
    init_db()
    print("[Startup] Database initialized.")
    # Preload inference pipeline
    jq = ForensicJobQueue()
    print("[Startup] Preloading ML pipeline into memory...")
    jq.get_pipeline()
    print("[Startup] Forensic Pipeline loaded and ready for inference!")
    # Recover any jobs left pending or interrupted from a previous session
    jq.recover_orphaned_jobs()
    yield
    print("[Shutdown] Media Forensics server shutting down.")

app = FastAPI(
    title="Neural Facial Media Forensics API",
    description="Multimodal Deepfake Detection and Synthetic Media Verification Backend",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static file directories for Grad-CAM heatmaps, extracted frames, and video files
app.mount("/results", StaticFiles(directory=str(RESULTS_DIR)), name="results")
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Include Routers
app.include_router(analysis_router)
app.include_router(reports_router)
app.include_router(history_router)

@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "online",
        "service": "Neural Facial Media Forensics Backend",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    # Default to reload=False for ML stability.
    # If reload is desired, only reload on backend/app code changes to avoid triggering on uploads/results.
    uvicorn.run(
        "backend.app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=False
    )
