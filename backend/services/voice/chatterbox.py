from __future__ import annotations

from pathlib import Path

from services.voice.tts_engine import TTSEngine


class ChatterboxTTSEngine(TTSEngine):
    name = "chatterbox"

    def synthesize(self, text: str, output_path: str | Path | None = None) -> str:
        raise NotImplementedError("Chatterbox TTS is not implemented in Sprint 5")
