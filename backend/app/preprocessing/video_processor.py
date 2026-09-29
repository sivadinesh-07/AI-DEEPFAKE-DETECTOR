"""
Video Processor: Handles video validation, metadata inspection, and keyframe extraction.
"""

import os
from typing import Dict, List, Tuple
import cv2
import numpy as np
from backend.app.preprocessing.frame_sampler import FrameSampler

class VideoProcessor:
    SUPPORTED_EXTENSIONS = {'.mp4', '.avi', '.mov', '.mkv', '.webm'}

    def __init__(self, target_frames: int = 20):
        self.target_frames = target_frames

    def validate_video(self, video_path: str) -> Tuple[bool, str]:
        """
        Validates if file exists, has a supported video extension, and can be read by OpenCV.
        """
        if not os.path.exists(video_path):
            return False, f"File does not exist: {video_path}"

        ext = os.path.splitext(video_path)[1].lower()
        if ext not in self.SUPPORTED_EXTENSIONS:
            return False, f"Unsupported video extension '{ext}'. Supported: {self.SUPPORTED_EXTENSIONS}"

        if os.path.getsize(video_path) == 0:
            return False, "Video file is empty (0 bytes)."

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            cap.release()
            return False, "Could not open video file (corrupted or unreadable format)."

        count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        cap.release()

        if count <= 0:
            return False, "Video contains 0 playable frames."

        return True, "Valid video file."

    def get_metadata(self, video_path: str) -> Dict:
        """
        Returns video metadata dictionary: width, height, fps, total_frames, duration.
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Unable to read metadata from {video_path}")

        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = float(cap.get(cv2.CAP_PROP_FPS))
        if fps <= 0 or np.isnan(fps):
            fps = 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0.0
        cap.release()

        return {
            "filename": os.path.basename(video_path),
            "width": w,
            "height": h,
            "fps": round(fps, 2),
            "total_frames": total_frames,
            "duration": round(duration, 2)
        }

    def extract_keyframes(self, video_path: str) -> List[Dict]:
        """
        Extracts self.target_frames uniformly from video.
        Returns list of dicts:
          [
            {
              "frame_idx": int,
              "timestamp": float (seconds),
              "image_rgb": np.ndarray (H, W, 3) in RGB format
            },
            ...
          ]
        """
        is_valid, err = self.validate_video(video_path)
        if not is_valid:
            raise ValueError(f"Invalid video: {err}")

        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = float(cap.get(cv2.CAP_PROP_FPS))
        if fps <= 0 or np.isnan(fps):
            fps = 25.0

        sample_indices = set(FrameSampler.get_uniform_indices(total_frames, self.target_frames))
        
        extracted = []
        current_idx = 0

        while cap.isOpened() and len(extracted) < len(sample_indices):
            ret, frame = cap.read()
            if not ret:
                break
            if current_idx in sample_indices:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                timestamp = current_idx / fps
                extracted.append({
                    "frame_idx": current_idx,
                    "timestamp": round(timestamp, 3),
                    "image_rgb": rgb
                })
            current_idx += 1

        cap.release()
        return extracted
