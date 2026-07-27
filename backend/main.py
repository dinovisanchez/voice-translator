from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

BACKEND_ROOT = Path(__file__).resolve().parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

app = FastAPI(title="Voice Translator AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://voice-translator-p47s.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Voice Translator API"
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "voice-translator-ai"
    }


@app.post("/voice-training/dataset")
def save_dataset_sample(
    phrase_index: int = Form(...),
    phrase_text: str = Form(...),
    audio: UploadFile = File(...),
) -> dict[str, Any]:

    dataset_dir = Path("voice/datasets/default")
    dataset_dir.mkdir(parents=True, exist_ok=True)

    target_index = max(1, int(phrase_index))
    target_path = dataset_dir / f"{target_index:03d}.wav"

    with open(target_path, "wb") as f:
        f.write(audio.file.read())

    metadata_path = dataset_dir / "metadata.json"

    metadata = {
        "dataset_name": "default",
        "sample_count": 0,
        "samples": []
    }

    if metadata_path.exists():
        try:
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        except Exception:
            pass

    samples = [
        s
        for s in metadata.get("samples", [])
        if s.get("phrase_index") != target_index
    ]

    samples.append(
        {
            "phrase_index": target_index,
            "phrase_text": phrase_text,
            "file_name": target_path.name,
        }
    )

    samples.sort(key=lambda x: x["phrase_index"])

    metadata["samples"] = samples
    metadata["sample_count"] = len(samples)

    metadata_path.write_text(
        json.dumps(metadata, indent=2),
        encoding="utf-8",
    )

    return {
        "success": True,
        "file_name": target_path.name,
        "phrase_index": target_index,
    }