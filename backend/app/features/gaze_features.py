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
            return {"left_h": 0.5, "left_v": 0.5, "right_h": 0.5, "right_v": 0.5}

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

        return {
            "left_h": round(left_h, 4),
            "right_h": round(right_h, 4),
            "divergence": round(abs(left_h - right_h), 4)
        }

    @classmethod
    def analyze_sequence(cls, landmark_seq: List[np.ndarray], iris_seq: List[Optional[np.ndarray]]) -> Dict:
        """
        Computes temporal gaze stability and inter-ocular alignment anomaly score.
        """
        divergences = []
        gaze_vectors = []

        for lms, iris in zip(landmark_seq, iris_seq):
            gaze = cls.compute_gaze_ratio(lms, iris)
            divergences.append(gaze["divergence"])
            gaze_vectors.append([gaze["left_h"], gaze["right_h"]])

        div_arr = np.array(divergences, dtype=np.float32)
        mean_div = float(np.mean(div_arr)) if len(div_arr) > 0 else 0.0
        gaze_variance = float(np.var(gaze_vectors)) if len(gaze_vectors) > 0 else 0.0

        # Forensic anomaly: High divergence between left and right eye or unnatural static fixation (0 variance)
        if mean_div > 0.35:
            gaze_anomaly = 0.82  # Unnatural strabismus / eye desynchronization
        elif gaze_variance < 0.0001:
            gaze_anomaly = 0.70  # Completely unnatural frozen gaze
        else:
            gaze_anomaly = 0.20  # Coherent conjugate gaze

        return {
            "mean_divergence": round(mean_div, 4),
            "gaze_variance": round(gaze_variance, 6),
            "gaze_anomaly_score": round(gaze_anomaly, 3),
            "gaze_seq": gaze_vectors
        }
