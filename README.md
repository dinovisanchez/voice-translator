# Voice Translator AI

Voice Translator AI is a local-first speech translation application built with Next.js and FastAPI. It supports:

- Professional audio capture with MediaRecorder
- Local audio upload processing
- Speech-to-text via Faster Whisper
- Translation with MarianMT-compatible local models
- Local audio synthesis for translated output
- Voice profile training for a custom voice signature

## Architecture

- Frontend: Next.js 16, React, TypeScript, Tailwind
- Backend: FastAPI
- Audio processing: soundfile, numpy
- Speech-to-text: faster-whisper
- Translation: transformers MarianMT models
- Voice profile: local JSON metadata under backend/voice

## Run locally

### Backend

```bash
cd /Users/macbook/voice-translator
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd /Users/macbook/voice-translator
npm install
npm run dev
```

Open http://localhost:3000

## Test flow

1. Start backend and frontend.
2. Open the app in your browser.
3. Record audio with the microphone.
4. Wait for transcription and translation.
5. Use Voice Training to upload a voice sample and build a local profile.

