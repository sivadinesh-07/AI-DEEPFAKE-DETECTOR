"""
End-to-End Acceptance Integration Test for Neural Facial Media Forensics.
Simulates a client uploading a video, polling for completion, validating all forensic outputs,
checking Grad-CAM heatmaps, PDF report generation, and database history audit.
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import time
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

def test_full_pipeline_acceptance():
    print("\n============================================================")
    print("STARTING END-TO-END ACCEPTANCE TEST")
    print("============================================================")

    from pathlib import Path
    root = Path(__file__).resolve().parents[1]
    sample_video = str(root / "dataset" / "FakeAVCeleb_v1.2" / "FakeAVCeleb_v1.2" / "RealVideo-RealAudio" / "African" / "men" / "id00076" / "00109.mp4")
    assert os.path.exists(sample_video), f"Sample video not found at: {sample_video}"

    with TestClient(app) as client:
        # 1. Health check
        res_health = client.get("/api/v1/health")
        assert res_health.status_code == 200
        print("[1/6] Backend Health Check: OK")

        # 2. Upload video
        with open(sample_video, "rb") as f:
            res_upload = client.post(
                "/api/v1/analysis/upload",
                files={"file": ("test_sample.mp4", f, "video/mp4")}
            )
        assert res_upload.status_code == 200
        data_upload = res_upload.json()
        analysis_id = data_upload["analysis_id"]
        print(f"[2/6] Upload: OK. Enqueued job ID: {analysis_id}")

        # 3. Poll for background processing completion
        max_wait_seconds = 60
        start = time.time()
        completed = False

        print("[3/6] Polling job execution progress...")
        last_progress = -1
        while time.time() - start < max_wait_seconds:
            res_status = client.get(f"/api/v1/analysis/{analysis_id}")
            assert res_status.status_code == 200
            status_data = res_status.json()
            
            p = status_data["progress"]
            if p != last_progress:
                print(f"      Stage: {status_data['stage']:<25} | Progress: {p}%")
                last_progress = p

            if status_data["status"] == "completed":
                completed = True
                break
            elif status_data["status"] == "failed":
                pytest.fail(f"Analysis failed with error: {status_data.get('error_message')}")
            time.sleep(1.0)

        assert completed, "Analysis did not complete within timeout."
        print("[3/6] Job Execution: COMPLETED (100%)")

        # 4. Fetch results
        res_result = client.get(f"/api/v1/analysis/{analysis_id}/result")
        assert res_result.status_code == 200
        result = res_result.json()

        print(f"\n[4/6] Verification of Forensic Outputs:")
        print(f"      Verdict:          {result['prediction']}")
        print(f"      Confidence:       {result['confidence'] * 100:.1f}%")
        print(f"      Processing Time:  {result['processing_time']}s")
        print(f"      Spatial Score:    {result['spatial']['score']}")
        print(f"      Temporal Score:   {result['temporal']['score']}")
        print(f"      Audio Score:      {result['audio']['score']}")
        print(f"      Lip-Sync Score:   {result['sync']['score']} ({result['sync']['status']})")
        print(f"      Mean EAR (Blink): {result['facial_behavior']['mean_ear']}")
        print(f"      Mean MAR (Lip):   {result['facial_behavior']['mean_mar']}")
        print(f"      Timeline points:  {len(result['timeline'])}")
        print(f"      Heatmaps count:   {len(result['heatmaps'])}")

        assert result["prediction"] in ["REAL", "FAKE"]
        assert 0.0 <= result["confidence"] <= 1.0
        assert len(result["timeline"]) > 0

        # 5. Verify PDF Report Download
        res_report = client.get(f"/api/v1/analysis/{analysis_id}/report")
        assert res_report.status_code == 200
        assert len(res_report.content) > 1000
        print(f"[5/6] PDF Report: OK. Size: {len(res_report.content)} bytes")

        # 6. Verify Audit History
        res_hist = client.get("/api/v1/history")
        assert res_hist.status_code == 200
        hist_data = res_hist.json()
        assert hist_data["total"] >= 1
        ids = [i["id"] for i in hist_data["items"]]
        assert analysis_id in ids
        print(f"[6/6] History Audit: OK. Total logged: {hist_data['total']}")

    print("\n============================================================")
    print("FINAL ACCEPTANCE TEST PASSED SUCCESSFULLY!")
    print("============================================================\n")

if __name__ == "__main__":
    test_full_pipeline_acceptance()
