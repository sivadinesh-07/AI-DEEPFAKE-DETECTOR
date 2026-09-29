# Temporal-Spectral Inconsistency Modeling for Neural Facial Media Forensics

An IEEE-standard, end-to-end multimodal deepfake detection and synthetic media verification framework. The system combines **Spatial-Spectral Modeling (EfficientNet-B4 + 2D FFT)**, **Behavioral Biometrics (MediaPipe 468 landmarks for Eye-Blink EAR, Iris Gaze, and Lip MAR)**, **Temporal Sequence Modeling (Bi-LSTM)**, **Acoustic Embeddings (Wav2Vec 2.0)**, **Cross-Modal Audio-Visual Synchronization (AV-Sync)**, **Grad-CAM Explainability**, and an **Interactive React Dashboard + FastAPI Backend**.

---

## 1. Architecture Overview

```
                               ┌─────────────────────────────┐
                               │   Input Video (MP4/MOV/AVI) │
                               └──────────────┬──────────────┘
                                              │
                        ┌─────────────────────┴─────────────────────┐
                        ▼                                           ▼
             Video Frames Extraction                     Audio Stream (16kHz Mono)
                        │                                           │
                        ▼                                           ▼
           Face Detection & 5-Pt Alignment                     Wav2Vec 2.0
            (MediaPipe / RetinaFace)                                │
                        │                                           ▼
         ┌──────────────┴──────────────┐                      Audio Embeddings
         ▼                             ▼                            │
MediaPipe 468 Mesh            EfficientNet-B4                       │
 (Blink EAR, Gaze,            + 2D-FFT Spectral                     │
  Lip MAR Dynamics)               Residuals                         │
         │                             │                            │
         └──────────────┬──────────────┘                            │
                        ▼                                           │
           Frame Sequence Modeling                                  │
                  (Bi-LSTM)                                         │
                        │                                           │
                        ▼                                           ▼
                Temporal Features                      Audio-Visual Lip-Sync Net
                        │                                           │
                        └─────────────────────┬─────────────────────┘
                                              ▼
                             Gated Multimodal Fusion Network
                                              │
                                              ▼
                              Classification Head (MLP + Sigmoid)
                                              │
                             ┌────────────────┴────────────────┐
                             ▼                                 ▼
                     P(REAL) vs P(FAKE)                 Grad-CAM Heatmaps
                      Confidence Score                 Suspicious Timelines
                             │                                 │
                             └────────────────┬────────────────┘
                                              ▼
                                 FastAPI Asynchronous Job Engine
                                              │ REST API
                                              ▼
                                 React + Vite Forensic Dashboard
```

---

## 2. Experimental Results & Performance Benchmarks

### A. Stage-Wise Test Set Evaluation (FakeAVCeleb Test Split)
Evaluated on strictly held-out identities from `FakeAVCeleb_v1.2` (zero identity leakage):

| Metric | Result |
| :--- | :--- |
| **Accuracy** | **80.00%** |
| **Precision** | **80.00%** |
| **Recall** | **100.00%** |
| **F1-Score** | **88.89%** |
| **ROC-AUC** | **1.0000** |
| **Average Inference Latency** | **4.22 seconds / video** |

### B. Ablation Study (6 Architecture Configurations)
Comparing model performance across the 6 architectural variants specified in Section 37 & 68:

| # | Architecture Configuration | Accuracy (%) | Precision (%) | Recall (%) | F1-Score (%) | ROC-AUC |
| :-: | :--- | :-: | :-: | :-: | :-: | :-: |
| 1 | EfficientNet-B4 only (Spatial) | 80.00% | 80.00% | 100.00% | 88.89% | 0.000 |
| 2 | EfficientNet-B4 + Bi-LSTM (Spatial + Temporal) | 80.00% | 80.00% | 100.00% | 88.89% | 1.000 |
| 3 | Wav2Vec 2.0 only (Audio Acoustic) | 80.00% | 80.00% | 100.00% | 88.89% | 0.250 |
| 4 | Visual + Audio | 80.00% | 80.00% | 100.00% | 88.89% | 0.000 |
| 5 | Visual + Temporal + Audio | 80.00% | 80.00% | 100.00% | 88.89% | 1.000 |
| 6 | **Full Multimodal Model (Proposed)** | **80.00%** | **80.00%** | **100.00%** | **88.89%** | **1.000** |

### C. Cross-Dataset Generalization Benchmark (UADFV)
Evaluated directly on the external **UADFV benchmark** without retraining:

| Dataset | Evaluation Samples | Accuracy (%) | Precision (%) | Recall (%) | F1-Score (%) | ROC-AUC |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: |
| **UADFV** | 10 Videos (5 Real / 5 Fake) | **50.00%** | **50.00%** | **100.00%** | **66.67%** | **0.7600** |

---

## 3. Technology Stack

### Backend
- **Framework:** FastAPI, Uvicorn, Pydantic, Python-multipart
- **Deep Learning:** PyTorch, Torchvision, Torchaudio
- **Audio Processing:** HuggingFace Transformers (Wav2Vec 2.0), ImageIO-FFmpeg, SoundFile
- **Computer Vision & Landmarks:** OpenCV, MediaPipe Tasks (FaceLandmarker XNNPACK)
- **Explainability:** Grad-CAM on EfficientNet-B4 conv stages
- **Reporting:** ReportLab (automated PDF dossier generation)
- **Database:** SQLite with SQLAlchemy ORM

### Frontend
- **Framework:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4, Lucide React Icons
- **Visualizations:** Recharts (Radar Anomaly Chart, Interactive Area Timeline)
- **HTTP Client:** Axios

---

## 4. Installation & Setup

### Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ (tested on Node v24)

### 1. Backend Setup
```bash
# Clone or navigate to the repository
cd d:/Temporal-Spectral

# Install python dependencies
pip install -r backend/requirements.txt
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run build
```

---

## 5. Running the Application

### Option A: Run Backend Server
```bash
# From repository root (d:/Temporal-Spectral)
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000

# Or run directly:
python backend/app/main.py

# If using reload for active development, restrict reload to backend/app:
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload --reload-dir backend/app
```
The FastAPI documentation is available at: `http://127.0.0.1:8000/docs`.

### Option B: Run React Frontend
```bash
# From d:/Temporal-Spectral/frontend
npm run dev
```
The dashboard is accessible at: `http://localhost:5173`.

---

## 6. REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/analysis/upload` | Uploads video and enqueues background forensic audit job |
| `GET` | `/api/v1/analysis/{id}` | Returns live processing stage and progress (0% - 100%) |
| `GET` | `/api/v1/analysis/{id}/result` | Returns complete forensic verdict, confidence, sub-scores, timeline, and heatmaps |
| `GET` | `/api/v1/analysis/{id}/timeline` | Returns temporal anomaly scores across keyframe sequence |
| `GET` | `/api/v1/analysis/{id}/heatmaps` | Returns Grad-CAM saliency heatmaps for top suspicious frames |
| `GET` | `/api/v1/analysis/{id}/report` | Streams/downloads official PDF forensic investigation dossier |
| `GET` | `/api/v1/history` | Returns paginated audit history logs and global KPI summary |
| `DELETE` | `/api/v1/history/{id}` | Deletes an audit record and temporary media files |
| `GET` | `/api/v1/health` | Service health status check |

---

## 7. Project Structure

```
d:/Temporal-Spectral/
│
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entrypoint, CORS, static mounts, startup lifespan
│   │   ├── api/
│   │   │   ├── routes_analysis.py  # Video upload, status polling, result retrieval
│   │   │   ├── routes_history.py   # Audit history & KPI aggregation
│   │   │   └── routes_reports.py   # PDF report download stream
│   │   ├── services/
│   │   │   ├── inference_service.py # Full multimodal inference pipeline
│   │   │   ├── job_queue.py         # Asynchronous worker thread manager
│   │   │   └── report_service.py    # ReportLab PDF report generator
│   │   ├── models/
│   │   │   ├── spatial_model.py     # EfficientNet-B4 + 2D FFT spectral encoder
│   │   │   ├── temporal_model.py    # Bi-LSTM sequence network & timeline head
│   │   │   ├── audio_model.py       # Wav2Vec 2.0 speech acoustic encoder
│   │   │   ├── av_sync_model.py     # Cross-modal lip-sync alignment net
│   │   │   └── fusion_model.py      # Gated Multimodal Fusion classifier
│   │   ├── preprocessing/
│   │   │   ├── video_processor.py   # Uniform keyframe extractor
│   │   │   ├── face_detector.py     # MediaPipe FaceLandmarker with multi-face resolution
│   │   │   ├── face_alignment.py    # 5-point affine similarity transform aligner
│   │   │   └── audio_processor.py   # 16kHz mono audio resampler & normalizer
│   │   ├── features/
│   │   │   ├── mediapipe_features.py # 16-dim unified behavioral biometric extractor
│   │   │   ├── blink_features.py     # Eye Aspect Ratio (EAR) & blink frequency
│   │   │   ├── gaze_features.py      # Iris center offset & pupil deviation vectors
│   │   │   ├── lip_features.py       # Mouth Aspect Ratio (MAR) & velocity derivatives
│   │   │   └── spectral_features.py  # 2D FFT azimuthal radial power spectrum
│   │   ├── explainability/
│   │   │   └── gradcam.py           # Grad-CAM heatmap generator for features.8
│   │   └── database/
│   │       ├── database.py          # SQLite engine & session management
│   │       └── models.py            # SQLAlchemy AnalysisRecord table
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx           # Forensic platform navigation bar
│   │   │   ├── Sidebar.tsx          # Collapsible navigation drawer
│   │   │   ├── VideoUploader.tsx    # Drag-and-drop video upload & validation
│   │   │   ├── ProcessingProgress.tsx # Real-time 0%-100% backend stage monitor
│   │   │   ├── PredictionCard.tsx   # REAL/FAKE badge & confidence gauge
│   │   │   ├── AnalysisCard.tsx     # Recharts radar & sub-score metric cards
│   │   │   ├── TimelineChart.tsx    # Interactive anomaly scrub timeline
│   │   │   └── HeatmapViewer.tsx    # Grad-CAM interactive overlay with opacity slider
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx        # KPI metrics & recent audits
│   │   │   ├── Analysis.tsx         # Upload & live forensic workspace
│   │   │   ├── History.tsx          # Archived audit table with search & delete
│   │   │   ├── Reports.tsx          # Downloadable PDF report cards
│   │   │   └── Settings.tsx         # Documented thresholds & hardware diagnostics
│   │   ├── services/
│   │   │   └── api.ts               # Axios client connected to FastAPI
│   │   ├── types/
│   │   │   └── analysis.ts          # TypeScript interfaces
│   │   ├── App.tsx                  # Router configuration
│   │   ├── main.tsx
│   │   └── index.css                # Tailwind CSS v4 styling
│   ├── package.json
│   └── vite.config.ts
│
├── checkpoints/                     # Model weights (.pt files)
│   ├── spatial_best.pt              # EfficientNet-B4 spatial model
│   ├── lstm_best.pt                 # Bi-LSTM temporal sequence model
│   ├── av_sync_best.pt              # Audio-Visual lip-sync model
│   ├── fusion_best.pt               # Gated Multimodal Fusion model
│   └── face_landmarker.task         # Google MediaPipe 478-mesh task binary
│
├── data/
│   ├── splits.json                  # Identity-stratified train/val/test splits
│   ├── final_test_metrics.json      # Test set evaluation results
│   ├── ablation_results.json        # 6-architecture ablation study results
│   ├── cross_dataset_results.json   # UADFV cross-dataset generalization metrics
│   └── features/                    # Pre-extracted offline feature tensors
│
├── training/
│   ├── dataset_inspector.py         # Inspects FakeAVCeleb & UADFV distributions
│   ├── dataset_loader.py            # Identity-level stratified splitting
│   ├── extract_features.py          # Offline feature caching pipeline
│   ├── train_all.py                 # Staged model training & evaluation
│   ├── ablation_study.py            # Ablation evaluation across 6 architectures
│   └── cross_dataset_test.py        # Generalization benchmark on UADFV
│
├── tests/
│   └── test_end_to_end.py           # Automated full-pipeline acceptance test
│
└── README.md
```

---

## 8. License & Citation
Developed as an academic and forensic research system for media verification.
Licensed under the MIT License.
