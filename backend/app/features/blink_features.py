"""
Eye-Blink Analysis Module: Computes Eye Aspect Ratio (EAR), blink frequency, and duration.
"""

import numpy as np
from typing import Dict, List

class BlinkAnalyzer:
    # MediaPipe 468 Landmark Indices for Eyes
    # Left eye: [p1: outer, p2: upper1, p3: upper2, p4: inner, p5: lower2, p6: lower1]
    LEFT_EYE = [33, 160, 158, 133, 153, 144]
    # Right eye:
    RIGHT_EYE = [362, 385, 387, 263, 373, 380]
    
    EAR_THRESHOLD = 0.20  # Below this threshold, eye is considered closed

    @classmethod
    def compute_ear(cls, landmarks: np.ndarray, eye_indices: List[int]) -> float:
        """
        Computes EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
        """
        p1 = landmarks[eye_indices[0]][:2]
        p2 = landmarks[eye_indices[1]][:2]
        p3 = landmarks[eye_indices[2]][:2]
        p4 = landmarks[eye_indices[3]][:2]
        p5 = landmarks[eye_indices[4]][:2]
        p6 = landmarks[eye_indices[5]][:2]

        v1 = np.linalg.norm(p2 - p6)
        v2 = np.linalg.norm(p3 - p5)
        h = np.linalg.norm(p1 - p4)

        if h < 1e-6:
            return 0.0
        return float((v1 + v2) / (2.0 * h))

    @classmethod
    def analyze_sequence(
        cls,
        landmark_seq: List[np.ndarray],
        fps: float = 25.0,
        duration: Optional[float] = None,
        timestamps: Optional[List[float]] = None
    ) -> Dict:
        """
        Analyzes a sequence of frames for blink dynamics across time.
        """
        if not landmark_seq:
            return {
                "ear_seq": [],
                "mean_ear": 0.0,
                "ear_variance": 0.0,
                "blink_count": 0,
                "blink_rate_per_min": 0.0,
                "blink_anomaly_score": 0.5
            }

        ear_list = []
        for lms in landmark_seq:
            if lms is None or len(lms) < 468:
                ear_list.append(cls.EAR_THRESHOLD + 0.05)
                continue
            left_ear = cls.compute_ear(lms, cls.LEFT_EYE)
            right_ear = cls.compute_ear(lms, cls.RIGHT_EYE)
            ear_list.append(float((left_ear + right_ear) / 2.0))

        ear_arr = np.array(ear_list, dtype=np.float32)
        mean_ear = float(np.mean(ear_arr))
        ear_variance = float(np.var(ear_arr)) if len(ear_arr) > 0 else 0.0

        # Detect blinks (transitions below threshold)
        is_closed = ear_arr < cls.EAR_THRESHOLD
        blink_count = 0
        in_blink = False
        for closed in is_closed:
            if closed and not in_blink:
                blink_count += 1
                in_blink = True
            elif not closed:
                in_blink = False

        if duration is not None and duration > 0:
            duration_sec = duration
        elif timestamps is not None and len(timestamps) > 1:
            duration_sec = max(0.1, timestamps[-1] - timestamps[0])
        else:
            duration_sec = len(ear_list) / max(fps, 1.0)

        blink_rate_per_min = (blink_count / duration_sec) * 60.0 if duration_sec > 0 else 0.0

        # Forensic anomaly score:
        # Healthy human blink rate is typically 12-25 blinks/min.
        # Deepfakes often have 0 blinks with near-zero EAR variance (frozen eyes).
        if duration_sec >= 4.0:
            if blink_rate_per_min < 1.0 and ear_variance < 0.00015:
                blink_anomaly = 0.85  # Frozen eyes over long duration (strong deepfake indicator)
            elif blink_rate_per_min < 2.0:
                blink_anomaly = 0.50 if ear_variance < 0.0003 else 0.25
            elif blink_rate_per_min > 45.0:
                blink_anomaly = 0.70  # Abnormally rapid/erratic blinking
            else:
                blink_anomaly = 0.15  # Normal human blink range
        else:
            # Short clip (< 4 seconds): humans naturally might not blink in 2-3s
            if ear_variance < 0.0001 and blink_count == 0:
                blink_anomaly = 0.72  # Completely static, unnaturally rigid eye landmarks
            else:
                blink_anomaly = 0.18  # Normal eye dynamics in short sample

        return {
            "ear_seq": [round(float(e), 4) for e in ear_list],
            "mean_ear": round(mean_ear, 4),
            "ear_variance": round(ear_variance, 6),
            "blink_count": blink_count,
            "blink_rate_per_min": round(blink_rate_per_min, 2),
            "blink_anomaly_score": round(blink_anomaly, 3)
        }
