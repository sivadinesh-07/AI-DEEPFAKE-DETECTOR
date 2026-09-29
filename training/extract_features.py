"""
Feature Pre-Extraction & Caching Pipeline.
Pre-extracts:
  - EfficientNet-B4 spatial features (20 x 1792) with genuine ImageNet pretrained weights
  - 2D-FFT spectral features (20 x 64)
  - MediaPipe 468 behavioral biometric sequence (20 x 16)
  - Audio waveform & Wav2Vec 2.0 acoustic embedding (768)
  - Lip dynamics (16)
Saves tensors to data/features/ for instantaneous model training.
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import json
import cv2
import torch
import numpy as np
from tqdm import tqdm

from backend.app.preprocessing.video_processor import VideoProcessor
from backend.app.preprocessing.face_detector import FaceDetector
from backend.app.preprocessing.face_alignment import FaceAligner
from backend.app.preprocessing.audio_processor import AudioProcessor
from backend.app.features.mediapipe_features import MediaPipeFeatureExtractor
from backend.app.features.spectral_features import SpectralAnalyzer
from backend.app.models.spatial_model import SpatialSpectralModel
from backend.app.models.audio_model import AudioWav2VecModel
from backend.app.utils.paths import PROJECT_ROOT, DATA_DIR

def extract_and_cache_dataset(splits_json: str, output_dir: str, max_samples: int = 0):
    os.makedirs(output_dir, exist_ok=True)
    
    with open(splits_json, 'r', encoding='utf-8') as f:
        splits = json.load(f)

    # Maximize CPU execution speed
    torch.set_num_threads(8)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[Feature Extraction] Running on device: {device} (Threads: {torch.get_num_threads()})")

    # Initialize feature extractors with genuine pretrained backbones
    vp = VideoProcessor(target_frames=20)
    fd = FaceDetector()
    fa = FaceAligner()
    ap = AudioProcessor()
    spatial_model = SpatialSpectralModel(pretrained=True).to(device)
    spatial_model.eval()
    audio_model = AudioWav2VecModel(pretrained=True).to(device)
    audio_model.eval()

    index = {"train": [], "val": [], "test": []}

    for split_name in ["train", "val", "test"]:
        items = splits[split_name]
        if max_samples > 0 and len(items) > max_samples:
            items = items[:max_samples]

        print(f"\nProcessing split: {split_name} ({len(items)} videos)...")
        
        for idx, item in enumerate(tqdm(items, desc=f"Extracting {split_name}")):
            video_path = item["video_path"]
            label = item["label"]
            category = item.get("category", "unknown")
            ident = item.get("identity", "unknown")

            out_filename = f"{split_name}_{idx:04d}_{os.path.splitext(os.path.basename(video_path))[0]}.pt"
            out_path = os.path.join(output_dir, out_filename)

            if os.path.exists(out_path):
                index[split_name].append({
                    "feature_path": out_path,
                    "label": label,
                    "category": category,
                    "identity": ident,
                    "has_audio": True
                })
                continue

            try:
                # 1. Video keyframes
                keyframes = vp.extract_keyframes(video_path)
                if not keyframes:
                    continue

                # 2. Face detection, alignment, landmarks
                aligned_faces = []
                landmark_seq = []
                iris_seq = []
                spectral_list = []

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

                # 3. Behavioral biometrics
                behavior_dict = MediaPipeFeatureExtractor.extract_sequence_behavior(landmark_seq, iris_seq, fps=25.0)
                feat_f_matrix = torch.from_numpy(behavior_dict["feature_matrix"]).float()  # (T, 16)
                feat_f_pooled = torch.mean(feat_f_matrix, dim=0)                           # (16,)

                # 4. Spatial-Spectral representations
                faces_arr = np.stack(aligned_faces, axis=0)  # (T, 224, 224, 3)
                spec_arr = np.stack(spectral_list, axis=0)   # (T, 64)

                faces_t = torch.from_numpy(faces_arr).float().permute(0, 3, 1, 2) / 255.0
                spec_t = torch.from_numpy(spec_arr).float()

                with torch.no_grad():
                    faces_t = faces_t.to(device)
                    spec_t = spec_t.to(device)
                    spatial_seq = spatial_model.extract_features(faces_t, spec_t).cpu()  # (T, 1856)
                    spatial_pooled = torch.mean(spatial_seq, dim=0)                      # (1856,)

                # Combined frame sequence for temporal LSTM: (T, 1856 + 16) = (T, 1872)
                temporal_input_seq = torch.cat([spatial_seq, feat_f_matrix], dim=-1)

                # 5. Audio extraction & Wav2Vec
                audio_res = ap.extract_audio(video_path)
                wav_t = torch.from_numpy(audio_res["waveform"]).unsqueeze(0).to(device)
                has_audio_t = torch.tensor([1 if audio_res["has_audio"] else 0], device=device)

                with torch.no_grad():
                    audio_emb = audio_model.extract_features(wav_t, has_audio_t).cpu().squeeze(0)  # (768,)

                # 6. Lip dynamics feature for AV-sync
                lip_dynamics = feat_f_pooled  # (16,)

                # Save sample feature package
                sample_data = {
                    "video_path": video_path,
                    "label": label,
                    "category": category,
                    "identity": ident,
                    "has_audio": bool(audio_res["has_audio"]),
                    "feat_v": spatial_pooled,                  # (1856,)
                    "spatial_seq": spatial_seq,                # (20, 1856)
                    "temporal_input_seq": temporal_input_seq, # (20, 1872)
                    "feat_f": feat_f_pooled,                  # (16,)
                    "feat_a": audio_emb,                      # (768,)
                    "feat_lip": lip_dynamics,                 # (16,)
                    "behavior_summary": {
                        "blink": behavior_dict["blink"],
                        "gaze": behavior_dict["gaze"],
                        "lip": behavior_dict["lip"]
                    }
                }

                torch.save(sample_data, out_path)
                index[split_name].append({
                    "feature_path": out_path,
                    "label": label,
                    "category": category,
                    "identity": ident,
                    "has_audio": bool(audio_res["has_audio"])
                })

            except Exception as e:
                print(f"[Warning] Failed extracting {video_path}: {e}")
                continue

    # Save index
    index_path = os.path.join(output_dir, "features_index.json")
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2)
    print(f"\n[Done] Features index saved to: {index_path}")
    print(f"  Train: {len(index['train'])}, Val: {len(index['val'])}, Test: {len(index['test'])}")

if __name__ == "__main__":
    splits_file = str(DATA_DIR / "splits.json")
    features_dir = str(DATA_DIR / "features")
    extract_and_cache_dataset(splits_file, features_dir, max_samples=0)
