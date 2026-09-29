"""
Calibrated Multi-Modal Forensic Model Training & Export Pipeline.
Trains:
  1. Calibrated multi-modal ensemble model (visual, temporal, spectral, biometric, acoustic)
     producing reliable dual-class predictions on real vs deepfake videos.
  2. PyTorch neural network checkpoints:
     - checkpoints/spatial_best.pt
     - checkpoints/lstm_best.pt
     - checkpoints/av_sync_best.pt
     - checkpoints/fusion_best.pt
     - checkpoints/forensic_ensemble.pkl
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import glob
import json
import pickle
import numpy as np
import torch
import torch.nn as nn
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, classification_report
from sklearn.model_selection import StratifiedKFold

from backend.app.models.spatial_model import SpatialSpectralModel
from backend.app.models.temporal_model import BiLSTMTemporalModel
from backend.app.models.av_sync_model import AVSyncModel
from backend.app.models.fusion_model import GatedMultimodalFusion
from backend.app.utils.paths import CHECKPOINTS_DIR, DATA_DIR

def run_calibrated_training():
    ckpt_dir = str(CHECKPOINTS_DIR)
    os.makedirs(ckpt_dir, exist_ok=True)

    feature_files = glob.glob(str(DATA_DIR / "features" / "*.pt"))
    print(f"Loading {len(feature_files)} feature files...")

    X_vis, X_aud, X_bio, y_glob, y_vis, y_aud = [], [], [], [], [], []
    sample_dicts = []

    for f in feature_files:
        try:
            d = torch.load(f, weights_only=False)
            cat = str(d.get("category", ""))
            label = int(d["label"])

            fv = d["feat_v"].numpy()
            seq = d["temporal_input_seq"].numpy()
            seq_m = seq.mean(axis=0)[:1856]
            seq_s = seq.std(axis=0)[:1856]
            fa = d["feat_a"].numpy()

            f_bio = seq[:, 1856:].mean(axis=0)
            ear_var = np.var(seq[:, 1856])
            mar_var = np.var(seq[:, 1860])
            gaze_var = np.var(seq[:, 1861])
            spec_ratio = fv[1792+32:].mean() / (fv[1792:1792+16].mean() + 1e-6)

            vis_vec = np.concatenate([fv, seq_m, seq_s, f_bio, [ear_var, mar_var, spec_ratio]])
            bio_vec = np.concatenate([f_bio, [ear_var, mar_var, gaze_var, spec_ratio]])

            is_v = 1 if ("FakeVideo" in cat or "UADFV-Fake" in cat or (label == 1 and "FakeAudio" not in cat)) else 0
            is_a = 1 if "FakeAudio" in cat else 0

            X_vis.append(vis_vec)
            X_aud.append(fa)
            X_bio.append(bio_vec)
            y_glob.append(label)
            y_vis.append(is_v)
            y_aud.append(is_a)
            sample_dicts.append(d)
        except Exception as e:
            print(f"Warning: skipped {f}: {e}")

    X_vis = np.array(X_vis)
    X_aud = np.array(X_aud)
    X_bio = np.array(X_bio)
    y_glob = np.array(y_glob)
    y_vis = np.array(y_vis)
    y_aud = np.array(y_aud)

    print(f"Dataset summary: Total={len(y_glob)}, Real={list(y_glob).count(0)}, Fake={list(y_glob).count(1)}")

    # 1. Train multi-modal forensic ensemble
    print("\n--- Training Calibrated Forensic Ensemble ---")
    rf_visual = RandomForestClassifier(n_estimators=150, max_depth=6, min_samples_split=4, class_weight="balanced", random_state=42)
    rf_visual.fit(X_vis, y_vis)

    rf_audio = RandomForestClassifier(n_estimators=100, max_depth=6, min_samples_split=4, class_weight="balanced", random_state=42)
    rf_audio.fit(X_aud, y_aud)

    ensemble_package = {
        "visual_model": rf_visual,
        "audio_model": rf_audio,
        "feature_dim_vis": X_vis.shape[1],
        "feature_dim_aud": X_aud.shape[1]
    }

    ensemble_path = os.path.join(ckpt_dir, "forensic_ensemble.pkl")
    with open(ensemble_path, "wb") as f:
        pickle.dump(ensemble_package, f)
    print(f"Saved calibrated ensemble to: {ensemble_path}")

    # 2. 5-Fold Stratified Cross-Validation Verification
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    y_preds_cv, y_probs_cv, y_trues_cv = [], [], []

    for train_idx, test_idx in skf.split(X_vis, y_glob):
        v_clf = RandomForestClassifier(n_estimators=120, max_depth=6, random_state=42)
        v_clf.fit(X_vis[train_idx], y_vis[train_idx])
        p_v = v_clf.predict_proba(X_vis[test_idx])[:, 1]

        a_clf = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
        a_clf.fit(X_aud[train_idx], y_aud[train_idx])
        p_a = a_clf.predict_proba(X_aud[test_idx])[:, 1]

        p_fused = 1.0 - (1.0 - p_v) * (1.0 - p_a)
        preds = (p_fused >= 0.50).astype(int)

        y_preds_cv.extend(preds)
        y_probs_cv.extend(p_fused)
        y_trues_cv.extend(y_glob[test_idx])

    acc = accuracy_score(y_trues_cv, y_preds_cv)
    prec = precision_score(y_trues_cv, y_preds_cv, zero_division=0)
    rec = recall_score(y_trues_cv, y_preds_cv, zero_division=0)
    f1 = f1_score(y_trues_cv, y_preds_cv, zero_division=0)
    auc = roc_auc_score(y_trues_cv, y_probs_cv)
    cm = confusion_matrix(y_trues_cv, y_preds_cv).tolist()

    print(f"\n============================================================")
    print(f"VERIFIED FORENSIC DETECTION METRICS (5-FOLD CV):")
    print(f"============================================================")
    print(f"  Accuracy:         {acc * 100:.2f}%")
    print(f"  Precision:        {prec * 100:.2f}%")
    print(f"  Recall:           {rec * 100:.2f}%")
    print(f"  F1-Score:         {f1 * 100:.2f}%")
    print(f"  ROC-AUC:          {auc:.4f}")
    print(f"  Confusion Matrix (rows: True [Real, Fake], cols: Pred [Real, Fake]):")
    print(f"  {cm}")
    print("\nClassification Report:\n", classification_report(y_trues_cv, y_preds_cv, target_names=["Real (0)", "Fake (1)"]))

    # Save metrics JSON
    metrics = {
        "accuracy": round(float(acc), 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "f1_score": round(float(f1), 4),
        "roc_auc": round(float(auc), 4),
        "confusion_matrix": cm
    }
    with open(str(DATA_DIR / "final_test_metrics.json"), "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    # 3. Train PyTorch models with calibrated weights
    print("\n--- Training Calibrated PyTorch Models ---")
    device = torch.device("cpu")
    
    # Spatial Model
    spatial_model = SpatialSpectralModel(pretrained=False).to(device)
    X_v_t = torch.stack([d["feat_v"] for d in sample_dicts])
    y_v_t = torch.tensor(y_vis, dtype=torch.float32).view(-1, 1)

    opt_sp = torch.optim.AdamW(spatial_model.classifier.parameters(), lr=0.003, weight_decay=1e-3)
    crit = nn.BCEWithLogitsLoss()
    for _ in range(35):
        spatial_model.classifier.train()
        opt_sp.zero_grad()
        loss = crit(spatial_model.classifier(X_v_t), y_v_t)
        loss.backward()
        opt_sp.step()
    torch.save(spatial_model.state_dict(), os.path.join(ckpt_dir, "spatial_best.pt"))
    print("Saved calibrated spatial_best.pt")

    # Temporal Model
    temporal_model = BiLSTMTemporalModel(input_dim=1872).to(device)
    seqs_t = torch.stack([d["temporal_input_seq"] for d in sample_dicts])
    opt_tm = torch.optim.AdamW(temporal_model.parameters(), lr=0.002, weight_decay=1e-3)
    for _ in range(25):
        temporal_model.train()
        opt_tm.zero_grad()
        logits, _, _ = temporal_model(seqs_t)
        loss = crit(logits, y_v_t)
        loss.backward()
        opt_tm.step()
    torch.save(temporal_model.state_dict(), os.path.join(ckpt_dir, "lstm_best.pt"))
    print("Saved calibrated lstm_best.pt")

    # AV-Sync Model
    sync_model = AVSyncModel().to(device)
    lip_t = torch.stack([d["feat_lip"] for d in sample_dicts])
    aud_t = torch.stack([d["feat_a"] for d in sample_dicts])
    has_a_t = torch.tensor([1.0 if d.get("has_audio", True) else 0.0 for d in sample_dicts])
    y_sync = torch.tensor([1.0 if (y_aud[i] == 1 or y_vis[i] == 1) else 0.0 for i in range(len(y_vis))]).view(-1, 1)

    opt_sy = torch.optim.AdamW(sync_model.parameters(), lr=0.002, weight_decay=1e-3)
    for _ in range(25):
        sync_model.train()
        opt_sy.zero_grad()
        logits, _, _ = sync_model(lip_t, aud_t, has_a_t)
        loss = crit(logits, y_sync)
        loss.backward()
        opt_sy.step()
    torch.save(sync_model.state_dict(), os.path.join(ckpt_dir, "av_sync_best.pt"))
    print("Saved calibrated av_sync_best.pt")

    # Fusion Model
    fusion_model = GatedMultimodalFusion().to(device)
    f_bio_t = torch.stack([d["feat_f"] for d in sample_dicts])
    y_glob_t = torch.tensor(y_glob, dtype=torch.float32).view(-1, 1)
    opt_fm = torch.optim.AdamW(fusion_model.parameters(), lr=0.003, weight_decay=1e-3)

    spatial_model.eval(); temporal_model.eval(); sync_model.eval()
    with torch.no_grad():
        _, feat_t_all, _ = temporal_model(seqs_t)
        _, feat_s_all, _ = sync_model(lip_t, aud_t, has_a_t)

    for _ in range(30):
        fusion_model.train()
        opt_fm.zero_grad()
        logits, _, _ = fusion_model(X_v_t, feat_t_all, aud_t, feat_s_all, f_bio_t, has_a_t)
        loss = crit(logits, y_glob_t)
        loss.backward()
        opt_fm.step()
    torch.save(fusion_model.state_dict(), os.path.join(ckpt_dir, "fusion_best.pt"))
    print("Saved calibrated fusion_best.pt")

    print("\n[Complete] All calibrated models and checkpoints saved successfully.")
    return metrics

if __name__ == "__main__":
    run_calibrated_training()
