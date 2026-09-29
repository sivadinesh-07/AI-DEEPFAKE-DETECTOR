"""
FastAPI Routes for PDF Forensic Report Download.
Supports on-demand report generation if the PDF was deleted or missing.
"""

import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.database.models import AnalysisRecord
from backend.app.services.report_service import ForensicReportService
from backend.app.utils.paths import REPORTS_DIR

router = APIRouter(prefix="/api/v1/analysis", tags=["Reports"])

@router.get("/{analysis_id}/report")
async def download_report(analysis_id: str, db: Session = Depends(get_db)):
    record = db.query(AnalysisRecord).filter(AnalysisRecord.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis record not found.")

    pdf_path = record.report_pdf_path
    if not pdf_path or not os.path.exists(pdf_path):
        if record.status != "completed":
            raise HTTPException(status_code=400, detail=f"Analysis is not completed yet (current status: {record.status}).")

        # Generate on-demand
        pdf_out = os.path.join(str(REPORTS_DIR), f"{record.id}_report.pdf")
        analysis_dict = {
            "id": record.id,
            "filename": record.filename,
            "prediction": record.prediction,
            "confidence": record.confidence or 0.0,
            "processing_time": record.processing_time or 0.0,
            "metadata": {
                "resolution": record.resolution or "1920x1080",
                "duration": record.duration_seconds or 0.0,
                "fps": record.fps or 25.0
            },
            "spatial": {"score": record.spatial_score or 0.0},
            "temporal": {"score": record.temporal_score or 0.0},
            "audio": {"score": record.audio_score or 0.0},
            "sync": {"score": record.sync_score or 0.0, "status": record.sync_status or "consistent"},
            "facial_behavior": {
                "blink": record.blink_anomaly or 0.0,
                "gaze": record.gaze_anomaly or 0.0,
                "lip": record.lip_anomaly or 0.0,
                "mean_ear": record.mean_ear or 0.0,
                "mean_mar": record.mean_mar or 0.0
            },
            "timeline": record.timeline_json or [],
            "heatmaps": record.heatmaps_json or []
        }
        try:
            ForensicReportService.generate_pdf_report(analysis_dict, pdf_out)
            record.report_pdf_path = pdf_out
            db.commit()
            pdf_path = pdf_out
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate PDF report: {e}")

    return FileResponse(
        path=pdf_path,
        filename=f"{record.id}_Forensic_Report.pdf",
        media_type="application/pdf"
    )
