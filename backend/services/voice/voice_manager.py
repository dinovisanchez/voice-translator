from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from services.voice.chatterbox import ChatterboxTTSEngine
from services.voice.f5tts import F5TTSEngine
from services.voice.kokoro import KokoroTTSEngine
from services.voice.tts_engine import TTSEngine


class VoiceManager:
    def __init__(self, engine_name: str | None = None) -> None:
        self.engine_name = engine_name or os.getenv("TTS_ENGINE", "kokoro")
        self._engine: TTSEngine | None = None

    def _build_engine(self) -> TTSEngine:
        if self.engine_name == "f5tts":
            return F5TTSEngine()
        if self.engine_name == "chatterbox":
            return ChatterboxTTSEngine()
        if self.engine_name == "kokoro":
            return KokoroTTSEngine()
        return DummyTTSEngine()

    @property
    def engine(self) -> TTSEngine:
        if self._engine is None:
            self._engine = self._build_engine()
        return self._engine

    def synthesize(self, text: str, output_path: str | Path | None = None) -> str:
        return self.engine.synthesize(text, output_path)


class DummyTTSEngine(TTSEngine):
    name = "dummy"

    def synthesize(self, text: str, output_path: str | Path | None = None) -> str:
        base_dir = Path(output_path) if output_path is not None else Path("backend/output")
        base_dir.mkdir(parents=True, exist_ok=True)
        target_path = Path(base_dir) / "dummy_tts.wav"
        target_path.write_bytes(b"RIFF\x24\x00\x00\x00WAVE")
        return str(target_path)
