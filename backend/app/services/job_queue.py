"""
Asynchronous Forensic Background Job Queue.
Processes video forensic pipelines sequentially using a dedicated worker thread,
prevents PyTorch / Grad-CAM concurrency collisions, and automatically recovers orphaned jobs on startup.
"""

import os
import queue
import threading
import time
from datetime import datetime
from typing import Dict, Optional

from backend.app.database.database import SessionLocal
from backend.app.database.models import AnalysisRecord
from backend.app.services.inference_service import ForensicInferencePipeline
from backend.app.services.report_service import ForensicReportService
from backend.app.utils.paths import RESULTS_DIR, REPORTS_DIR

class ForensicJobQueue:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return
        self._initialized = True
        self.pipeline: Optional[ForensicInferencePipeline] = None
        self._queue = queue.Queue()
        self._worker_thread = threading.Thread(target=self._worker_loop, daemon=True, name="ForensicWorkerThread")
        self._worker_thread.start()
        print("[JobQueue] Serialized Forensic Worker Thread started.")

    def get_pipeline(self) -> ForensicInferencePipeline:
        if self.pipeline is None:
            with self._lock:
                if self.pipeline is None:
                    self.pipeline = ForensicInferencePipeline()
        return self.pipeline

    def enqueue_analysis(self, analysis_id: str, video_path: str, filename: str):
        """Enqueue an analysis job for sequential processing."""
        self._queue.put((analysis_id, video_path, filename))
        print(f"[JobQueue] Enqueued analysis {analysis_id}. Queue depth: {self._queue.qsize()}")

    def recover_orphaned_jobs(self):
        """
        Scans SQLite database for any records left in 'queued' or 'processing' state
        from a previous server crash or restart, and resumes them or marks them failed.
        """
        db = SessionLocal()
        try:
            stalled = db.query(AnalysisRecord).filter(
                AnalysisRecord.status.in_(["queued", "processing"])
            ).all()

            if not stalled:
                return

            print(f"[JobQueue] Found {len(stalled)} stalled job(s) from previous run. Recovering...")
            for rec in stalled:
                if rec.file_path and os.path.exists(rec.file_path):
                    print(f"[JobQueue] Re-enqueuing stalled job {rec.id} ({rec.filename})")
                    rec.status = "queued"
                    rec.stage = "queued"
                    rec.progress = 0
                    rec.error_message = None
                    db.commit()
                    self.enqueue_analysis(rec.id, rec.file_path, rec.filename)
                else:
                    print(f"[JobQueue] Stalled job {rec.id} source file missing. Marking failed.")
                    rec.status = "failed"
                    rec.stage = "failed"
                    rec.error_message = "Analysis interrupted by previous server restart and source file is missing."
                    db.commit()
        except Exception as e:
            print(f"[JobQueue Error] Failed during orphaned job recovery: {e}")
        finally:
            db.close()

    def _worker_loop(self):
        """Dedicated sequential consumer loop."""
        while True:
            try:
                item = self._queue.get()
                if item is None:
                    break
                analysis_id, video_path, filename = item
                self._run_job(analysis_id, video_path, filename)
            except Exception as e:
                print(f"[JobQueue Worker Loop Error]: {e}")
            finally:
                self._queue.task_done()

    def _run_job(self, analysis_id: str, video_path: str, filename: str):
        db = SessionLocal()
        try:
            record = db.query(AnalysisRecord).filter(AnalysisRecord.id == analysis_id).first()
            if not record:
                # Wait briefly in case the API transaction hasn't committed yet
                time.sleep(0.3)
                record = db.query(AnalysisRecord).filter(AnalysisRecord.id == analysis_id).first()
                if not record:
                    print(f"[JobQueue Error] Record {analysis_id} not found in database.")
                    return

            record.status = "processing"
            record.stage = "initializing"
            record.progress = 5
            record.error_message = None
            db.commit()

            pipeline = self.get_pipeline()
            pipeline.reload_checkpoints()

            def progress_callback(stage_name: str, pct: int):
                # Update DB progress in separate quick session to keep transactions short
                cb_db = SessionLocal()
                try:
                    rec = cb_db.query(AnalysisRecord).filter(AnalysisRecord.id == analysis_id).first()
                    if rec:
                        rec.stage = stage_name
                        rec.progress = pct
                        cb_db.commit()
                except Exception as cb_err:
                    print(f"[JobQueue Progress Error]: {cb_err}")
                finally:
                    cb_db.close()

            # Execute pipeline
            results = pipeline.analyze_video(
                video_path=video_path,
                output_dir=str(RESULTS_DIR),
                progress_callback=progress_callback,
                analysis_id=analysis_id
            )

            # Generate PDF Report
            pdf_out = os.path.join(str(REPORTS_DIR), f"{analysis_id}_report.pdf")
            results["id"] = analysis_id
            results["filename"] = filename
            try:
                ForensicReportService.generate_pdf_report(results, pdf_out)
            except Exception as pdf_err:
                print(f"[JobQueue PDF Warning] Could not generate PDF report for {analysis_id}: {pdf_err}")

            # Persist completed results
            rec = db.query(AnalysisRecord).filter(AnalysisRecord.id == analysis_id).first()
            if rec:
                rec.status = "completed"
                rec.stage = "completed"
                rec.progress = 100
                rec.prediction = results["prediction"]
                rec.confidence = results["confidence"]
                rec.processing_time = results["processing_time"]

                rec.spatial_score = results["spatial"]["score"]
                rec.temporal_score = results["temporal"]["score"]
                rec.audio_score = results["audio"]["score"]
                rec.sync_score = results["sync"]["score"]
                rec.sync_status = results["sync"]["status"]

                fb = results.get("facial_behavior", {})
                rec.blink_anomaly = fb.get("blink", 0.0)
                rec.gaze_anomaly = fb.get("gaze", 0.0)
                rec.lip_anomaly = fb.get("lip", 0.0)
                rec.mean_ear = fb.get("mean_ear", 0.0)
                rec.mean_mar = fb.get("mean_mar", 0.0)

                rec.timeline_json = results["timeline"]
                rec.heatmaps_json = results["heatmaps"]
                rec.frames_json = results.get("all_frames", [])
                rec.report_pdf_path = pdf_out if os.path.exists(pdf_out) else None
                rec.completed_at = datetime.utcnow()

                meta = results.get("metadata", {})
                rec.duration_seconds = meta.get("duration", 0.0)
                rec.fps = meta.get("fps", 0.0)
                rec.resolution = f"{meta.get('width', 0)}x{meta.get('height', 0)}"

                db.commit()
                print(f"[JobQueue] Completed analysis {analysis_id} successfully in {results['processing_time']}s.")

        except Exception as e:
            try:
                rec = db.query(AnalysisRecord).filter(AnalysisRecord.id == analysis_id).first()
                if rec:
                    rec.status = "failed"
                    rec.stage = "failed"
                    rec.error_message = str(e)
                    db.commit()
            except Exception as db_err:
                print(f"[JobQueue Error] Failed to update error state in DB: {db_err}")
            print(f"[JobQueue Error] Analysis {analysis_id} failed: {e}")
        finally:
            db.close()
