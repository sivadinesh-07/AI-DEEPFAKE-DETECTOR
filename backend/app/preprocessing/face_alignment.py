"""
Face Alignment: Performs 5-point landmark similarity transformation to align and crop faces to 224x224.
"""

import cv2
import numpy as np
from typing import Tuple, Optional

class FaceAligner:
    def __init__(self, desired_size: int = 224, desired_left_eye: Tuple[float, float] = (0.35, 0.38)):
        self.desired_size = desired_size
        self.desired_left_eye = desired_left_eye
        self.desired_right_eye_x = 1.0 - desired_left_eye[0]

    def align_face(
        self,
        image_rgb: np.ndarray,
        bbox: Optional[Tuple[int, int, int, int]] = None,
        landmarks: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        Aligns and crops the face.
        If landmarks (left_eye, right_eye) are provided, computes affine rotation.
        Otherwise falls back to bounding box crop with margin and resize.
        """
        h, w = image_rgb.shape[:2]

        if landmarks is not None and len(landmarks) >= 2:
            # landmarks: [[eye_l_x, eye_l_y], [eye_r_x, eye_r_y], ...]
            left_eye = np.array(landmarks[0], dtype=np.float32)
            right_eye = np.array(landmarks[1], dtype=np.float32)

            # Compute eye angle
            d_y = right_eye[1] - left_eye[1]
            d_x = right_eye[0] - left_eye[0]
            angle = np.degrees(np.arctan2(d_y, d_x))

            # Desired eye distance
            desired_dist = (self.desired_right_eye_x - self.desired_left_eye[0]) * self.desired_size
            current_dist = np.sqrt((d_x ** 2) + (d_y ** 2))
            scale = desired_dist / max(current_dist, 1e-6)

            # Eye center
            eyes_center = ((left_eye[0] + right_eye[0]) // 2, (left_eye[1] + right_eye[1]) // 2)

            # Rotation matrix
            M = cv2.getRotationMatrix2D(eyes_center, angle, scale)

            # Translation
            t_x = self.desired_size * 0.5
            t_y = self.desired_size * self.desired_left_eye[1]
            M[0, 2] += (t_x - eyes_center[0])
            M[1, 2] += (t_y - eyes_center[1])

            aligned = cv2.warpAffine(
                image_rgb, M, (self.desired_size, self.desired_size),
                flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT_101
            )
            return aligned

        # Bounding box fallback
        if bbox is not None:
            x1, y1, x2, y2 = bbox
            bw, bh = x2 - x1, y2 - y1
            
            # 20% margin
            margin_x = int(bw * 0.15)
            margin_y = int(bh * 0.15)
            
            cx1 = max(0, x1 - margin_x)
            cy1 = max(0, y1 - margin_y)
            cx2 = min(w, x2 + margin_x)
            cy2 = min(h, y2 + margin_y)
            
            cropped = image_rgb[cy1:cy2, cx1:cx2]
            if cropped.size > 0:
                return cv2.resize(cropped, (self.desired_size, self.desired_size), interpolation=cv2.INTER_AREA)

        # Whole image resize fallback
        return cv2.resize(image_rgb, (self.desired_size, self.desired_size), interpolation=cv2.INTER_AREA)
