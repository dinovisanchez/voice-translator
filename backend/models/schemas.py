from __future__ import annotations

from pydantic import BaseModel


class VoiceTrainingRequest(BaseModel):
    profile_name: str = "default"


class VoiceTrainingResponse(BaseModel):
    profile_name: str
    duration_seconds: float
    mean_amplitude: float
    std_amplitude: float
    peak_amplitude: float
    energy: float
