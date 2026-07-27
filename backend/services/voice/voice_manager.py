from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from services.voice.chatterbox import ChatterboxTTSEngine
from services.voice.f5tts import F5TTSEngine
# from services.voice.kokoro import KokoroTTSEngine
from services.voice.tts_engine import TTSEngine, DummyTTSEngine


class VoiceManager:
    def __init__(self, engine_name: str | None = None):
        self.engine_name = engine_name or os.getenv("VOICE_ENGINE", "dummy")
        self._engine: TTSEngine | None = None

    def _build_engine(self) -> TTSEngine:
        if self.engine_name == "f5tts":
            return F5TTSEngine()

        if self.engine_name == "chatterbox":
            return ChatterboxTTSEngine()

        # Kokoro deshabilitado temporalmente para Railway
        if self.engine_name == "kokoro":
            return DummyTTSEngine()

        return DummyTTSEngine()

    @property
    def engine(self) -> TTSEngine:
        if self._engine is None:
            self._engine = self._build_engine()
        return self._engine

    def synthesize(
        self,
        text: str,
        output_path: str | Path,
        **kwargs: Any,
    ) -> Path:
        return self.engine.synthesize(text, output_path, **kwargs)
