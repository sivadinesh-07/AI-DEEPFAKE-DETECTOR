"""
Frame Sampler utility: Samples a fixed number of keyframes uniformly across a video.
"""

from typing import List
import numpy as np

class FrameSampler:
    @staticmethod
    def get_uniform_indices(total_frames: int, num_samples: int = 20) -> List[int]:
        """
        Returns a list of uniformly spaced frame indices across total_frames.
        Ensures deterministic temporal sampling.
        """
        if total_frames <= 0:
            return []
        if total_frames <= num_samples:
            return list(range(total_frames))
        
        # Uniform linspace
        indices = np.linspace(0, total_frames - 1, num_samples, dtype=int)
        return indices.tolist()
