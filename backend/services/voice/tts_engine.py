from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any


class TTSEngine(ABC):
    name: str = "base"

    @abstractmethod
    def synthesize(
        self,
        text: str,
        output_path: str | Path | None = None,
        **kwargs: Any,
    ) -> Path:
        raise NotImplementedError


class DummyTTSEngine(TTSEngine):
    name = "dummy"

    def synthesize(
        self,
        text: str,
        output_path: str | Path | None = None,
        **kwargs: Any,
    ) -> Path:

        if output_path is None:
            output_path = Path("dummy.wav")
        else:
            output_path = Path(output_path)

        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Crea un archivo vacío para mantener el flujo funcionando
        output_path.touch(exist_ok=True)

        return output_path