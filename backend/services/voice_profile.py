from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional

import numpy as np
import soundfile as sf


class VoiceProfileService:
    def __init__(self, storage_dir: Optional[str] = None) -> None:
        self.storage_dir = Path(storage_dir or "backend/voice")
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def save_profile(self, audio_path: str, profile_name: str = "default") -> dict[str, Any]:
        data, sample_rate = sf.read(audio_path)
        if data.ndim > 1:
            data = np.mean(data, axis=1)

        amplitude = np.abs(data)
        profile = {
            "profile_name": profile_name,
            "sample_rate": int(sample_rate),
            "duration_seconds": round(float(len(data) / sample_rate), 3),
            "mean_amplitude": round(float(np.mean(amplitude)), 6),
            "std_amplitude": round(float(np.std(amplitude)), 6),
            "peak_amplitude": round(float(np.max(amplitude)), 6),
            "energy": round(float(np.sum(amplitude**2) / max(1, len(amplitude))), 6),
        }

        profile_path = self.storage_dir / f"{profile_name}.json"
        profile_path.write_text(json.dumps(profile, indent=2), encoding="utf-8")
        return profile

    def load_profile(self, profile_name: str = "default") -> Optional[dict[str, Any]]:
        profile_path = self.storage_dir / f"{profile_name}.json"
        if not profile_path.exists():
            return None
        return json.loads(profile_path.read_text(encoding="utf-8"))
