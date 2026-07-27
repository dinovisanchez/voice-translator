from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any


class TTSEngine(ABC):
    name: str = "base"

    @abstractmethod
    def synthesize(self, text: str, output_path: str | Path | None = None) -> str:
        raise NotImplementedError
