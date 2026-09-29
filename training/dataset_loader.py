"""
Dataset Loader and Stratified Identity-Based Splitting.
Enforces strict 50% Real / 50% Fake balance and guarantees zero identity leakage
by pairing real and fake samples from identical subjects within the same split.
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import csv
import random
import json
from pathlib import Path
from typing import Dict, List, Tuple

class DatasetLoader:
    def __init__(self, meta_csv: str, base_dir: str, uadfv_dir: str = None, seed: int = 42):
        self.meta_csv = meta_csv
        self.base_dir = base_dir
        self.uadfv_dir = uadfv_dir
        self.seed = seed
        random.seed(seed)

    def load_paired_balanced_splits(
        self,
        num_identities: int = 100,
        train_ratio: float = 0.70,
        val_ratio: float = 0.15
    ) -> Tuple[List[Dict], List[Dict], List[Dict]]:
        """
        Constructs a strictly balanced (50% Real / 50% Fake) dataset with zero identity leakage.
        For each identity, pairs 1 Real video with 1 Fake video of the same subject.
        """
        real_by_id: Dict[str, List[str]] = {}
        fake_by_id: Dict[str, List[Tuple[str, str]]] = {}

        if os.path.exists(self.meta_csv):
            with open(self.meta_csv, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cat = row.get('type', '')
                    src = row.get('source', '')
                    rel_path = row.get('path', '')
                    race = row.get('race', '')
                    gender = row.get('gender', '')

                    candidates = [
                        os.path.join(self.base_dir, cat, race, gender, src, rel_path),
                        os.path.join(self.base_dir, rel_path)
                    ]
                    resolved = None
                    for c in candidates:
                        if os.path.exists(c):
                            resolved = c
                            break

                    if resolved:
                        if cat == 'RealVideo-RealAudio':
                            real_by_id.setdefault(src, []).append(resolved)
                        elif cat in ['RealVideo-FakeAudio', 'FakeVideo-RealAudio', 'FakeVideo-FakeAudio']:
                            fake_by_id.setdefault(src, []).append((resolved, cat))

        # Find identities with both real and fake videos
        common_ids = sorted(list(set(real_by_id.keys()) & set(fake_by_id.keys())))
        random.shuffle(common_ids)

        selected_ids = common_ids[:num_identities]
        print(f"[DatasetLoader] Selected {len(selected_ids)} identities with both Authentic & Deepfake videos.")

        # Split identities across train, val, test
        n_total = len(selected_ids)
        n_train = int(n_total * train_ratio)
        n_val = int(n_total * val_ratio)

        train_ids = set(selected_ids[:n_train])
        val_ids = set(selected_ids[n_train : n_train + n_val])
        test_ids = set(selected_ids[n_train + n_val :])

        # Verify zero identity overlap
        assert len(train_ids & val_ids) == 0 and len(train_ids & test_ids) == 0 and len(val_ids & test_ids) == 0, "Identity overlap detected!"

        # Category rotation index for balanced manipulation types
        fake_cat_rotation = ['FakeVideo-RealAudio', 'RealVideo-FakeAudio', 'FakeVideo-FakeAudio']

        def build_split(id_set: set) -> List[Dict]:
            split_samples = []
            for idx, ident in enumerate(sorted(list(id_set))):
                # 1. Real sample
                real_video = random.choice(real_by_id[ident])
                split_samples.append({
                    'video_path': real_video,
                    'identity': ident,
                    'category': 'RealVideo-RealAudio',
                    'label': 0,
                    'dataset': 'FakeAVCeleb'
                })

                # 2. Fake sample (rotate through manipulation categories)
                target_cat = fake_cat_rotation[idx % len(fake_cat_rotation)]
                matching_fakes = [p for p, c in fake_by_id[ident] if c == target_cat]
                if not matching_fakes:
                    matching_fakes = [p for p, c in fake_by_id[ident]]
                fake_video = random.choice(matching_fakes)

                split_samples.append({
                    'video_path': fake_video,
                    'identity': ident,
                    'category': target_cat,
                    'label': 1,
                    'dataset': 'FakeAVCeleb'
                })

            random.shuffle(split_samples)
            return split_samples

        train_samples = build_split(train_ids)
        val_samples = build_split(val_ids)
        test_samples = build_split(test_ids)

        print(f"\n[Split Summary - 50% Real / 50% Fake & Zero Identity Leakage]:")
        print(f"  Train: {len(train_samples)} videos (Real: {sum(1 for x in train_samples if x['label'] == 0)}, Fake: {sum(1 for x in train_samples if x['label'] == 1)})")
        print(f"  Val:   {len(val_samples)} videos (Real: {sum(1 for x in val_samples if x['label'] == 0)}, Fake: {sum(1 for x in val_samples if x['label'] == 1)})")
        print(f"  Test:  {len(test_samples)} videos (Real: {sum(1 for x in test_samples if x['label'] == 0)}, Fake: {sum(1 for x in test_samples if x['label'] == 1)})")
        print(f"  Total: {len(train_samples) + len(val_samples) + len(test_samples)} videos across {len(selected_ids)} identities")

        return train_samples, val_samples, test_samples

if __name__ == "__main__":
    from backend.app.utils.paths import PROJECT_ROOT, DATA_DIR

    meta_path = str(PROJECT_ROOT / "dataset" / "FakeAVCeleb_v1.2" / "FakeAVCeleb_v1.2" / "meta_data.csv")
    base_dir = str(PROJECT_ROOT / "dataset" / "FakeAVCeleb_v1.2" / "FakeAVCeleb_v1.2")
    uadfv_dir = str(PROJECT_ROOT / "dataset" / "UADFV")

    loader = DatasetLoader(meta_path, base_dir, uadfv_dir=uadfv_dir)
    # Generate balanced dataset of 100 identities (100 Real + 100 Fake = 200 total videos)
    train, val, test = loader.load_paired_balanced_splits(num_identities=100)

    splits_file = str(DATA_DIR / "splits.json")
    with open(splits_file, "w", encoding="utf-8") as f:
        json.dump({
            "train": train,
            "val": val,
            "test": test
        }, f, indent=2)
    print(f"\nSaved stratified balanced splits to: {splits_file}")
