from __future__ import annotations

from pathlib import Path

from services.voice.tts_engine import TTSEngine


class F5TTSEngine(TTSEngine):
    name = "f5tts"

    def synthesize(self, text: str, output_path: str | Path | None = None) -> str:
        raise NotImplementedError("F5 TTS is not implemented in Sprint 5")
