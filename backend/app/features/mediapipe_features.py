"""
MediaPipe Features Integrator:
Extracts unified 16-dimensional behavioral biometric vector:
  [EAR, MAR, Left_Gaze_H, Right_Gaze_H, Gaze_Div, Velocity_MAR, Accel_MAR, Blink_Score, Gaze_Score, Lip_Score, ...]
"""

import numpy as np
from typing import Dict, List, Optional
from backend.app.features.blink_features import BlinkAnalyzer
from backend.app.features.gaze_features import GazeAnalyzer
from backend.app.features.lip_features import LipAnalyzer

class MediaPipeFeatureExtractor:
    @classmethod
    def extract_frame_behavior(cls, landmarks: np.ndarray, iris_landmarks: Optional[np.ndarray]) -> np.ndarray:
        """
        Extracts a compact 16-dimensional behavioral descriptor for a single frame.
        """
        if landmarks is None or len(landmarks) < 468:
            return np.zeros(16, dtype=np.float32)

        ear_l = BlinkAnalyzer.compute_ear(landmarks, BlinkAnalyzer.LEFT_EYE)
        ear_r = BlinkAnalyzer.compute_ear(landmarks, BlinkAnalyzer.RIGHT_EYE)
        ear_mean = (ear_l + ear_r) / 2.0

        mar = LipAnalyzer.compute_mar(landmarks)
        gaze = GazeAnalyzer.compute_gaze_ratio(landmarks, iris_landmarks)

        # Facial geometry key distances
        nose_chin = float(np.linalg.norm(landmarks[4][:2] - landmarks[152][:2])) / 100.0
        inter_eye = float(np.linalg.norm(landmarks[33][:2] - landmarks[263][:2])) / 100.0
        jaw_width = float(np.linalg.norm(landmarks[234][:2] - landmarks[454][:2])) / 100.0

        vec = np.array([
            ear_mean,
            ear_l,
            ear_r,
            abs(ear_l - ear_r),
            mar,
            gaze["left_h"],
            gaze["right_h"],
            gaze["divergence"],
            nose_chin,
            inter_eye,
            jaw_width,
            landmarks[1][2],   # Nose tip depth Z
            landmarks[13][2],  # Lip top depth Z
            landmarks[14][2],  # Lip bottom depth Z
            landmarks[33][2],  # Left eye corner Z
            landmarks[263][2]  # Right eye corner Z
        ], dtype=np.float32)

        return vec

    @classmethod
    def extract_sequence_behavior(
        cls,
        landmark_seq: List[np.ndarray],
        iris_seq: List[Optional[np.ndarray]],
        fps: float = 25.0,
        duration: Optional[float] = None,
        timestamps: Optional[List[float]] = None
    ) -> Dict:
        """
        Extracts sequence-level temporal behavior summaries and frame-wise feature tensors.
        """
        frame_vectors = [cls.extract_frame_behavior(lms, iris) for lms, iris in zip(landmark_seq, iris_seq)]
        frame_matrix = np.stack(frame_vectors, axis=0)  # Shape: (T, 16)

        blink_summary = BlinkAnalyzer.analyze_sequence(landmark_seq, fps=fps, duration=duration, timestamps=timestamps)
        gaze_summary = GazeAnalyzer.analyze_sequence(landmark_seq, iris_seq)
        lip_summary = LipAnalyzer.analyze_sequence(landmark_seq)

        combined_anomaly = float(np.mean([
            blink_summary["blink_anomaly_score"],
            gaze_summary["gaze_anomaly_score"],
            lip_summary["lip_anomaly_score"]
        ]))

        return {
            "feature_matrix": frame_matrix,
            "blink": blink_summary,
            "gaze": gaze_summary,
            "lip": lip_summary,
            "overall_behavior_anomaly": round(combined_anomaly, 3)
        }
