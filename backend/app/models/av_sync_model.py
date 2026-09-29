"""
Audio-Visual Lip-Sync Analysis Module (AV-SyncNet).
Measures cross-modal synchrony and phoneme-viseme coherence between speech acoustics and mouth movement.
Outputs sync score (0.0 to 1.0), qualitative sync status, and a 64-dim cross-modal representation.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, Tuple

class AVSyncModel(nn.Module):
    def __init__(
        self,
        lip_input_dim: int = 16,     # Lip MAR dynamics & geometry
        audio_input_dim: int = 768,  # Wav2Vec 2.0 acoustic embedding
        proj_dim: int = 128,
        sync_feature_dim: int = 64
    ):
        super().__init__()
        
        # Lip motion encoder
        self.lip_encoder = nn.Sequential(
            nn.Linear(lip_input_dim, 64),
            nn.LayerNorm(64),
            nn.SiLU(),
            nn.Linear(64, proj_dim)
        )

        # Audio encoder
        self.audio_encoder = nn.Sequential(
            nn.Linear(audio_input_dim, 256),
            nn.LayerNorm(256),
            nn.SiLU(),
            nn.Linear(256, proj_dim)
        )

        # Cross-modal fusion projection for downstream classification
        self.fusion_proj = nn.Sequential(
            nn.Linear(proj_dim * 2 + 1, 128),
            nn.SiLU(),
            nn.Linear(128, sync_feature_dim)
        )

        # Synchrony classification head (Stage 4)
        self.classifier = nn.Sequential(
            nn.Linear(sync_feature_dim, 32),
            nn.SiLU(),
            nn.Linear(32, 1)
        )

        # Documented forensic thresholds
        self.THRESH_CONSISTENT = 0.65
        self.THRESH_MILD_MISMATCH = 0.40

    def compute_sync_status(self, sync_score: float) -> str:
        """
        Maps numerical sync score (0-1) to documented forensic status categories.
        """
        if sync_score >= self.THRESH_CONSISTENT:
            return "consistent"
        elif sync_score >= self.THRESH_MILD_MISMATCH:
            return "mild_mismatch"
        else:
            return "significant_mismatch"

    def forward(
        self,
        lip_features: torch.Tensor,
        audio_features: torch.Tensor,
        has_audio: torch.Tensor = None
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        lip_features: (B, lip_input_dim)
        audio_features: (B, audio_input_dim)
        Returns:
          logits: (B, 1)  (probability of sync manipulation)
          sync_feature: (B, 64)
          sync_score: (B, 1)  (normalized cosine similarity in [0, 1])
        """
        # Project both modalities to shared latent space
        z_lip = F.normalize(self.lip_encoder(lip_features), p=2, dim=-1)     # (B, proj_dim)
        z_audio = F.normalize(self.audio_encoder(audio_features), p=2, dim=-1) # (B, proj_dim)

        # Cosine similarity in range [-1.0, 1.0] -> mapped to [0.0, 1.0]
        cos_sim = torch.sum(z_lip * z_audio, dim=-1, keepdim=True)  # (B, 1)
        sync_score = (cos_sim + 1.0) / 2.0                          # (B, 1)

        # If video has no audio, set neutral sync score 0.5
        if has_audio is not None:
            mask = has_audio.view(-1, 1).float()
            sync_score = sync_score * mask + 0.5 * (1.0 - mask)

        # Cross-modal concatenated feature: [z_lip, z_audio, sync_score]
        concat_input = torch.cat([z_lip, z_audio, sync_score], dim=-1)  # (B, 257)
        sync_feature = self.fusion_proj(concat_input)                   # (B, 64)

        logits = self.classifier(sync_feature)

        return logits, sync_feature, sync_score
