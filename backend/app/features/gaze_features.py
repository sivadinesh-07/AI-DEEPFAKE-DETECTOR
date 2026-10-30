"""
Gaze and Iris Deviation Analysis Module.
Measures pupil alignment, fixation consistency, and asymmetric gaze drift across time.
"""

import numpy as np
from typing import Dict, List, Optional

class GazeAnalyzer:
    # Key eye boundary landmark indices
    LEFT_OUTER = 33
    LEFT_INNER = 133
    RIGHT_INNER = 362
    RIGHT_OUTER = 263

    @classmethod
    def compute_gaze_ratio(cls, landmarks: np.ndarray, iris_landmarks: Optional[np.ndarray]) -> Dict[str, float]:
        """
        Computes normalized horizontal & vertical iris ratios for left and right eye.
        Horizontal: 0.0 (looking far left) to 1.0 (looking far right), ~0.5 is centered.
        """
        if landmarks is None or len(landmarks) < 468:
            return {"left_h": 0.5, "left_v": 0.5, "right_h": 0.5, "right_v": 0.5, "divergence": 0.0}

        # If iris landmarks (468-477) are present, use iris center (468 for left, 473 for right)
        if iris_landmarks is not None and len(iris_landmarks) >= 10:
            left_pupil = iris_landmarks[0][:2]
            right_pupil = iris_landmarks[5][:2]
        else:
            # Approximate pupil via eye center
            left_pupil = (landmarks[159][:2] + landmarks[145][:2]) * 0.5
            right_pupil = (landmarks[386][:2] + landmarks[374][:2]) * 0.5

        l_outer = landmarks[cls.LEFT_OUTER][:2]
        l_inner = landmarks[cls.LEFT_INNER][:2]
        r_inner = landmarks[cls.RIGHT_INNER][:2]
        r_outer = landmarks[cls.RIGHT_OUTER][:2]

        l_width = max(np.linalg.norm(l_inner - l_outer), 1e-6)
        r_width = max(np.linalg.norm(r_outer - r_inner), 1e-6)

        left_h = float(np.linalg.norm(left_pupil - l_outer) / l_width)
        right_h = float(np.linalg.norm(right_pupil - r_inner) / r_width)
        divergence = float(abs(left_h - right_h))

        return {
            "left_h": round(left_h, 4),
            "left_v": 0.5,
            "right_h": round(right_h, 4),
            "right_v": 0.5,
            "divergence": round(divergence, 4)
        }

    @classmethod
    def analyze_sequence(cls, landmark_seq: List[np.ndarray], iris_seq: List[Optional[np.ndarray]]) -> Dict:
        """
        Computes temporal gaze stability and inter-ocular alignment anomaly score.
        """
        if not landmark_seq:
            return {
                "mean_divergence": 0.0,
                "gaze_variance": 0.0,
                "gaze_anomaly_score": 0.5,
                "gaze_seq": []
            }

        divergences = []
        gaze_vectors = []

        for lms, iris in zip(landmark_seq, iris_seq):
            gaze = cls.compute_gaze_ratio(lms, iris)
            div = float(gaze.get("divergence", abs(gaze.get("left_h", 0.5) - gaze.get("right_h", 0.5))))
            divergences.append(div)
            gaze_vectors.append([float(gaze.get("left_h", 0.5)), float(gaze.get("right_h", 0.5))])

        div_arr = np.array(divergences, dtype=np.float32)
        mean_div = float(np.mean(div_arr)) if len(div_arr) > 0 else 0.0
        gaze_variance = float(np.var(gaze_vectors)) if len(gaze_vectors) > 0 else 0.0

        # Forensic anomaly: Continuous modeling of inter-ocular divergence and unnatural frozen/jittery fixation
        div_factor = float(1.0 / (1.0 + np.exp(np.clip(-14.0 * (mean_div - 0.28), -50.0, 50.0))))
        frozen_factor = float(1.0 / (1.0 + np.exp(np.clip(35000.0 * (gaze_variance - 0.00015), -50.0, 50.0))))
        jitter_factor = float(1.0 / (1.0 + np.exp(np.clip(-120.0 * (gaze_variance - 0.02), -50.0, 50.0))))
        combined_anomaly = max(div_factor, frozen_factor, jitter_factor)
        gaze_anomaly = float(np.clip(0.12 + 0.76 * combined_anomaly, 0.05, 0.95))

        return {
            "mean_divergence": round(mean_div, 4),
            "gaze_variance": round(gaze_variance, 6),
            "gaze_anomaly_score": round(gaze_anomaly, 3),
            "gaze_seq": gaze_vectors
        }
