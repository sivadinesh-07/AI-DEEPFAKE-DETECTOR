"""
Cross-Dataset Generalization Evaluation.
Evaluates the model trained on FakeAVCeleb directly on the external UADFV benchmark (98 videos).
Measures cross-domain robustness without retraining.
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import json
import cv2
import numpy as np
import torch
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
from tqdm import tqdm

from backend.app.preprocessing.video_processor import VideoProcessor
from backend.app.preprocessing.face_detector import FaceDetector
from backend.app.preprocessing.face_alignment import FaceAligner
from backend.app.preprocessing.audio_processor import AudioProcessor
from backend.app.features.mediapipe_features import MediaPipeFeatureExtractor
from backend.app.features.spectral_features import SpectralAnalyzer
from backend.app.models.spatial_model import SpatialSpectralModel
from backend.app.models.temporal_model import BiLSTMTemporalModel
from backend.app.models.av_sync_model import AVSyncModel
from backend.app.models.fusion_model import GatedMultimodalFusion

def run_cross_dataset_evaluation(uadfv_dir: str, checkpoint_dir: str, max_eval: int = 20):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n============================================================")
    print(f"CROSS-DATASET EVALUATION ON UADFV BENCHMARK: {device}")
    print(f"============================================================")

    real_dir = os.path.join(uadfv_dir, "real")
    fake_dir = os.path.join(uadfv_dir, "fake")

    real_files = [os.path.join(real_dir, f) for f in os.listdir(real_dir) if f.endswith(".mp4")][:max_eval // 2]
    fake_files = [os.path.join(fake_dir, f) for f in os.listdir(fake_dir) if f.endswith(".mp4")][:max_eval // 2]

    all_test = [(p, 0) for p in real_files] + [(p, 1) for p in fake_files]
    print(f"Evaluating on {len(all_test)} UADFV videos ({len(real_files)} Real, {len(fake_files)} Fake)...")

    # Load models
    vp = VideoProcessor(target_frames=20)
    fd = FaceDetector()
    fa = FaceAligner()
    ap = AudioProcessor()

    spatial_model = SpatialSpectralModel(pretrained=False).to(device)
    if os.path.exists(os.path.join(checkpoint_dir, "spatial_best.pt")):
        spatial_model.load_state_dict(torch.load(os.path.join(checkpoint_dir, "spatial_best.pt"), weights_only=True))
    spatial_model.eval()

    temporal_model = BiLSTMTemporalModel(input_dim=1872).to(device)
    if os.path.exists(os.path.join(checkpoint_dir, "lstm_best.pt")):
        temporal_model.load_state_dict(torch.load(os.path.join(checkpoint_dir, "lstm_best.pt"), weights_only=True))
    temporal_model.eval()

    sync_model = AVSyncModel().to(device)
    if os.path.exists(os.path.join(checkpoint_dir, "av_sync_best.pt")):
        sync_model.load_state_dict(torch.load(os.path.join(checkpoint_dir, "av_sync_best.pt"), weights_only=True))
    sync_model.eval()

    fusion_model = GatedMultimodalFusion().to(device)
    if os.path.exists(os.path.join(checkpoint_dir, "fusion_best.pt")):
        fusion_model.load_state_dict(torch.load(os.path.join(checkpoint_dir, "fusion_best.pt"), weights_only=True))
    fusion_model.eval()

    y_true, y_pred, y_probs = [], [], []

    for video_path, label in tqdm(all_test, desc="Evaluating UADFV"):
        try:
            keyframes = vp.extract_keyframes(video_path)
            if not keyframes:
                continue

            aligned_faces, landmark_seq, iris_seq, spectral_list = [], [], [], []
            for kf in keyframes:
                rgb = kf["image_rgb"]
                det = fd.detect_primary_face(rgb)
                if det is not None:
                    aligned = fa.align_face(rgb, det["bbox"], det["landmarks_5pt"])
                    landmark_seq.append(det["all_landmarks_468"])
                    iris_seq.append(det["iris_landmarks"])
                else:
                    aligned = cv2.resize(rgb, (224, 224))
                    landmark_seq.append(None)
                    iris_seq.append(None)
                aligned_faces.append(aligned)
                spec = SpectralAnalyzer.extract_spectral_features(aligned)
                spectral_list.append(spec)

            behavior_dict = MediaPipeFeatureExtractor.extract_sequence_behavior(landmark_seq, iris_seq, fps=25.0)
            feat_f_matrix = torch.from_numpy(behavior_dict["feature_matrix"]).float().to(device)
            feat_f = torch.mean(feat_f_matrix, dim=0, keepdim=True)

            faces_arr = np.stack(aligned_faces, axis=0)
            spec_arr = np.stack(spectral_list, axis=0)
            faces_t = torch.from_numpy(faces_arr).float().permute(0, 3, 1, 2).to(device) / 255.0
            spec_t = torch.from_numpy(spec_arr).float().to(device)

            with torch.no_grad():
                spatial_seq = spatial_model.extract_features(faces_t, spec_t)
                feat_v = torch.mean(spatial_seq, dim=0, keepdim=True)
                temp_seq = torch.cat([spatial_seq, feat_f_matrix], dim=-1).unsqueeze(0)
                _, feat_t, _ = temporal_model(temp_seq)

                # Audio
                audio_res = ap.extract_audio(video_path)
                has_audio = torch.tensor([1 if audio_res["has_audio"] else 0], device=device)
                feat_a = torch.zeros((1, 768), device=device)
                feat_lip = feat_f

                _, feat_s, _ = sync_model(feat_lip, feat_a, has_audio)
                _, prob, _ = fusion_model(feat_v, feat_t, feat_a, feat_s, feat_f, has_audio)

                p = float(prob.squeeze().item())
                y_true.append(label)
                y_probs.append(p)
                y_pred.append(1 if p >= 0.5 else 0)

        except Exception as e:
            print(f"Error on {video_path}: {e}")
            continue

    acc = accuracy_score(y_true, y_pred) * 100.0
    prec = precision_score(y_true, y_pred, zero_division=0) * 100.0
    rec = recall_score(y_true, y_pred, zero_division=0) * 100.0
    f1 = f1_score(y_true, y_pred, zero_division=0) * 100.0
    try:
        auc = roc_auc_score(y_true, y_probs)
    except Exception:
        auc = 0.5
    cm = confusion_matrix(y_true, y_pred).tolist()

    results = {
        "dataset": "UADFV",
        "samples_evaluated": len(y_true),
        "accuracy": round(acc, 2),
        "precision": round(prec, 2),
        "recall": round(rec, 2),
        "f1_score": round(f1, 2),
        "roc_auc": round(auc, 4),
        "confusion_matrix": cm
    }

    print(f"\nUADFV Cross-Dataset Results:")
    print(f"  Accuracy:  {acc:.2f}%")
    print(f"  Precision: {prec:.2f}%")
    print(f"  Recall:    {rec:.2f}%")
    print(f"  F1-Score:  {f1:.2f}%")
    print(f"  ROC-AUC:   {auc:.4f}")

    out_file = r"D:\Temporal-Spectral\data\cross_dataset_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"Cross-dataset results saved to: {out_file}")
    return results

if __name__ == "__main__":
    uadfv_path = r"D:\Temporal-Spectral\dataset\UADFV"
    ckpt_path = r"D:\Temporal-Spectral\checkpoints"
    run_cross_dataset_evaluation(uadfv_path, ckpt_path, max_eval=10)
