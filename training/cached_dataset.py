"""
Cached Forensic Feature Dataset for high-speed PyTorch training.
Loads pre-extracted spatial, temporal, acoustic, sync, and behavioral features.
"""

import os
import json
import torch
from torch.utils.data import Dataset
from typing import List, Dict

class CachedForensicDataset(Dataset):
    def __init__(self, index_json: str, split: str = "train"):
        with open(index_json, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.samples = data.get(split, [])

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        item = self.samples[idx]
        feat_path = item["feature_path"]
        data = torch.load(feat_path, weights_only=False)

        return {
            "label": torch.tensor(data["label"], dtype=torch.float32),
            "has_audio": torch.tensor(1.0 if data.get("has_audio", False) else 0.0, dtype=torch.float32),
            "feat_v": data["feat_v"],                               # (1856,)
            "temporal_input_seq": data["temporal_input_seq"],       # (20, 1872)
            "feat_a": data["feat_a"],                               # (768,)
            "feat_lip": data["feat_lip"],                           # (16,)
            "feat_f": data["feat_f"]                                # (16,)
        }
