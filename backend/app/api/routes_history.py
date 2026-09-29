"""
FastAPI Routes for Analysis History and KPI Statistics.
"""

import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database.database import get_db
from backend.app.database.models import AnalysisRecord
from backend.app.utils.paths import FRAMES_DIR, HEATMAPS_DIR

router = APIRouter(prefix="/api/v1/history", tags=["History"])

@router.get("")
async def get_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    total = db.query(func.count(AnalysisRecord.id)).scalar() or 0
    records = db.query(AnalysisRecord).order_by(AnalysisRecord.created_at.desc()).offset(skip).limit(limit).all()

    # KPI Statistics
    total_real = db.query(AnalysisRecord).filter(AnalysisRecord.prediction == "REAL").count()
    total_fake = db.query(AnalysisRecord).filter(AnalysisRecord.prediction == "FAKE").count()
    
    avg_conf = db.query(func.avg(AnalysisRecord.confidence)).filter(AnalysisRecord.status == "completed").scalar()
    avg_conf_val = round(float(avg_conf), 3) if avg_conf else 0.0

    items = []
    for r in records:
        items.append({
            "id": r.id,
            "filename": r.filename,
            "status": r.status,
            "prediction": r.prediction,
            "confidence": r.confidence,
            "processing_time": r.processing_time,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "report_url": f"/api/v1/analysis/{r.id}/report" if r.status == "completed" else None
        })

    return {
        "total": total,
        "kpis": {
            "total_analyses": total,
            "total_real": total_real,
            "total_fake": total_fake,
            "avg_confidence": avg_conf_val
        },
        "items": items
    }

@router.delete("/{analysis_id}")
async def delete_analysis(analysis_id: str, db: Session = Depends(get_db)):
    record = db.query(AnalysisRecord).filter(AnalysisRecord.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis record not found.")

    # Remove uploaded video if present
    if record.file_path and os.path.exists(record.file_path):
        try:
            os.remove(record.file_path)
        except Exception:
            pass

    # Remove PDF report if present
    if record.report_pdf_path and os.path.exists(record.report_pdf_path):
        try:
            os.remove(record.report_pdf_path)
        except Exception:
            pass

    # Remove analysis frame directory
    analysis_frames = FRAMES_DIR / record.id
    if analysis_frames.exists():
        try:
            shutil.rmtree(str(analysis_frames), ignore_errors=True)
        except Exception:
            pass

    db.delete(record)
    db.commit()

    return {"message": f"Analysis {analysis_id} deleted successfully."}
