"""
Lip Movement and Mouth Dynamics Analysis Module.
Measures Mouth Aspect Ratio (MAR), lip velocity, acceleration, and articulatory deformation.
"""

import numpy as np
from typing import Dict, List

class LipAnalyzer:
    # Key MediaPipe lip landmarks
    # Outer corners: 61 (left), 291 (right)
    # Inner lip vertical: 13 (upper inner), 14 (lower inner)
    # Outer lip vertical: 0 (upper outer), 17 (lower outer)
    LIP_LEFT_CORNER = 61
    LIP_RIGHT_CORNER = 291
    LIP_TOP_INNER = 13
    LIP_BOTTOM_INNER = 14
    LIP_TOP_OUTER = 0
    LIP_BOTTOM_OUTER = 17

    @classmethod
    def compute_mar(cls, landmarks: np.ndarray) -> float:
        """
        Computes MAR = ||p_top - p_bottom|| / (2 * ||p_left - p_right||)
        """
        if landmarks is None or len(landmarks) < 468:
            return 0.0

        p_top = landmarks[cls.LIP_TOP_INNER][:2]
        p_bottom = landmarks[cls.LIP_BOTTOM_INNER][:2]
        p_left = landmarks[cls.LIP_LEFT_CORNER][:2]
        p_right = landmarks[cls.LIP_RIGHT_CORNER][:2]

        v = np.linalg.norm(p_top - p_bottom)
        h = np.linalg.norm(p_left - p_right)

        if h < 1e-6:
            return 0.0
        return float(v / (2.0 * h))

    @classmethod
    def analyze_sequence(cls, landmark_seq: List[np.ndarray]) -> Dict:
        """
        Analyzes lip movement dynamics across a sequence of frames.
        Returns MAR sequence, velocity derivatives, and mouth movement anomaly score.
        """
        mar_list = [cls.compute_mar(lms) for lms in landmark_seq]
        mar_arr = np.array(mar_list, dtype=np.float32)

        # Velocity: first derivative of MAR
        velocities = np.diff(mar_arr) if len(mar_arr) > 1 else np.array([0.0])
        accelerations = np.diff(velocities) if len(velocities) > 1 else np.array([0.0])

        mean_mar = float(np.mean(mar_arr)) if len(mar_arr) > 0 else 0.0
        mar_variance = float(np.var(mar_arr)) if len(mar_arr) > 0 else 0.0
        max_velocity = float(np.max(np.abs(velocities))) if len(velocities) > 0 else 0.0

        # Anomaly detection: Wav2Lip and SadTalker often produce unnatural sudden jerky lip motions (high velocity)
        # or completely static robotic mouth shapes during speech.
        if max_velocity > 0.45:
            lip_anomaly = 0.88  # Unnatural boundary snapping/flicker
        elif mar_variance < 0.0001:
            lip_anomaly = 0.72  # Unnatural frozen mouth
        else:
            lip_anomaly = 0.18  # Smooth organic articulatory transition

        return {
            "mar_seq": [round(float(m), 4) for m in mar_list],
            "velocities": [round(float(v), 4) for v in velocities],
            "mean_mar": round(mean_mar, 4),
            "mar_variance": round(mar_variance, 6),
            "max_velocity": round(max_velocity, 4),
            "lip_anomaly_score": round(lip_anomaly, 3)
        }
