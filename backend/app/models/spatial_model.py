"""
Spatial & Spectral Deepfake Detection Model.
Combines torchvision EfficientNet-B4 (1792-dim) with 2D FFT Spectral Residuals (64-dim).
Total feature representation: 1856-dim.
"""

import torch
import torch.nn as nn
import torchvision.models as models
from torchvision.models import EfficientNet_B4_Weights
import numpy as np
from typing import Tuple, Optional
from backend.app.features.spectral_features import SpectralAnalyzer

class SpatialSpectralModel(nn.Module):
    def __init__(self, pretrained: bool = True, num_classes: int = 1, dropout: float = 0.3):
        super().__init__()
        weights = EfficientNet_B4_Weights.DEFAULT if pretrained else None
        base_model = models.efficientnet_b4(weights=weights)
        
        # Convolutional stages for Grad-CAM
        self.features = base_model.features
        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))

        self.spatial_dim = 1792
        self.spectral_dim = 64
        self.total_dim = self.spatial_dim + self.spectral_dim

        # Classifier head for standalone spatial stage
        self.classifier = nn.Sequential(
            nn.LayerNorm(self.total_dim),
            nn.Dropout(p=dropout),
            nn.Linear(self.total_dim, 256),
            nn.LayerNorm(256),
            nn.SiLU(),
            nn.Dropout(p=dropout * 0.5),
            nn.Linear(256, num_classes)
        )

        # ImageNet normalization parameters
        self.register_buffer("mean", torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1))
        self.register_buffer("std", torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1))

    def extract_features(self, x_rgb: torch.Tensor, spectral_vec: Optional[torch.Tensor] = None) -> torch.Tensor:
        """
        Extracts combined (1856-dim) spatial-spectral features.
        x_rgb: (B, 3, 224, 224) in range [0, 1]
        spectral_vec: Optional (B, 64)
        """
        # Normalize
        x = (x_rgb - self.mean) / self.std
        
        # Spatial conv features
        feat_map = self.features(x)
        spatial_emb = self.avgpool(feat_map)
        spatial_emb = torch.flatten(spatial_emb, 1)  # (B, 1792)

        if spectral_vec is None:
            # Fallback zero spectral
            spectral_vec = torch.zeros((x_rgb.size(0), self.spectral_dim), device=x_rgb.device)

        fused_spatial = torch.cat([spatial_emb, spectral_vec], dim=1)  # (B, 1856)
        return fused_spatial

    def forward(self, x_rgb: torch.Tensor, spectral_vec: Optional[torch.Tensor] = None) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Returns (logits, features)
        logits: (B, 1)
        features: (B, 1856)
        """
        features = self.extract_features(x_rgb, spectral_vec)
        logits = self.classifier(features)
        return logits, features

    @classmethod
    def preprocess_numpy(cls, face_rgb: np.ndarray, device: torch.device) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Helper for single frame or batch of numpy images (H, W, 3) in [0, 255]
        """
        spectral = SpectralAnalyzer.extract_spectral_features(face_rgb)
        spec_tensor = torch.from_numpy(spectral).unsqueeze(0).to(device)

        face_t = torch.from_numpy(face_rgb).float().permute(2, 0, 1) / 255.0
        face_t = face_t.unsqueeze(0).to(device)

        return face_t, spec_tensor
