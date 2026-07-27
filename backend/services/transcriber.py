from __future__ import annotations

import os
from typing import Any, Optional

from faster_whisper import WhisperModel


class TranscriberService:
    def __init__(self, model_size: str = "tiny") -> None:
        self.model_size = model_size
        self._model: Optional[WhisperModel] = None

    def _get_model(self) -> WhisperModel:
        if self._model is None:
            device = "cpu"
            compute_type = "int8"
            self._model = WhisperModel(self.model_size, device=device, compute_type=compute_type)
        return self._model

    def transcribe_file(self, file_path: str) -> dict[str, Any]:
        model = self._get_model()
        segments, info = model.transcribe(file_path, beam_size=5, language=None, task="transcribe")
        text = " ".join(segment.text.strip() for segment in segments if segment.text)

        return {
            "success": True,
            "text": text.strip(),
            "language": info.language or "unknown",
            "duration": round(float(os.path.getsize(file_path) / max(1, 32000)), 3),
        }
