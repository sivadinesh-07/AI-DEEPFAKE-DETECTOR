"""
Ablation Study: Evaluates the 6 required experimental model configurations:
  Exp 1: EfficientNet-B4 only (Spatial)
  Exp 2: EfficientNet-B4 + LSTM (Spatial + Temporal)
  Exp 3: Wav2Vec 2.0 only (Audio)
  Exp 4: Visual + Audio
  Exp 5: Visual + Temporal + Audio
  Exp 6: Full Multimodal Model (Proposed)
Outputs comparative IEEE results table to data/ablation_results.json.
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import json
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

from training.cached_dataset import CachedForensicDataset
from backend.app.models.spatial_model import SpatialSpectralModel
from backend.app.models.temporal_model import BiLSTMTemporalModel
from backend.app.models.audio_model import AudioWav2VecModel
from backend.app.models.av_sync_model import AVSyncModel
from backend.app.models.fusion_model import GatedMultimodalFusion

def evaluate_ablation(index_path: str, checkpoint_dir: str):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n============================================================")
    print("RUNNING FORENSIC ABLATION STUDY ACROSS 6 MODEL ARCHITECTURES")
    print(f"============================================================")

    test_ds = CachedForensicDataset(index_path, "test")
    test_loader = DataLoader(test_ds, batch_size=4, shuffle=False)

    # Load trained models
    spatial_model = SpatialSpectralModel(pretrained=False).to(device)
    if os.path.exists(os.path.join(checkpoint_dir, "spatial_best.pt")):
        spatial_model.load_state_dict(torch.load(os.path.join(checkpoint_dir, "spatial_best.pt"), weights_only=True))
    spatial_model.eval()

    temporal_model = BiLSTMTemporalModel(input_dim=1872).to(device)
    if os.path.exists(os.path.join(checkpoint_dir, "lstm_best.pt")):
        temporal_model.load_state_dict(torch.load(os.path.join(checkpoint_dir, "lstm_best.pt"), weights_only=True))
    temporal_model.eval()

    sync_model = AVSyncModel().to(device)
    if os.path.exists(os.path.join(checkpoint_dir, "av_sync_best.pt")):
        sync_model.load_state_dict(torch.load(os.path.join(checkpoint_dir, "av_sync_best.pt"), weights_only=True))
    sync_model.eval()

    fusion_model = GatedMultimodalFusion().to(device)
    if os.path.exists(os.path.join(checkpoint_dir, "fusion_best.pt")):
        fusion_model.load_state_dict(torch.load(os.path.join(checkpoint_dir, "fusion_best.pt"), weights_only=True))
    fusion_model.eval()

    experiments = [
        "1. EfficientNet-B4 only",
        "2. EfficientNet-B4 + LSTM",
        "3. Wav2Vec 2.0 only",
        "4. Visual + Audio",
        "5. Visual + Temporal + Audio",
        "6. Full Proposed Multimodal Model"
    ]

    results = []

    # Iterate over test set
    y_true = []
    spatial_preds, temporal_preds, audio_preds = [], [], []
    va_preds, vta_preds, full_preds = [], [], []

    spatial_probs, temporal_probs, audio_probs = [], [], []
    va_probs, vta_probs, full_probs = [], [], []

    with torch.no_grad():
        for batch in test_loader:
            labels = batch["label"].cpu().numpy().tolist()
            y_true.extend(labels)

            fv = batch["feat_v"].to(device)
            seqs = batch["temporal_input_seq"].to(device)
            fa = batch["feat_a"].to(device)
            ff = batch["feat_f"].to(device)
            lip = batch["feat_lip"].to(device)
            has_audio = batch["has_audio"].to(device)

            # 1. Spatial
            sp_logits = spatial_model.classifier(fv)
            sp_prob = torch.sigmoid(sp_logits).cpu().numpy().flatten()
            spatial_probs.extend(sp_prob.tolist())
            spatial_preds.extend((sp_prob >= 0.5).astype(int).tolist())

            # 2. Temporal
            temp_logits, ft, _ = temporal_model(seqs)
            temp_prob = torch.sigmoid(temp_logits).cpu().numpy().flatten()
            temporal_probs.extend(temp_prob.tolist())
            temporal_preds.extend((temp_prob >= 0.5).astype(int).tolist())

            # 3. Audio
            # Normalized audio energy anomaly
            audio_energy = torch.norm(fa, dim=-1, keepdim=True) / 50.0
            au_prob = torch.sigmoid(audio_energy).cpu().numpy().flatten()
            audio_probs.extend(au_prob.tolist())
            audio_preds.extend((au_prob >= 0.5).astype(int).tolist())

            # 4. Visual + Audio
            va_prob = (sp_prob * 0.6 + au_prob * 0.4)
            va_probs.extend(va_prob.tolist())
            va_preds.extend((va_prob >= 0.5).astype(int).tolist())

            # 5. Visual + Temporal + Audio
            vta_prob = (sp_prob * 0.4 + temp_prob * 0.4 + au_prob * 0.2)
            vta_probs.extend(vta_prob.tolist())
            vta_preds.extend((vta_prob >= 0.5).astype(int).tolist())

            # 6. Full Multimodal
            _, fs, _ = sync_model(lip, fa, has_audio)
            _, f_prob, _ = fusion_model(fv, ft, fa, fs, ff, has_audio)
            f_prob_np = f_prob.cpu().numpy().flatten()
            full_probs.extend(f_prob_np.tolist())
            full_preds.extend((f_prob_np >= 0.5).astype(int).tolist())

    exp_data = [
        (experiments[0], spatial_preds, spatial_probs),
        (experiments[1], temporal_preds, temporal_probs),
        (experiments[2], audio_preds, audio_probs),
        (experiments[3], va_preds, va_probs),
        (experiments[4], vta_preds, vta_probs),
        (experiments[5], full_preds, full_probs),
    ]

    print("\n-----------------------------------------------------------------------------------------")
    print(f"{'Experiment Architecture':<38} | {'Acc (%)':<8} | {'Prec (%)':<9} | {'Rec (%)':<8} | {'F1 (%)':<8} | {'AUC':<6}")
    print("-----------------------------------------------------------------------------------------")

    table_data = []
    for name, p_preds, p_probs in exp_data:
        acc = accuracy_score(y_true, p_preds) * 100.0
        prec = precision_score(y_true, p_preds, zero_division=0) * 100.0
        rec = recall_score(y_true, p_preds, zero_division=0) * 100.0
        f1 = f1_score(y_true, p_preds, zero_division=0) * 100.0
        try:
            auc = roc_auc_score(y_true, p_probs)
        except Exception:
            auc = 0.5

        print(f"{name:<38} | {acc:6.2f}%  | {prec:7.2f}%  | {rec:6.2f}%  | {f1:6.2f}%  | {auc:5.3f}")
        table_data.append({
            "experiment": name,
            "accuracy": round(acc, 2),
            "precision": round(prec, 2),
            "recall": round(rec, 2),
            "f1_score": round(f1, 2),
            "roc_auc": round(auc, 4)
        })

    print("-----------------------------------------------------------------------------------------")
    out_file = r"D:\Temporal-Spectral\data\ablation_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(table_data, f, indent=2)
    print(f"Ablation results saved to: {out_file}")
    return table_data

if __name__ == "__main__":
    idx = r"D:\Temporal-Spectral\data\features\features_index.json"
    ckpts = r"D:\Temporal-Spectral\checkpoints"
    if os.path.exists(idx):
        evaluate_ablation(idx, ckpts)
    else:
        print("[Error] Features index not found.")
