"""
Gated Multimodal Fusion Network and Classification Head.
Combines:
  1. Fv: Spatial & Spectral Features (1856-dim)
  2. Ft: Temporal Bi-LSTM Features (512-dim)
  3. Fa: Audio Wav2Vec 2.0 Features (768-dim)
  4. Fs: Audio-Visual Lip-Sync Features (64-dim)
  5. Ff: Behavioral Biometric Features (16-dim)
Total concatenated dimension: 3216-dim.
Uses Gated Multimodal Attention for adaptive cross-modal weighting.
"""

import torch
import torch.nn as nn
from typing import Dict, Tuple

class GatedMultimodalFusion(nn.Module):
    def __init__(
        self,
        dim_spatial: int = 1856,
        dim_temporal: int = 512,
        dim_audio: int = 768,
        dim_sync: int = 64,
        dim_behavior: int = 16,
        proj_dim: int = 128,
        dropout: float = 0.4,
        num_classes: int = 1
    ):
        super().__init__()
        self.proj_dim = proj_dim

        # Modality projection heads to uniform subspace
        self.proj_v = nn.Sequential(nn.LayerNorm(dim_spatial), nn.Linear(dim_spatial, proj_dim), nn.LayerNorm(proj_dim), nn.SiLU())
        self.proj_t = nn.Sequential(nn.LayerNorm(dim_temporal), nn.Linear(dim_temporal, proj_dim), nn.LayerNorm(proj_dim), nn.SiLU())
        self.proj_a = nn.Sequential(nn.LayerNorm(dim_audio), nn.Linear(dim_audio, proj_dim), nn.LayerNorm(proj_dim), nn.SiLU())
        self.proj_s = nn.Sequential(nn.LayerNorm(dim_sync), nn.Linear(dim_sync, proj_dim), nn.LayerNorm(proj_dim), nn.SiLU())
        self.proj_f = nn.Sequential(nn.LayerNorm(dim_behavior), nn.Linear(dim_behavior, proj_dim), nn.LayerNorm(proj_dim), nn.SiLU())

        # Gated Attention: Computes importance score for each of the 5 modalities
        self.gate_net = nn.Sequential(
            nn.Linear(proj_dim * 5, 128),
            nn.SiLU(),
            nn.Linear(128, 5),
            nn.Softmax(dim=-1)
        )

        # Fused classifier
        fused_dim = proj_dim * 5
        self.classifier = nn.Sequential(
            nn.Linear(fused_dim, 256),
            nn.LayerNorm(256),
            nn.SiLU(),
            nn.Dropout(dropout),
            nn.Linear(256, 64),
            nn.SiLU(),
            nn.Dropout(dropout * 0.5),
            nn.Linear(64, num_classes)
        )

    def forward(
        self,
        feat_v: torch.Tensor,
        feat_t: torch.Tensor,
        feat_a: torch.Tensor,
        feat_s: torch.Tensor,
        feat_f: torch.Tensor,
        has_audio: torch.Tensor = None
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        Returns:
          logits: (B, 1)
          probs: (B, 1)  (Probability of FAKE in [0, 1])
          modality_weights: (B, 5)  [weight_v, weight_t, weight_a, weight_s, weight_f]
        """
        h_v = self.proj_v(feat_v)  # (B, proj_dim)
        h_t = self.proj_t(feat_t)  # (B, proj_dim)
        h_a = self.proj_a(feat_a)  # (B, proj_dim)
        h_s = self.proj_s(feat_s)  # (B, proj_dim)
        h_f = self.proj_f(feat_f)  # (B, proj_dim)

        # If audio is missing, mask audio & sync representations
        if has_audio is not None:
            mask = has_audio.view(-1, 1).float()
            h_a = h_a * mask
            h_s = h_s * mask

        # Concatenate projected features
        all_proj = torch.cat([h_v, h_t, h_a, h_s, h_f], dim=-1)  # (B, proj_dim * 5)

        # Compute adaptive modality attention weights
        weights = self.gate_net(all_proj)  # (B, 5)

        # Scale each modality representation by its learned gate weight
        w_v = weights[:, 0:1]
        w_t = weights[:, 1:2]
        w_a = weights[:, 2:3]
        w_s = weights[:, 3:4]
        w_f = weights[:, 4:5]

        weighted_fusion = torch.cat([
            h_v * w_v,
            h_t * w_t,
            h_a * w_a,
            h_s * w_s,
            h_f * w_f
        ], dim=-1)  # (B, proj_dim * 5)

        # Classification
        logits = self.classifier(weighted_fusion)
        probs = torch.sigmoid(logits)

        return logits, probs, weights
