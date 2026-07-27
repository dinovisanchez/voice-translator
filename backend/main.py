from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BACKEND_ROOT = Path(__file__).resolve().parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from models.schemas import VoiceTrainingRequest, VoiceTrainingResponse
from services.audio_utils import ensure_wav
from services.transcription import TranscriptionService
from services.transcriber import TranscriberService
from services.translator import TranslatorService
from services.tts import TTSService
from services.voice_profile import VoiceProfileService
from services.voice.voice_manager import VoiceManager

app = FastAPI(title="Voice Translator AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TranslationRequest(BaseModel):
    text: str
    source_lang: str = "es"
    target_lang: str = "en"


class TranslationResponse(BaseModel):
    original_text: str
    translated_text: str
    audio_path: Optional[str] = None


transcription_service = TranscriptionService(model_size="tiny")
transcriber_service = TranscriberService(model_size="tiny")
translator_service = TranslatorService()
tts_service = TTSService(output_dir="backend/output")
voice_manager = VoiceManager()
voice_profile_service = VoiceProfileService(storage_dir="backend/voice")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "voice-translator-ai"}


@app.post("/translate", response_model=TranslationResponse)
def translate(payload: TranslationRequest) -> TranslationResponse:
    translated_result = translator_service.translate_text(payload.text, payload.source_lang, payload.target_lang)
    audio_path = voice_manager.synthesize(translated_result["translated"], "backend/output/translation.wav")
    return TranslationResponse(
        original_text=payload.text,
        translated_text=translated_result["translated"],
        audio_path=audio_path,
    )


@app.post("/transcribe")
def transcribe_audio(audio: UploadFile = File(...)) -> dict[str, Any]:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio.file.read())
        temp_path = tmp.name

    converted_path = ensure_wav(temp_path, temp_path + ".converted.wav")
    result = transcription_service.transcribe_file(converted_path)
    os.remove(temp_path)
    if os.path.exists(converted_path) and converted_path != temp_path:
        os.remove(converted_path)

    return result


@app.post("/process-audio")
def process_audio(audio: UploadFile = File(...)) -> dict[str, Any]:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio.file.read())
        temp_path = tmp.name

    converted_path = ensure_wav(temp_path, temp_path + ".converted.wav")
    transcription_result = transcription_service.transcribe_file(converted_path)
    translated_result = translator_service.translate_text(
        transcription_result["text"],
        "es",
        "en",
    )
    audio_path = voice_manager.synthesize(translated_result["translated"], "backend/output/translation.wav")

    os.remove(temp_path)
    if os.path.exists(converted_path) and converted_path != temp_path:
        os.remove(converted_path)

    return {
        "transcription": transcription_result["text"],
        "translation": translated_result["translated"],
        "audio_path": audio_path,
    }


@app.post("/voice-training", response_model=VoiceTrainingResponse)
def voice_training(payload: VoiceTrainingRequest, audio: UploadFile = File(...)) -> VoiceTrainingResponse:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio.file.read())
        temp_path = tmp.name

    converted_path = ensure_wav(temp_path, temp_path + ".converted.wav")
    profile = voice_profile_service.save_profile(converted_path, payload.profile_name)

    os.remove(temp_path)
    if os.path.exists(converted_path) and converted_path != temp_path:
        os.remove(converted_path)

    return VoiceTrainingResponse(
        profile_name=profile["profile_name"],
        duration_seconds=profile["duration_seconds"],
        mean_amplitude=profile["mean_amplitude"],
        std_amplitude=profile["std_amplitude"],
        peak_amplitude=profile["peak_amplitude"],
        energy=profile["energy"],
    )


@app.post("/api/v1/transcribe")
def transcribe_uploaded_audio(audio: UploadFile = File(...)) -> dict[str, Any]:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio.file.read())
        temp_path = tmp.name

    try:
        result = transcriber_service.transcribe_file(temp_path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return result


@app.post("/api/v1/translate")
def translate_text(payload: dict[str, Any]) -> dict[str, Any]:
    text = str(payload.get("text", ""))
    source_language = str(payload.get("source_language", "es"))
    target_language = str(payload.get("target_language", "en"))
    return translator_service.translate_text(text, source_language, target_language)


@app.post("/api/v1/synthesize")
def synthesize_text(payload: dict[str, Any]) -> dict[str, Any]:
    text = str(payload.get("text", "")).strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    output_path = Path("backend/output/output.wav")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    generated_path = voice_manager.synthesize(text, output_path)

    return {
        "success": True,
        "audio_url": f"http://127.0.0.1:8000/api/v1/audio/{Path(generated_path).name}",
    }


@app.get("/api/v1/audio/{filename}")
def get_audio(filename: str) -> FileResponse:
    audio_path = Path("backend/output") / filename
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(audio_path, media_type="audio/wav")


@app.post("/voice-training/dataset")
def save_dataset_sample(
    phrase_index: int = Form(...),
    phrase_text: str = Form(...),
    audio: UploadFile = File(...),
) -> dict[str, Any]:
    dataset_dir = Path("backend/voice/datasets/default")
    dataset_dir.mkdir(parents=True, exist_ok=True)

    target_index = max(1, int(phrase_index))
    target_path = dataset_dir / f"{target_index:03d}.wav"
    target_path.write_bytes(audio.file.read())

    metadata_path = dataset_dir / "metadata.json"
    metadata: dict[str, Any] = {
        "dataset_name": "default",
        "created_at": "",
        "sample_count": 0,
        "samples": [],
    }
    if metadata_path.exists():
        try:
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            metadata = {
                "dataset_name": "default",
                "created_at": "",
                "sample_count": 0,
                "samples": [],
            }

    metadata["created_at"] = metadata.get("created_at") or ""
    existing_samples = [sample for sample in metadata.get("samples", []) if sample.get("phrase_index") != target_index]
    existing_samples.append(
        {
            "phrase_index": target_index,
            "phrase_text": phrase_text,
            "file_name": target_path.name,
            "saved_path": str(target_path),
        }
    )
    existing_samples.sort(key=lambda item: int(item["phrase_index"]))
    metadata["samples"] = existing_samples
    metadata["sample_count"] = len(existing_samples)
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    return {
        "file_name": target_path.name,
        "saved_path": str(target_path),
        "phrase_index": target_index,
        "phrase_text": phrase_text,
    }

