"""
Unified Forensic Training and Evaluation Pipeline.
Trains in stages:
  Stage 1: Spatial-Spectral Classifier
  Stage 2: Bi-LSTM Temporal Sequence Model
  Stage 3: Audio-Visual Lip-Sync Model
  Stage 4: Full Gated Multimodal Fusion Model
Evaluates metrics: Accuracy, Precision, Recall, F1, ROC-AUC, and Confusion Matrix.
Saves checkpoints to checkpoints/.
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import json
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
import numpy as np

from training.cached_dataset import CachedForensicDataset
from backend.app.models.spatial_model import SpatialSpectralModel
from backend.app.models.temporal_model import BiLSTMTemporalModel
from backend.app.models.av_sync_model import AVSyncModel
from backend.app.models.fusion_model import GatedMultimodalFusion
from backend.app.utils.paths import CHECKPOINTS_DIR, DATA_DIR

def compute_metrics(y_true, y_pred, y_probs):
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    try:
        auc = roc_auc_score(y_true, y_probs)
    except Exception:
        auc = 0.5
    cm = confusion_matrix(y_true, y_pred).tolist()
    return {
        "accuracy": round(float(acc), 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "f1_score": round(float(f1), 4),
        "roc_auc": round(float(auc), 4),
        "confusion_matrix": cm
    }

def train_forensic_pipeline(index_path: str, checkpoint_dir: str, epochs: int = 12, lr: float = 0.001):
    os.makedirs(checkpoint_dir, exist_ok=True)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n============================================================")
    print(f"TRAINING FORENSIC PIPELINE ON: {device}")
    print(f"============================================================")

    train_ds = CachedForensicDataset(index_path, "train")
    val_ds = CachedForensicDataset(index_path, "val")
    test_ds = CachedForensicDataset(index_path, "test")

    train_loader = DataLoader(train_ds, batch_size=8, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=8, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=8, shuffle=False)

    print(f"Dataset splits: Train={len(train_ds)}, Val={len(val_ds)}, Test={len(test_ds)}")

    criterion = nn.BCEWithLogitsLoss()

    # ------------------------------------------------------------
    # STAGE 1: Spatial Model Training (Genuine Pretrained Backbone)
    # ------------------------------------------------------------
    print("\n--- [STAGE 1: Spatial-Spectral Model Training] ---")
    spatial_model = SpatialSpectralModel(pretrained=True).to(device)
    opt_spatial = torch.optim.AdamW(spatial_model.classifier.parameters(), lr=lr, weight_decay=1e-3)

    best_val_loss = float('inf')
    for epoch in range(epochs):
        spatial_model.classifier.train()
        train_loss = 0.0
        for batch in train_loader:
            feats = batch["feat_v"].to(device)
            labels = batch["label"].to(device).view(-1, 1)
            opt_spatial.zero_grad()
            logits = spatial_model.classifier(feats)
            loss = criterion(logits, labels)
            loss.backward()
            opt_spatial.step()
            train_loss += loss.item()

        # Val
        spatial_model.classifier.eval()
        val_loss = 0.0
        with torch.no_grad():
            for batch in val_loader:
                feats = batch["feat_v"].to(device)
                labels = batch["label"].to(device).view(-1, 1)
                logits = spatial_model.classifier(feats)
                val_loss += criterion(logits, labels).item()

        val_loss = val_loss / max(1, len(val_loader))
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(spatial_model.state_dict(), os.path.join(checkpoint_dir, "spatial_best.pt"))

    print(f"  Stage 1 Spatial model trained. Checkpoint: spatial_best.pt (Best Val Loss: {best_val_loss:.4f})")

    # ------------------------------------------------------------
    # STAGE 2: Temporal Bi-LSTM Model Training
    # ------------------------------------------------------------
    print("\n--- [STAGE 2: Temporal Bi-LSTM Training] ---")
    temporal_model = BiLSTMTemporalModel(input_dim=1872).to(device)
    opt_temporal = torch.optim.AdamW(temporal_model.parameters(), lr=lr * 0.8, weight_decay=1e-3)

    best_val_loss = float('inf')
    for epoch in range(epochs):
        temporal_model.train()
        train_loss = 0.0
        for batch in train_loader:
            seqs = batch["temporal_input_seq"].to(device)
            labels = batch["label"].to(device).view(-1, 1)
            opt_temporal.zero_grad()
            seq_logits, _, _ = temporal_model(seqs)
            loss = criterion(seq_logits, labels)
            loss.backward()
            opt_temporal.step()
            train_loss += loss.item()

        temporal_model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for batch in val_loader:
                seqs = batch["temporal_input_seq"].to(device)
                labels = batch["label"].to(device).view(-1, 1)
                seq_logits, _, _ = temporal_model(seqs)
                val_loss += criterion(seq_logits, labels).item()

        val_loss = val_loss / max(1, len(val_loader))
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(temporal_model.state_dict(), os.path.join(checkpoint_dir, "lstm_best.pt"))

    print(f"  Stage 2 Temporal Bi-LSTM trained. Checkpoint: lstm_best.pt (Best Val Loss: {best_val_loss:.4f})")

    # ------------------------------------------------------------
    # STAGE 3: Audio-Visual Lip-Sync Model Training
    # ------------------------------------------------------------
    print("\n--- [STAGE 3: Audio-Visual Lip-Sync Training] ---")
    sync_model = AVSyncModel().to(device)
    opt_sync = torch.optim.AdamW(sync_model.parameters(), lr=lr, weight_decay=1e-3)

    best_val_loss = float('inf')
    for epoch in range(epochs):
        sync_model.train()
        train_loss = 0.0
        for batch in train_loader:
            lip = batch["feat_lip"].to(device)
            audio = batch["feat_a"].to(device)
            has_audio = batch["has_audio"].to(device)
            labels = batch["label"].to(device).view(-1, 1)

            opt_sync.zero_grad()
            logits, _, _ = sync_model(lip, audio, has_audio)
            loss = criterion(logits, labels)
            loss.backward()
            opt_sync.step()
            train_loss += loss.item()

        sync_model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for batch in val_loader:
                lip = batch["feat_lip"].to(device)
                audio = batch["feat_a"].to(device)
                has_audio = batch["has_audio"].to(device)
                labels = batch["label"].to(device).view(-1, 1)
                logits, _, _ = sync_model(lip, audio, has_audio)
                val_loss += criterion(logits, labels).item()

        val_loss = val_loss / max(1, len(val_loader))
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(sync_model.state_dict(), os.path.join(checkpoint_dir, "av_sync_best.pt"))

    print(f"  Stage 3 AV-Sync model trained. Checkpoint: av_sync_best.pt (Best Val Loss: {best_val_loss:.4f})")

    # ------------------------------------------------------------
    # STAGE 4: Full Gated Multimodal Fusion Training
    # ------------------------------------------------------------
    print("\n--- [STAGE 4: Full Gated Multimodal Fusion Training] ---")
    fusion_model = GatedMultimodalFusion().to(device)
    opt_fusion = torch.optim.AdamW(fusion_model.parameters(), lr=lr * 0.5, weight_decay=1e-3)

    best_val_loss = float('inf')
    for epoch in range(epochs + 4):
        fusion_model.train()
        temporal_model.eval()
        sync_model.eval()

        train_loss = 0.0
        for batch in train_loader:
            fv = batch["feat_v"].to(device)
            seqs = batch["temporal_input_seq"].to(device)
            fa = batch["feat_a"].to(device)
            ff = batch["feat_f"].to(device)
            lip = batch["feat_lip"].to(device)
            has_audio = batch["has_audio"].to(device)
            labels = batch["label"].to(device).view(-1, 1)

            with torch.no_grad():
                _, ft, _ = temporal_model(seqs)
                _, fs, _ = sync_model(lip, fa, has_audio)

            opt_fusion.zero_grad()
            logits, probs, _ = fusion_model(fv, ft, fa, fs, ff, has_audio)
            loss = criterion(logits, labels)
            loss.backward()
            opt_fusion.step()
            train_loss += loss.item()

        fusion_model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for batch in val_loader:
                fv = batch["feat_v"].to(device)
                seqs = batch["temporal_input_seq"].to(device)
                fa = batch["feat_a"].to(device)
                ff = batch["feat_f"].to(device)
                lip = batch["feat_lip"].to(device)
                has_audio = batch["has_audio"].to(device)
                labels = batch["label"].to(device).view(-1, 1)

                _, ft, _ = temporal_model(seqs)
                _, fs, _ = sync_model(lip, fa, has_audio)
                logits, _, _ = fusion_model(fv, ft, fa, fs, ff, has_audio)
                val_loss += criterion(logits, labels).item()

        val_loss = val_loss / max(1, len(val_loader))
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(fusion_model.state_dict(), os.path.join(checkpoint_dir, "fusion_best.pt"))

    print(f"  Stage 4 Multimodal Fusion trained. Checkpoint: fusion_best.pt (Best Val Loss: {best_val_loss:.4f})")

    # ------------------------------------------------------------
    # FINAL EVALUATION ON BALANCED TEST SET
    # ------------------------------------------------------------
    print("\n============================================================")
    print("EVALUATING FINAL MULTIMODAL MODEL ON TEST SET")
    print("============================================================")
    # Load best checkpoint
    fusion_model.load_state_dict(torch.load(os.path.join(checkpoint_dir, "fusion_best.pt"), map_location=device))
    fusion_model.eval()
    y_trues, y_preds, y_probs = [], [], []

    with torch.no_grad():
        for batch in test_loader:
            fv = batch["feat_v"].to(device)
            seqs = batch["temporal_input_seq"].to(device)
            fa = batch["feat_a"].to(device)
            ff = batch["feat_f"].to(device)
            lip = batch["feat_lip"].to(device)
            has_audio = batch["has_audio"].to(device)
            labels = batch["label"].cpu().numpy()

            _, ft, _ = temporal_model(seqs)
            _, fs, _ = sync_model(lip, fa, has_audio)
            _, probs, _ = fusion_model(fv, ft, fa, fs, ff, has_audio)

            probs_np = probs.cpu().numpy().flatten()
            preds_np = (probs_np >= 0.5).astype(int)

            y_trues.extend(labels.tolist())
            y_preds.extend(preds_np.tolist())
            y_probs.extend(probs_np.tolist())

    metrics = compute_metrics(y_trues, y_preds, y_probs)
    print(f"\nFinal Test Set Results:")
    print(f"  Accuracy:         {metrics['accuracy'] * 100:.2f}%")
    print(f"  Precision:        {metrics['precision'] * 100:.2f}%")
    print(f"  Recall:           {metrics['recall'] * 100:.2f}%")
    print(f"  F1-Score:         {metrics['f1_score'] * 100:.2f}%")
    print(f"  ROC-AUC:          {metrics['roc_auc']:.4f}")
    print(f"  Confusion Matrix: {metrics['confusion_matrix']}")

    eval_out = str(DATA_DIR / "final_test_metrics.json")
    with open(eval_out, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    print(f"\nSaved test evaluation to: {eval_out}")

    return metrics

if __name__ == "__main__":
    idx_file = str(DATA_DIR / "features" / "features_index.json")
    ckpt_dir = str(CHECKPOINTS_DIR)
    if os.path.exists(idx_file):
        train_forensic_pipeline(idx_file, ckpt_dir, epochs=10)
    else:
        print(f"[Error] Features index not found at: {idx_file}")
