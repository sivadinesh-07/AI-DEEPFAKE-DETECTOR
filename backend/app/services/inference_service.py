"""
End-to-End Forensic Inference Service.
Coordinates the entire multimodal media forensics pipeline on a video file:
  - Keyframe extraction (20 frames)
  - Face detection & 5-point alignment
  - MediaPipe 468 landmarks (Blink, Gaze, Lip)
  - EfficientNet-B4 spatial features + 2D FFT spectral features
  - Bi-LSTM temporal sequence modeling & timeline anomaly scoring
  - Audio extraction & Wav2Vec 2.0 acoustic embedding
  - Audio-Visual lip-sync mismatch analysis
  - Gated Multimodal Fusion & final prediction
  - Grad-CAM heatmap generation on suspicious frames
"""

import os
import time
import pickle
import cv2
import numpy as np
import torch
from typing import Dict, List, Optional, Callable

from backend.app.preprocessing.video_processor import VideoProcessor
from backend.app.preprocessing.face_detector import FaceDetector
from backend.app.preprocessing.face_alignment import FaceAligner
from backend.app.preprocessing.audio_processor import AudioProcessor
from backend.app.features.mediapipe_features import MediaPipeFeatureExtractor
from backend.app.features.spectral_features import SpectralAnalyzer
from backend.app.models.spatial_model import SpatialSpectralModel
from backend.app.models.temporal_model import BiLSTMTemporalModel
from backend.app.models.audio_model import AudioWav2VecModel
from backend.app.models.av_sync_model import AVSyncModel
from backend.app.models.fusion_model import GatedMultimodalFusion
from backend.app.explainability.gradcam import GradCAM
from backend.app.utils.paths import CHECKPOINTS_DIR, RESULTS_DIR

class ForensicInferencePipeline:
    def __init__(self, checkpoint_dir: str = str(CHECKPOINTS_DIR)):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.checkpoint_dir = checkpoint_dir

        # Preprocessors
        self.vp = VideoProcessor(target_frames=20)
        self.fd = FaceDetector()
        self.fa = FaceAligner()
        self.ap = AudioProcessor()

        # Models
        self.spatial_model = SpatialSpectralModel(pretrained=True).to(self.device)
        self.temporal_model = BiLSTMTemporalModel(input_dim=1872).to(self.device)
        self.audio_model = AudioWav2VecModel(pretrained=True).to(self.device)
        self.sync_model = AVSyncModel().to(self.device)
        self.fusion_model = GatedMultimodalFusion().to(self.device)
        self.ensemble = None

        # Load weights if checkpoints exist
        self._load_checkpoints()

        # Set evaluation mode
        self.spatial_model.eval()
        self.temporal_model.eval()
        self.audio_model.eval()
        self.sync_model.eval()
        self.fusion_model.eval()

        # Grad-CAM instance
        self.gradcam = GradCAM(self.spatial_model)

    def _load_checkpoints(self):
        ens_ckpt = os.path.join(self.checkpoint_dir, "forensic_ensemble.pkl")
        if os.path.exists(ens_ckpt):
            try:
                with open(ens_ckpt, "rb") as f:
                    self.ensemble = pickle.load(f)
                print(f"[Info] Loaded calibrated forensic ensemble from {ens_ckpt}")
            except Exception as e:
                print(f"[Warning] Failed loading forensic_ensemble.pkl: {e}")

        sp_ckpt = os.path.join(self.checkpoint_dir, "spatial_best.pt")
        if os.path.exists(sp_ckpt):
            try:
                self.spatial_model.load_state_dict(torch.load(sp_ckpt, map_location=self.device, weights_only=True))
            except Exception as e:
                print(f"[Warning] Failed loading spatial_best.pt: {e}")

        tm_ckpt = os.path.join(self.checkpoint_dir, "lstm_best.pt")
        if os.path.exists(tm_ckpt):
            try:
                self.temporal_model.load_state_dict(torch.load(tm_ckpt, map_location=self.device, weights_only=True))
            except Exception as e:
                print(f"[Warning] Failed loading lstm_best.pt: {e}")

        sy_ckpt = os.path.join(self.checkpoint_dir, "av_sync_best.pt")
        if os.path.exists(sy_ckpt):
            try:
                self.sync_model.load_state_dict(torch.load(sy_ckpt, map_location=self.device, weights_only=True))
            except Exception as e:
                print(f"[Warning] Failed loading av_sync_best.pt: {e}")

        fu_ckpt = os.path.join(self.checkpoint_dir, "fusion_best.pt")
        if os.path.exists(fu_ckpt):
            try:
                self.fusion_model.load_state_dict(torch.load(fu_ckpt, map_location=self.device, weights_only=True))
            except Exception as e:
                print(f"[Warning] Failed loading fusion_best.pt: {e}")

    def reload_checkpoints(self):
        """Reloads trained model weights from checkpoints directory."""
        self._load_checkpoints()
        self.spatial_model.eval()
        self.temporal_model.eval()
        self.audio_model.eval()
        self.sync_model.eval()
        self.fusion_model.eval()

    def analyze_video(
        self,
        video_path: str,
        output_dir: str = str(RESULTS_DIR),
        progress_callback: Optional[Callable[[str, int], None]] = None,
        analysis_id: Optional[str] = None
    ) -> Dict:
        start_time = time.time()
        os.makedirs(os.path.join(output_dir, "heatmaps"), exist_ok=True)

        def report(stage_name: str, pct: int):
            if progress_callback:
                progress_callback(stage_name, pct)

        report("extracting_frames", 10)
        metadata = self.vp.get_metadata(video_path)
        keyframes = self.vp.extract_keyframes(video_path)
        if not keyframes:
            raise ValueError("No frames could be extracted from video.")

        report("detecting_faces", 25)
        aligned_faces = []
        landmark_seq = []
        iris_seq = []
        spectral_list = []
        face_bboxes = []

        for kf in keyframes:
            rgb = kf["image_rgb"]
            det = self.fd.detect_primary_face(rgb)
            if det is not None:
                aligned = self.fa.align_face(rgb, det["bbox"], det["landmarks_5pt"])
                landmark_seq.append(det["all_landmarks_468"])
                iris_seq.append(det["iris_landmarks"])
                face_bboxes.append(det["bbox"])
            else:
                aligned = cv2.resize(rgb, (224, 224))
                landmark_seq.append(None)
                iris_seq.append(None)
                face_bboxes.append(None)

            aligned_faces.append(aligned)
            spec = SpectralAnalyzer.extract_spectral_features(aligned)
            spectral_list.append(spec)

        report("extracting_landmarks", 40)
        timestamps = [kf["timestamp"] for kf in keyframes]
        behavior_dict = MediaPipeFeatureExtractor.extract_sequence_behavior(
            landmark_seq, iris_seq, fps=metadata["fps"], duration=metadata.get("duration"), timestamps=timestamps
        )
        feat_f_matrix = torch.from_numpy(behavior_dict["feature_matrix"]).float().to(self.device)
        feat_f = torch.mean(feat_f_matrix, dim=0, keepdim=True)

        report("spatial_analysis", 55)
        faces_arr = np.stack(aligned_faces, axis=0)
        spec_arr = np.stack(spectral_list, axis=0)
        faces_t = torch.from_numpy(faces_arr).float().permute(0, 3, 1, 2).to(self.device) / 255.0
        spec_t = torch.from_numpy(spec_arr).float().to(self.device)

        with torch.no_grad():
            spatial_seq = self.spatial_model.extract_features(faces_t, spec_t)
            feat_v = torch.mean(spatial_seq, dim=0, keepdim=True)
            sp_logits = self.spatial_model.classifier(feat_v)
            spatial_score = float(torch.sigmoid(sp_logits).squeeze().item())

        report("temporal_analysis", 68)
        temp_seq = torch.cat([spatial_seq, feat_f_matrix], dim=-1).unsqueeze(0)  # (1, T, 1872)
        with torch.no_grad():
            temp_logits, feat_t, tm_frame_anom = self.temporal_model(temp_seq)
            temporal_score = float(torch.sigmoid(temp_logits).squeeze().item())

        report("audio_analysis", 78)
        audio_res = self.ap.extract_audio(video_path)
        has_audio = torch.tensor([1 if audio_res["has_audio"] else 0], device=self.device)
        wav_t = torch.from_numpy(audio_res["waveform"]).unsqueeze(0).to(self.device)
        with torch.no_grad():
            feat_a = self.audio_model.extract_features(wav_t, has_audio)
            audio_logits = self.audio_model.classifier(feat_a)
            audio_score = float(torch.sigmoid(audio_logits).squeeze().item()) if audio_res["has_audio"] else 0.08

        report("lip_sync_analysis", 85)
        feat_lip = feat_f
        with torch.no_grad():
            sync_logits, feat_s, sync_score_t = self.sync_model(feat_lip, feat_a, has_audio)
            sync_score = float(sync_score_t.squeeze().item())
            sync_status = self.sync_model.compute_sync_status(sync_score)

        report("multimodal_fusion", 92)
        # Extract features matching calibrated multi-stream ensemble
        fv_np = feat_v.squeeze(0).cpu().numpy()
        temp_seq_np = temp_seq.squeeze(0).cpu().numpy()  # (T, 1872)
        seq_spatial = temp_seq_np[:, :1792]
        temp_m = np.mean(seq_spatial, axis=0)
        temp_s = np.std(seq_spatial, axis=0)
        spectral_emb = fv_np[1792:1856]
        f_bio_np = temp_seq_np[:, 1856:].mean(axis=0)

        low_f = float(np.mean(spectral_emb[:16]) + 1e-6)
        high_f = float(np.mean(spectral_emb[32:]) + 1e-6)
        spec_ratio = float(high_f / low_f)
        spec_std = float(np.std(spectral_emb))
        spec_energy = float(np.sum(spectral_emb ** 2))

        diffs = np.diff(seq_spatial, axis=0)
        frame_velocity = float(np.mean(np.linalg.norm(diffs, axis=1)))
        frame_accel = float(np.std(np.linalg.norm(diffs, axis=1)))

        ear_seq = temp_seq_np[:, 1856]
        mar_seq = temp_seq_np[:, 1860]
        gaze_seq = temp_seq_np[:, 1861]
        ear_mean = float(np.mean(ear_seq))
        ear_var = float(np.var(ear_seq))
        mar_mean = float(np.mean(mar_seq))
        mar_var = float(np.var(mar_seq))
        mar_velocity = float(np.mean(np.abs(np.diff(mar_seq)))) if len(mar_seq) > 1 else 0.0
        gaze_var = float(np.var(gaze_seq))
        gaze_step = float(np.mean(np.abs(np.diff(gaze_seq)))) if len(gaze_seq) > 1 else 0.0
        has_a_float = 1.0 if audio_res["has_audio"] else 0.0

        phys_bio = np.array([
            spec_ratio, spec_std, spec_energy,
            frame_velocity, frame_accel,
            ear_mean, ear_var,
            mar_mean, mar_var, mar_velocity,
            gaze_var, gaze_step,
            has_a_float
        ])

        vis_vec = np.concatenate([
            temp_m[:512],
            temp_s[:512],
            spectral_emb,
            f_bio_np,
            phys_bio
        ])
        aud_vec = feat_a.squeeze(0).cpu().numpy()

        if self.ensemble is not None:
            p_vis = float(self.ensemble["visual_model"].predict_proba([vis_vec])[0, 1])
            if audio_res["has_audio"] and audio_res.get("duration", 0) >= 0.5:
                p_aud = float(self.ensemble["audio_model"].predict_proba([aud_vec])[0, 1])
                audio_score = p_aud
            else:
                p_aud = 0.0
                audio_score = 0.04

            # Calibrated Meta-Classifier
            if "meta_model" in self.ensemble and "meta_scaler" in self.ensemble:
                meta_feat = np.array([[
                    p_vis,
                    p_aud,
                    spatial_score,
                    temporal_score,
                    sync_score,
                    spec_ratio,
                    has_a_float,
                    max(p_vis, p_aud),
                    p_vis * p_aud,
                    abs(p_vis - p_aud)
                ]])
                meta_feat_s = self.ensemble["meta_scaler"].transform(meta_feat)
                prob_fake = float(self.ensemble["meta_model"].predict_proba(meta_feat_s)[0, 1])
            else:
                prob_fake = p_vis if not audio_res["has_audio"] else float(np.clip(0.6 * p_vis + 0.4 * p_aud, 0.02, 0.98))

            threshold = float(self.ensemble.get("threshold", 0.50))
            prob_fake = float(np.clip(prob_fake, 0.01, 0.99))
            confidence = prob_fake if prob_fake >= threshold else (1.0 - prob_fake)
            prediction = "FAKE" if prob_fake >= threshold else "REAL"
            spatial_score = float(np.clip(0.70 * p_vis + 0.30 * spatial_score, 0.02, 0.98))
        else:
            with torch.no_grad():
                logits, probs, modality_weights = self.fusion_model(feat_v, feat_t, feat_a, feat_s, feat_f, has_audio)
                prob_fake = float(probs.squeeze().item())
                confidence = prob_fake if prob_fake >= 0.5 else (1.0 - prob_fake)
                prediction = "FAKE" if prob_fake >= 0.5 else "REAL"

        # Frame anomalies: calibrated combining spatial and temporal sequence scores
        with torch.no_grad():
            frame_spatial_logits = self.spatial_model.classifier(spatial_seq)
            frame_spatial_probs = torch.sigmoid(frame_spatial_logits).squeeze(-1).cpu().numpy()
            tm_frame_anom_np = tm_frame_anom.squeeze(0).cpu().numpy()
            combined_frame_scores = 0.50 * frame_spatial_probs + 0.35 * tm_frame_anom_np + 0.15 * prob_fake
            frame_anomalies = np.clip(combined_frame_scores, 0.02, 0.98).tolist()

        report("explainability_gradcam", 96)
        # Create directory for this analysis's frames
        analysis_frames_dir = os.path.join(output_dir, "frames", analysis_id if analysis_id else "latest")
        os.makedirs(analysis_frames_dir, exist_ok=True)
        os.makedirs(os.path.join(output_dir, "heatmaps"), exist_ok=True)

        timeline = []
        heatmaps = []
        all_frames = []
        suspicious_frames = []

        is_fake_video = (prediction == "FAKE")
        SUSPICIOUS_THRESHOLD = 0.50
        sorted_indices = sorted(range(len(frame_anomalies)), key=lambda i: frame_anomalies[i], reverse=True)
        top_suspicious_indices = set(sorted_indices[:3]) if is_fake_video else set()
        primary_keyframe_idx = sorted_indices[0] if sorted_indices else 0

        for idx, kf in enumerate(keyframes):
            t_score = round(float(frame_anomalies[idx]), 3)
            if is_fake_video:
                is_suspicious = (t_score >= SUSPICIOUS_THRESHOLD) or (idx in top_suspicious_indices and t_score >= 0.35)
            else:
                is_suspicious = (t_score >= 0.65)  # Real videos strictly only flag if extreme outlier

            # Save aligned face crop
            frame_filename = f"frame_{kf['frame_idx']}.jpg"
            frame_file_path = os.path.join(analysis_frames_dir, frame_filename)
            cv2.imwrite(frame_file_path, cv2.cvtColor(aligned_faces[idx], cv2.COLOR_RGB2BGR))
            rel_frame_dir = os.path.basename(analysis_frames_dir)
            frame_url = f"/results/frames/{rel_frame_dir}/{frame_filename}"

            heatmap_url = None
            # Generate Grad-CAM for suspicious frames or primary keyframe
            should_generate_cam = is_suspicious or (idx in top_suspicious_indices) or (idx == primary_keyframe_idx)
            if should_generate_cam:
                single_face_t = faces_t[idx:idx+1]
                single_spec_t = spec_t[idx:idx+1]
                cam = self.gradcam.generate_heatmap(single_face_t, single_spec_t)
                _, overlay = GradCAM.overlay_heatmap(aligned_faces[idx], cam)

                prefix = f"{analysis_id}_" if analysis_id else ""
                cam_name = f"{prefix}heatmap_frame_{kf['frame_idx']}.jpg"
                cam_path = os.path.join(output_dir, "heatmaps", cam_name)
                cv2.imwrite(cam_path, cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
                heatmap_url = f"/results/heatmaps/{cam_name}"

                heatmaps.append({
                    "frame": kf["frame_idx"],
                    "timestamp": kf["timestamp"],
                    "anomaly_score": t_score,
                    "image_url": heatmap_url
                })

            ear_val = float(behavior_dict["feature_matrix"][idx][0]) if idx < len(behavior_dict["feature_matrix"]) else 0.2
            mar_val = float(behavior_dict["feature_matrix"][idx][4]) if idx < len(behavior_dict["feature_matrix"]) else 0.05

            frame_entry = {
                "frame": kf["frame_idx"],
                "timestamp": kf["timestamp"],
                "anomaly_score": t_score,
                "is_suspicious": is_suspicious,
                "status": "Suspicious" if is_suspicious else "Normal",
                "frame_url": frame_url,
                "heatmap_url": heatmap_url,
                "ear": round(ear_val, 3),
                "mar": round(mar_val, 3)
            }

            all_frames.append(frame_entry)
            if is_suspicious:
                suspicious_frames.append(frame_entry)

            timeline.append({
                "frame": kf["frame_idx"],
                "timestamp": kf["timestamp"],
                "anomaly_score": t_score
            })

        report("completed", 100)
        total_time = round(time.time() - start_time, 2)

        return {
            "prediction": prediction,
            "confidence": round(confidence, 4),
            "prob_fake": round(prob_fake, 4),
            "processing_time": total_time,
            "metadata": metadata,
            "spatial": {
                "score": round(spatial_score, 3)
            },
            "temporal": {
                "score": round(temporal_score, 3)
            },
            "audio": {
                "score": round(audio_score, 3),
                "has_audio": audio_res["has_audio"],
                "duration": audio_res["duration"]
            },
            "sync": {
                "score": round(sync_score, 3),
                "status": sync_status
            },
            "facial_behavior": {
                "blink": round(behavior_dict["blink"]["blink_anomaly_score"], 3),
                "gaze": round(behavior_dict["gaze"]["gaze_anomaly_score"], 3),
                "lip": round(behavior_dict["lip"]["lip_anomaly_score"], 3),
                "mean_ear": behavior_dict["blink"]["mean_ear"],
                "mean_mar": behavior_dict["lip"]["mean_mar"]
            },
            "timeline": timeline,
            "heatmaps": heatmaps,
            "all_frames": all_frames,
            "suspicious_frames": suspicious_frames
        }
