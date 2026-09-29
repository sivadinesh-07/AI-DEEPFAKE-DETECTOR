"""
Dataset Inspector Script for FakeAVCeleb and UADFV datasets.
Extracts distribution, counts, video resolution, duration, audio presence, and metadata.
"""

import os
import csv
import json
from collections import Counter
import cv2

def inspect_fakeavceleb(meta_csv_path: str, base_dir: str, sample_size: int = 20):
    print("=" * 60)
    print("INSPECTING FAKEAVCELEB DATASET")
    print("=" * 60)
    
    if not os.path.exists(meta_csv_path):
        print(f"[ERROR] Metadata CSV not found at: {meta_csv_path}")
        return {}

    type_counts = Counter()
    race_counts = Counter()
    gender_counts = Counter()
    identities = set()
    total_records = 0
    
    existing_samples = []

    with open(meta_csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_records += 1
            cat_type = row.get('type', 'Unknown')
            race = row.get('race', 'Unknown')
            gender = row.get('gender', 'Unknown')
            source_id = row.get('source', '')
            
            type_counts[cat_type] += 1
            race_counts[race] += 1
            gender_counts[gender] += 1
            if source_id and source_id != '-':
                identities.add(source_id)
                
            # Check file presence for a small sample
            if len(existing_samples) < sample_size:
                rel_path = row.get('path', '')
                folder = row.get('', '')
                # Find full path
                candidates = [
                    os.path.join(base_dir, cat_type, race, gender, source_id, rel_path),
                    os.path.join(base_dir, folder, rel_path),
                    os.path.join(base_dir, rel_path)
                ]
                for p in candidates:
                    if os.path.exists(p):
                        existing_samples.append((p, cat_type, source_id))
                        break

    print(f"Total entries in metadata: {total_records}")
    print(f"Unique Source Identities: {len(identities)}")
    print("\nCategory Distribution:")
    for k, v in type_counts.items():
        print(f"  - {k}: {v} ({v/total_records*100:.1f}%)")

    print("\nRace Distribution:")
    for k, v in race_counts.items():
        print(f"  - {k}: {v}")

    print("\nGender Distribution:")
    for k, v in gender_counts.items():
        print(f"  - {k}: {v}")

    # Inspect video details from sample
    video_details = []
    print(f"\nProbing {len(existing_samples)} sample video files...")
    for file_path, cat_type, src_id in existing_samples:
        cap = cv2.VideoCapture(file_path)
        if cap.isOpened():
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = count / fps if fps > 0 else 0
            cap.release()
            video_details.append({
                "path": file_path,
                "type": cat_type,
                "resolution": f"{w}x{h}",
                "fps": round(fps, 2),
                "frames": count,
                "duration_sec": round(duration, 2)
            })
        else:
            video_details.append({"path": file_path, "type": cat_type, "error": "Could not open with OpenCV"})

    if video_details:
        print("\nSample Video Properties:")
        for idx, item in enumerate(video_details[:5], 1):
            if "error" in item:
                print(f"  [{idx}] {os.path.basename(item['path'])}: Error {item['error']}")
            else:
                print(f"  [{idx}] {os.path.basename(item['path'])} ({item['type']}): {item['resolution']}, {item['fps']} FPS, {item['frames']} frames, {item['duration_sec']}s")

    return {
        "total_records": total_records,
        "type_counts": dict(type_counts),
        "unique_identities": len(identities),
        "sample_properties": video_details[:5]
    }


def inspect_uadfv(uadfv_dir: str):
    print("\n" + "=" * 60)
    print("INSPECTING UADFV DATASET")
    print("=" * 60)
    
    real_dir = os.path.join(uadfv_dir, "real")
    fake_dir = os.path.join(uadfv_dir, "fake")
    
    real_files = [os.path.join(real_dir, f) for f in os.listdir(real_dir) if f.endswith(('.mp4', '.avi', '.mov'))] if os.path.exists(real_dir) else []
    fake_files = [os.path.join(fake_dir, f) for f in os.listdir(fake_dir) if f.endswith(('.mp4', '.avi', '.mov'))] if os.path.exists(fake_dir) else []
    
    print(f"Real videos: {len(real_files)}")
    print(f"Fake videos: {len(fake_files)}")
    print(f"Total UADFV videos: {len(real_files) + len(fake_files)}")

    samples = real_files[:2] + fake_files[:2]
    sample_details = []
    for p in samples:
        cap = cv2.VideoCapture(p)
        if cap.isOpened():
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = count / fps if fps > 0 else 0
            cap.release()
            sample_details.append({
                "file": os.path.basename(p),
                "label": "REAL" if "real" in p else "FAKE",
                "resolution": f"{w}x{h}",
                "fps": round(fps, 2),
                "frames": count,
                "duration_sec": round(duration, 2)
            })
            
    for item in sample_details:
        print(f"  - {item['file']} ({item['label']}): {item['resolution']}, {item['fps']} FPS, {item['frames']} frames, {item['duration_sec']}s")

    return {
        "real_count": len(real_files),
        "fake_count": len(fake_files),
        "sample_properties": sample_details
    }


if __name__ == "__main__":
    meta_path = r"D:\Temporal-Spectral\dataset\FakeAVCeleb_v1.2\FakeAVCeleb_v1.2\meta_data.csv"
    fakeavceleb_dir = r"D:\Temporal-Spectral\dataset\FakeAVCeleb_v1.2\FakeAVCeleb_v1.2"
    uadfv_dir = r"D:\Temporal-Spectral\dataset\UADFV"
    
    results = {
        "fakeavceleb": inspect_fakeavceleb(meta_path, fakeavceleb_dir),
        "uadfv": inspect_uadfv(uadfv_dir)
    }
    
    output_summary = r"D:\Temporal-Spectral\data\dataset_inspection_summary.json"
    os.makedirs(os.path.dirname(output_summary), exist_ok=True)
    with open(output_summary, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nSummary successfully written to: {output_summary}")
