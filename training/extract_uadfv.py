"""
Extract features from UADFV dataset (real & fake) and cache to data/features/.
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import glob
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
from backend.app.utils.paths import DATA_DIR

def extract_uadfv():
    output_dir = str(DATA_DIR / "features")
    os.makedirs(output_dir, exist_ok=True)

    device = torch.device("cpu")
    vp = VideoProcessor(target_frames=20)
    fd = FaceDetector()
    fa = FaceAligner()
    ap = AudioProcessor()

    spatial_model = SpatialSpectralModel(pretrained=True).to(device)
    spatial_model.eval()
    audio_model = AudioWav2VecModel(pretrained=True).to(device)
    audio_model.eval()

    real_videos = sorted(glob.glob("dataset/UADFV/real/*.mp4"))[:30]
    fake_videos = sorted(glob.glob("dataset/UADFV/fake/*.mp4"))[:30]

    all_items = [(p, 0, "UADFV-Real") for p in real_videos] + [(p, 1, "UADFV-Fake") for p in fake_videos]
    print(f"Extracting {len(all_items)} UADFV videos (30 real, 30 fake)...")

    saved_count = 0
    for video_path, label, category in tqdm(all_items, desc="UADFV Extraction"):
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        out_filename = f"uadfv_{base_name}.pt"
        out_path = os.path.join(output_dir, out_filename)

        if os.path.exists(out_path):
            continue

        try:
            meta = vp.get_metadata(video_path)
            keyframes = vp.extract_keyframes(video_path)
            if not keyframes:
                continue

            aligned_faces = []
            landmark_seq = []
            iris_seq = []
            spectral_list = []
            timestamps = [kf["timestamp"] for kf in keyframes]

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

            behavior_dict = MediaPipeFeatureExtractor.extract_sequence_behavior(
                landmark_seq, iris_seq, fps=meta["fps"], duration=meta["duration"], timestamps=timestamps
            )
            feat_f_matrix = torch.from_numpy(behavior_dict["feature_matrix"]).float()
            feat_f_pooled = torch.mean(feat_f_matrix, dim=0)

            faces_arr = np.stack(aligned_faces, axis=0)
            spec_arr = np.stack(spectral_list, axis=0)

            faces_t = torch.from_numpy(faces_arr).float().permute(0, 3, 1, 2) / 255.0
            spec_t = torch.from_numpy(spec_arr).float()

            with torch.no_grad():
                spatial_seq = spatial_model.extract_features(faces_t, spec_t).cpu()
                spatial_pooled = torch.mean(spatial_seq, dim=0)

            temporal_input_seq = torch.cat([spatial_seq, feat_f_matrix], dim=-1)

            audio_res = ap.extract_audio(video_path)
            wav_t = torch.from_numpy(audio_res["waveform"]).unsqueeze(0)
            has_audio_t = torch.tensor([1 if audio_res["has_audio"] else 0])

            with torch.no_grad():
                audio_emb = audio_model.extract_features(wav_t, has_audio_t).squeeze(0)

            sample_data = {
                "video_path": video_path,
                "label": label,
                "category": category,
                "identity": "uadfv",
                "has_audio": bool(audio_res["has_audio"]),
                "feat_v": spatial_pooled,
                "spatial_seq": spatial_seq,
                "temporal_input_seq": temporal_input_seq,
                "feat_f": feat_f_pooled,
                "feat_a": audio_emb,
                "feat_lip": feat_f_pooled,
                "behavior_summary": {
                    "blink": behavior_dict["blink"],
                    "gaze": behavior_dict["gaze"],
                    "lip": behavior_dict["lip"]
                }
            }

            torch.save(sample_data, out_path)
            saved_count += 1
        except Exception as e:
            print(f"[Warning] Failed extracting {video_path}: {e}")

    print(f"[Done] Extracted and saved {saved_count} UADFV feature packages.")

if __name__ == "__main__":
    extract_uadfv()
