"""
Centralized Path Management for Media Forensics Backend.
Dynamically resolves paths relative to the repository root.
"""

import os
from pathlib import Path

# Repository Root (d:/Temporal-Spectral or current project directory)
PROJECT_ROOT = Path(__file__).resolve().parents[3]

# Core Directories
CHECKPOINTS_DIR = PROJECT_ROOT / "checkpoints"
DATA_DIR = PROJECT_ROOT / "data"
REPORTS_DIR = PROJECT_ROOT / "reports"
BACKEND_DIR = PROJECT_ROOT / "backend"
UPLOADS_DIR = BACKEND_DIR / "uploads"
RESULTS_DIR = BACKEND_DIR / "results"
HEATMAPS_DIR = RESULTS_DIR / "heatmaps"
FRAMES_DIR = RESULTS_DIR / "frames"

# Database Path
DB_PATH = DATA_DIR / "forensics.db"

# Model Checkpoints
FACE_LANDMARKER_MODEL_PATH = CHECKPOINTS_DIR / "face_landmarker.task"
SPATIAL_MODEL_WEIGHTS = CHECKPOINTS_DIR / "spatial_spectral_best.pt"
TEMPORAL_MODEL_WEIGHTS = CHECKPOINTS_DIR / "temporal_bilstm_best.pt"
AV_SYNC_MODEL_WEIGHTS = CHECKPOINTS_DIR / "av_sync_best.pt"
FUSION_MODEL_WEIGHTS = CHECKPOINTS_DIR / "multimodal_fusion_best.pt"

# Ensure runtime directories exist
def ensure_directories():
    for d in [DATA_DIR, REPORTS_DIR, UPLOADS_DIR, RESULTS_DIR, HEATMAPS_DIR, FRAMES_DIR, CHECKPOINTS_DIR]:
        os.makedirs(str(d), exist_ok=True)

ensure_directories()
