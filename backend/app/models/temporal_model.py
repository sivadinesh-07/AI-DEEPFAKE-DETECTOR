"""
Bi-LSTM Temporal Inconsistency Modeling.
Processes sequences of frame-level spatial, spectral, and behavioral biometric representations.
Outputs sequence-level temporal representation (512-dim) and frame-level anomaly scores.
"""

import torch
import torch.nn as nn
from typing import Tuple, Dict

class BiLSTMTemporalModel(nn.Module):
    def __init__(
        self,
        input_dim: int = 1872,   # 1856 (spatial-spectral) + 16 (behavioral biometrics)
        hidden_dim: int = 256,
        num_layers: int = 2,
        dropout: float = 0.3,
        num_classes: int = 1
    ):
        super().__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers

        # Input feature projection
        self.input_proj = nn.Sequential(
            nn.LayerNorm(input_dim),
            nn.Linear(input_dim, 512),
            nn.LayerNorm(512),
            nn.SiLU(),
            nn.Dropout(dropout)
        )

        # Bidirectional LSTM
        self.lstm = nn.LSTM(
            input_size=512,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if num_layers > 1 else 0.0
        )

        self.temporal_dim = hidden_dim * 2  # 512

        # Frame-level anomaly projection
        self.frame_anomaly_head = nn.Sequential(
            nn.Linear(self.temporal_dim, 64),
            nn.SiLU(),
            nn.Linear(64, 1)
        )

        # Sequence classification head (for Stage 2)
        self.sequence_classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(self.temporal_dim, 128),
            nn.SiLU(),
            nn.Dropout(dropout * 0.5),
            nn.Linear(128, num_classes)
        )

    def forward(self, x_seq: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        x_seq: (B, T, input_dim)
        Returns:
          seq_logits: (B, 1)
          temporal_repr: (B, 512)
          frame_anomaly_scores: (B, T)
        """
        # Project
        proj = self.input_proj(x_seq)  # (B, T, 512)

        # LSTM
        lstm_out, _ = self.lstm(proj)  # (B, T, 512)

        # Frame-level anomaly scores
        frame_logits = self.frame_anomaly_head(lstm_out).squeeze(-1)  # (B, T)
        frame_anomaly = torch.sigmoid(frame_logits)

        # Sequence-level pooling (temporal mean pooling)
        temporal_repr = torch.mean(lstm_out, dim=1)  # (B, 512)

        # Sequence classification
        seq_logits = self.sequence_classifier(temporal_repr)  # (B, 1)

        return seq_logits, temporal_repr, frame_anomaly
