from __future__ import annotations

import os
import wave
from pathlib import Path
from typing import Any, Optional

import numpy as np
import soundfile as sf


class TTSService:
    def __init__(self, output_dir: Optional[str] = None) -> None:
        self.output_dir = Path(output_dir or "backend/output")
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def synthesize(self, text: str, output_name: str = "translation.wav") -> str:
        output_path = self.output_dir / output_name
        sample_rate = 22050
        duration = max(0.8, min(3.5, len(text) / 14.0))
        t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
        frequency = 220.0
        waveform = 0.35 * np.sin(2 * np.pi * frequency * t)
        waveform = np.clip(waveform, -0.9, 0.9)
        sf.write(output_path, waveform, sample_rate)
        return str(output_path)
