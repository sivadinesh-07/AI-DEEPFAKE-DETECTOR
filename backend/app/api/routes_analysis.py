"""
FastAPI Analysis Routes: Upload, Status, Result, Timeline, Heatmaps.
"""

import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from backend.app.database.database import get_db
from backend.app.database.models import AnalysisRecord
from backend.app.services.job_queue import ForensicJobQueue

router = APIRouter(prefix="/api/v1/analysis", tags=["Analysis"])

from backend.app.utils.paths import UPLOADS_DIR
UPLOAD_DIR = str(UPLOADS_DIR)
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024  # 250 MB

@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported format '{ext}'. Supported: {ALLOWED_EXTENSIONS}")

    # Generate Analysis ID
    short_uuid = uuid.uuid4().hex[:6].upper()
    analysis_id = f"ANL-2026-{short_uuid}"

    # Save to uploads folder
    safe_filename = f"{analysis_id}_{os.path.basename(file.filename)}"
    dest_path = os.path.join(UPLOAD_DIR, safe_filename)

    file_size = 0
    with open(dest_path, "wb") as buffer:
        while content := await file.read(1024 * 1024):  # 1MB chunks
            file_size += len(content)
            if file_size > MAX_FILE_SIZE_BYTES:
                buffer.close()
                os.remove(dest_path)
                raise HTTPException(status_code=413, detail="File too large. Maximum allowed size is 250MB.")
            buffer.write(content)

    # Create DB Record
    record = AnalysisRecord(
        id=analysis_id,
        filename=file.filename,
        file_path=dest_path,
        file_size_bytes=file_size,
        status="queued",
        stage="uploading",
        progress=0
    )
    db.add(record)
    db.commit()

    # Enqueue background job
    job_queue = ForensicJobQueue()
    job_queue.enqueue_analysis(analysis_id, dest_path, file.filename)

    return {
        "analysis_id": analysis_id,
        "status": "queued",
        "filename": file.filename,
        "file_size": file_size,
        "message": "Video uploaded successfully. Analysis job enqueued."
    }

@router.get("/{analysis_id}")
async def get_analysis_status(analysis_id: str, db: Session = Depends(get_db)):
    record = db.query(AnalysisRecord).filter(AnalysisRecord.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    return {
        "analysis_id": record.id,
        "status": record.status,
        "stage": record.stage,
        "progress": record.progress,
        "error_message": record.error_message,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "completed_at": record.completed_at.isoformat() if record.completed_at else None
    }

@router.get("/{analysis_id}/result")
async def get_analysis_result(analysis_id: str, db: Session = Depends(get_db)):
    record = db.query(AnalysisRecord).filter(AnalysisRecord.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    if record.status != "completed":
        return {
            "analysis_id": record.id,
            "status": record.status,
            "stage": record.stage,
            "progress": record.progress,
            "message": "Analysis is still processing. Please check status endpoint."
        }

    return {
        "analysis_id": record.id,
        "status": record.status,
        "filename": record.filename,
        "prediction": record.prediction,
        "confidence": record.confidence,
        "processing_time": record.processing_time,
        "metadata": {
            "resolution": record.resolution,
            "duration": record.duration_seconds,
            "fps": record.fps
        },
        "spatial": {
            "score": record.spatial_score
        },
        "temporal": {
            "score": record.temporal_score
        },
        "audio": {
            "score": record.audio_score
        },
        "sync": {
            "score": record.sync_score,
            "status": record.sync_status
        },
        "facial_behavior": {
            "blink": record.blink_anomaly,
            "gaze": record.gaze_anomaly,
            "lip": record.lip_anomaly,
            "mean_ear": record.mean_ear,
            "mean_mar": record.mean_mar
        },
        "timeline": record.timeline_json or [],
        "heatmaps": record.heatmaps_json or [],
        "all_frames": record.frames_json or [],
        "suspicious_frames": (
            [f for f in (record.frames_json or []) if f.get("is_suspicious")]
            if record.prediction == "REAL"
            else ([f for f in (record.frames_json or []) if f.get("is_suspicious")] or (record.frames_json or [])[:3])
        ),
        "report_url": f"/api/v1/analysis/{record.id}/report"
    }

@router.get("/{analysis_id}/timeline")
async def get_analysis_timeline(analysis_id: str, db: Session = Depends(get_db)):
    record = db.query(AnalysisRecord).filter(AnalysisRecord.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return record.timeline_json or []

@router.get("/{analysis_id}/heatmaps")
async def get_analysis_heatmaps(analysis_id: str, db: Session = Depends(get_db)):
    record = db.query(AnalysisRecord).filter(AnalysisRecord.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return record.heatmaps_json or []

@router.post("/{analysis_id}/retry")
async def retry_analysis(analysis_id: str, db: Session = Depends(get_db)):
    record = db.query(AnalysisRecord).filter(AnalysisRecord.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    if not record.file_path or not os.path.exists(record.file_path):
        raise HTTPException(status_code=400, detail="Source video file no longer exists on disk.")

    record.status = "queued"
    record.stage = "queued"
    record.progress = 0
    record.error_message = None
    db.commit()

    job_queue = ForensicJobQueue()
    job_queue.enqueue_analysis(record.id, record.file_path, record.filename)

    return {"message": f"Analysis {analysis_id} re-enqueued for processing.", "status": "queued"}
