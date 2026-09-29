"""
Wav2Vec 2.0 Audio Deepfake Feature Extractor.
Extracts 768-dimensional speech representations from 16kHz audio waveforms using HuggingFace Transformers.
"""

import torch
import torch.nn as nn
from transformers import Wav2Vec2Model, Wav2Vec2Processor
from typing import Tuple, Dict

class AudioWav2VecModel(nn.Module):
    MODEL_ID = "facebook/wav2vec2-base-960h"

    def __init__(self, pretrained: bool = True, num_classes: int = 1, dropout: float = 0.3):
        super().__init__()
        self.feature_dim = 768

        if pretrained:
            self.wav2vec = Wav2Vec2Model.from_pretrained(self.MODEL_ID)
            # Freeze base feature extractor to preserve acoustic representations
            self.wav2vec.eval()
            for param in self.wav2vec.parameters():
                param.requires_grad = False
        else:
            # Fallback lightweight projection if offline/testing
            self.wav2vec = None

        # Acoustic classification head for Stage 3
        self.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(self.feature_dim, 128),
            nn.SiLU(),
            nn.Dropout(dropout * 0.5),
            nn.Linear(128, num_classes)
        )

    def extract_features(self, waveforms: torch.Tensor, has_audio_mask: torch.Tensor = None) -> torch.Tensor:
        """
        waveforms: (B, num_samples) at 16kHz
        Returns acoustic embeddings: (B, 768)
        """
        device = waveforms.device
        batch_size = waveforms.size(0)

        if self.wav2vec is not None:
            with torch.no_grad():
                outputs = self.wav2vec(waveforms)
                # outputs.last_hidden_state: (B, time_steps, 768)
                hidden = outputs.last_hidden_state
                # Global temporal mean pooling
                audio_emb = torch.mean(hidden, dim=1)  # (B, 768)
        else:
            audio_emb = torch.zeros((batch_size, self.feature_dim), device=device)

        # Zero out embeddings for completely silent / missing audio
        if has_audio_mask is not None:
            audio_emb = audio_emb * has_audio_mask.view(-1, 1).float()

        return audio_emb

    def forward(self, waveforms: torch.Tensor, has_audio_mask: torch.Tensor = None) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Returns:
          logits: (B, 1)
          audio_features: (B, 768)
        """
        features = self.extract_features(waveforms, has_audio_mask)
        logits = self.classifier(features)
        return logits, features
