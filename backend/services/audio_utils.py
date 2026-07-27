from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import BinaryIO, Optional

import soundfile as sf
import numpy as np


def save_uploaded_audio(uploaded_file: BinaryIO, destination: Optional[str] = None) -> str:
    if destination is None:
        destination = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    output_path = Path(destination)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as handle:
        uploaded_file.seek(0)
        handle.write(uploaded_file.read())
    return str(output_path)


def ensure_wav(input_path: str, output_path: Optional[str] = None) -> str:
    if output_path is None:
        output_path = input_path
    data, samplerate = sf.read(input_path)
    if data.ndim > 1:
        data = np.mean(data, axis=1)
    sf.write(output_path, data, samplerate)
    return output_path
