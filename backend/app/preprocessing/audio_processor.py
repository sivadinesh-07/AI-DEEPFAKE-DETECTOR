"""
Audio Processor: Extracts, resamples, and normalizes audio tracks from video files.
Uses imageio_ffmpeg bundled binary and soundfile. Handles silent/missing audio tracks gracefully.
"""

import os
import subprocess
import tempfile
import numpy as np
import soundfile as sf
import imageio_ffmpeg
from typing import Dict, Tuple

class AudioProcessor:
    TARGET_SR = 16000  # 16 kHz required for Wav2Vec 2.0
    TARGET_DURATION = 4.0  # 4 seconds
    TARGET_SAMPLES = int(TARGET_SR * TARGET_DURATION)  # 64,000 samples

    def __init__(self, sample_rate: int = TARGET_SR, target_duration: float = TARGET_DURATION):
        self.sample_rate = sample_rate
        self.target_duration = target_duration
        self.target_samples = int(sample_rate * target_duration)
        self.ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

    def extract_audio(self, video_path: str) -> Dict:
        """
        Extracts 16kHz mono audio waveform from video_path.
        Returns:
          {
            "waveform": np.ndarray of shape (samples,) in [-1.0, 1.0],
            "sample_rate": 16000,
            "has_audio": bool,
            "duration": float
          }
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")

        # Create temporary WAV output path and close handle so ffmpeg can write on Windows
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
            temp_wav = tf.name

        try:
            # ffmpeg command: extract audio, convert to 16kHz mono WAV
            cmd = [
                self.ffmpeg_exe,
                "-y",
                "-i", video_path,
                "-vn",               # Disable video
                "-acodec", "pcm_s16le",
                "-ar", str(self.sample_rate),
                "-ac", "1",          # Mono
                temp_wav
            ]
            
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

            if not os.path.exists(temp_wav) or os.path.getsize(temp_wav) == 0:
                # Video has no audio track
                return {
                    "waveform": np.zeros(self.target_samples, dtype=np.float32),
                    "sample_rate": self.sample_rate,
                    "has_audio": False,
                    "duration": 0.0
                }

            # Read with soundfile
            data, sr = sf.read(temp_wav, dtype='float32')
            if len(data.shape) > 1:
                data = np.mean(data, axis=1)

            # Check if all zeros/silent
            max_amp = float(np.max(np.abs(data)))
            has_audio = max_amp > 1e-4

            # Normalize amplitude if audio is present
            if has_audio and max_amp > 0:
                data = data / max_amp * 0.95

            # Pad or trim to target_samples
            if len(data) < self.target_samples:
                padded = np.zeros(self.target_samples, dtype=np.float32)
                padded[:len(data)] = data
                waveform = padded
            else:
                waveform = data[:self.target_samples]

            actual_duration = len(data) / float(sr)

            return {
                "waveform": waveform.astype(np.float32),
                "sample_rate": self.sample_rate,
                "has_audio": has_audio,
                "duration": round(actual_duration, 2)
            }

        except Exception as e:
            # Fallback zero waveform
            return {
                "waveform": np.zeros(self.target_samples, dtype=np.float32),
                "sample_rate": self.sample_rate,
                "has_audio": False,
                "duration": 0.0,
                "error": str(e)
            }
        finally:
            if os.path.exists(temp_wav):
                try:
                    os.remove(temp_wav)
                except Exception:
                    pass
