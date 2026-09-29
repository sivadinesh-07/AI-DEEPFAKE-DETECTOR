"""
Database Models for Forensic Analysis History and Metadata using SQLite / SQLAlchemy.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class AnalysisRecord(Base):
    __tablename__ = "analyses"

    id = Column(String(64), primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    duration_seconds = Column(Float, default=0.0)
    fps = Column(Float, default=0.0)
    resolution = Column(String(64), default="")

    status = Column(String(32), default="queued")  # queued, processing, completed, failed
    stage = Column(String(64), default="queued")
    progress = Column(Integer, default=0)          # 0 - 100
    error_message = Column(Text, nullable=True)

    prediction = Column(String(16), nullable=True) # REAL, FAKE
    confidence = Column(Float, nullable=True)      # 0.0 - 1.0
    processing_time = Column(Float, nullable=True) # seconds

    # Sub-scores
    spatial_score = Column(Float, default=0.0)
    temporal_score = Column(Float, default=0.0)
    audio_score = Column(Float, default=0.0)
    sync_score = Column(Float, default=0.0)
    sync_status = Column(String(32), default="not_evaluated") # consistent, mild_mismatch, significant_mismatch

    # Behavioral metrics
    blink_anomaly = Column(Float, default=0.0)
    gaze_anomaly = Column(Float, default=0.0)
    lip_anomaly = Column(Float, default=0.0)
    mean_ear = Column(Float, default=0.0)
    mean_mar = Column(Float, default=0.0)

    # Serialized structures
    timeline_json = Column(JSON, nullable=True)
    heatmaps_json = Column(JSON, nullable=True)
    frames_json = Column(JSON, nullable=True)
    report_pdf_path = Column(String(512), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
