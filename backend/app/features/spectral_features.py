"""
Spectral FFT Analysis:
Extracts 2D Fast Fourier Transform (FFT) Azimuthal Power Spectrum features from face crops.
Deepfake generators (GANs, diffusion models) introduce unnatural high-frequency periodic grid artifacts.
"""

import numpy as np
import cv2
from typing import Tuple

class SpectralAnalyzer:
    @staticmethod
    def azimuthal_average(image_2d: np.ndarray, num_bins: int = 64) -> np.ndarray:
        """
        Computes the radially averaged power spectrum profile (azimuthal average).
        """
        h, w = image_2d.shape
        center_y, center_x = h // 2, w // 2

        # Coordinate grid
        y, x = np.indices((h, w))
        r = np.sqrt((x - center_x) ** 2 + (y - center_y) ** 2)

        max_radius = min(center_x, center_y)
        bin_edges = np.linspace(0, max_radius, num_bins + 1)
        radial_profile = np.zeros(num_bins, dtype=np.float32)

        for i in range(num_bins):
            mask = (r >= bin_edges[i]) & (r < bin_edges[i + 1])
            if np.any(mask):
                radial_profile[i] = float(np.mean(image_2d[mask]))

        return radial_profile

    @classmethod
    def extract_spectral_features(cls, face_rgb: np.ndarray, num_bins: int = 64) -> np.ndarray:
        """
        Takes a 224x224 RGB face crop, applies 2D FFT with shifted DC component,
        and computes the log magnitude azimuthal average across all channels.
        Returns a 64-dimensional spectral vector.
        """
        # Convert to grayscale
        gray = cv2.cvtColor(face_rgb, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0

        # Apply Hanning window to reduce boundary discontinuity artifacts
        h, w = gray.shape
        window = np.outer(np.hanning(h), np.hanning(w))
        windowed_gray = gray * window

        # 2D FFT
        fft2 = np.fft.fft2(windowed_gray)
        fft_shift = np.fft.fftshift(fft2)
        magnitude = np.abs(fft_shift)
        log_magnitude = np.log1p(magnitude)

        # Azimuthal average
        profile = cls.azimuthal_average(log_magnitude, num_bins=num_bins)

        # Normalize L2
        norm = np.linalg.norm(profile)
        if norm > 1e-6:
            profile = profile / norm

        return profile.astype(np.float32)

    @classmethod
    def compute_spectral_anomaly(cls, profile: np.ndarray) -> float:
        """
        Computes high-frequency spectral artifact ratio.
        Deepfakes exhibit prominent high-frequency energy due to upsampling and GAN synthesis.
        """
        if len(profile) < 64:
            return 0.20
        high_freq = float(np.mean(profile[32:]))
        low_freq = float(np.mean(profile[:16])) + 1e-6
        ratio = high_freq / low_freq
        # Rescale ratio to [0.05, 0.95]
        score = float(np.clip((ratio - 0.08) / 0.20, 0.08, 0.92))
        return round(score, 3)
