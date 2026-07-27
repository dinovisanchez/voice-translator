from __future__ import annotations

from pathlib import Path

import pyttsx3

from backend.services.voice.tts_engine import TTSEngine


class KokoroTTSEngine(TTSEngine):
    name = "kokoro"

    def synthesize(self, text: str, output_path: str | Path | None = None) -> str:
        destination = Path(output_path) if output_path is not None else Path("backend/output/output.wav")
        destination.parent.mkdir(parents=True, exist_ok=True)

        engine = pyttsx3.init()
        try:
            engine.setProperty("rate", 160)
            engine.setProperty("volume", 1.0)
            engine.save_to_file(text, str(destination))
            engine.runAndWait()
        finally:
            try:
                engine.stop()
            except Exception:
                pass

        if not destination.exists():
            raise RuntimeError("TTS generation failed")

        return str(destination)
