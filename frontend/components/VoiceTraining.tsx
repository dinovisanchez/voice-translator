"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { API_URL } from "../services/config";

interface RecordingSummary {
  phraseIndex: number;
  phraseText: string;
  fileName: string;
  transcription?: string;
}

const PHRASES = [
  "Hola, soy un usuario nuevo en esta aplicación.",
  "Quiero preparar un conjunto de voz para entrenar más adelante.",
  "Voy a leer esta frase con calma y claridad.",
  "La pronunciación debe sonar natural y consistente.",
  "Cada grabación ayudará a construir un mejor perfil de voz.",
  "Estoy listo para comenzar la colección de muestras.",
  "Este ejercicio es parte del proceso de preparación del dataset.",
  "La voz debe ser clara, estable y cercana al tono habitual.",
  "Estoy grabando una frase corta para validar el flujo.",
  "La siguiente muestra será un poco más expresiva.",
  "Gracias por ayudar a preparar el conjunto de entrenamiento.",
  "Esta frase sirve para comprobar la calidad del audio capturado.",
  "El sistema solo necesita ejemplos bien grabados.",
  "Cada muestra se almacenará con un nombre secuencial.",
  "El dataset está listo para ser revisado y ampliado.",
];

const MAX_DURATION_SEC = 6;

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export function VoiceTraining() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState(MAX_DURATION_SEC);
  const [status, setStatus] = useState("Listo para comenzar el entrenamiento guiado.");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recordings, setRecordings] = useState<RecordingSummary[]>([]);
  const [transcription, setTranscription] = useState("");
  const [translation, setTranslation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processNodeRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      void audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!isRecording) return undefined;

    const tick = () => {
      const now = Date.now();
      if (!startTimeRef.current) {
        startTimeRef.current = now;
      }
      const diffSec = Math.min(MAX_DURATION_SEC, Math.floor((now - startTimeRef.current) / 1000));
      setElapsed(diffSec);
      setRemaining(Math.max(0, MAX_DURATION_SEC - diffSec));

      if (diffSec >= MAX_DURATION_SEC) {
        void stopRecording();
      }
    };

    timerRef.current = window.setInterval(tick, 250);
    tick();

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const progressPercent = useMemo(() => (elapsed / MAX_DURATION_SEC) * 100, [elapsed]);
  const currentPhrase = PHRASES[currentIndex];
  const isTrainingComplete = recordings.length >= PHRASES.length;

  const stopRecording = async () => {
    if (!isRecording) return;

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const stream = mediaStreamRef.current;
    const audioContext = audioContextRef.current;
    const sourceNode = sourceNodeRef.current;
    const processNode = processNodeRef.current;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (sourceNode && processNode) {
      sourceNode.disconnect();
      processNode.disconnect();
    }

    if (audioContext) {
      await audioContext.close();
    }

    const totalSamples = chunksRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
    const mergedSamples = new Float32Array(totalSamples);
    let offset = 0;
    chunksRef.current.forEach((chunk) => {
      mergedSamples.set(chunk, offset);
      offset += chunk.length;
    });

    const blob = encodeWav(mergedSamples, audioContext?.sampleRate ?? 44100);
    const phraseIndex = currentIndex + 1;

    console.log("[2] Recording stopped", {
      phraseIndex,
      phraseText: currentPhrase,
      sampleCount: mergedSamples.length,
    });

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("audio", blob, "capture.wav");
      uploadFormData.append("phrase_index", String(phraseIndex));
      uploadFormData.append("phrase_text", currentPhrase);

      console.log("Awaiting upload...");
      const datasetResponse = await fetch(`${API_URL}/voice-training/dataset`, {
        method: "POST",
        body: uploadFormData,
      });
      console.log("Upload OK", datasetResponse.status);

      if (!datasetResponse.ok) {
        throw new Error("No se pudo guardar la grabación.");
      }

      console.log("[3] Audio uploaded", {
        phraseIndex,
        phraseText: currentPhrase,
      });

      const payload = await datasetResponse.json();
      console.log("Upload payload", payload);

      const transcriptionFormData = new FormData();
      transcriptionFormData.append("audio", blob, "capture.wav");

      console.log("Awaiting transcription...");
      const transcribeResponse = await fetch(`${API_URL}/api/v1/transcribe`, {
        method: "POST",
        body: transcriptionFormData,
      });
      console.log("Transcription status", transcribeResponse.status);

      if (!transcribeResponse.ok) {
        throw new Error("No se pudo transcribir la grabación.");
      }

      const transcriptionPayload = await transcribeResponse.json();
      const recognition = transcriptionPayload.text || "";
      console.log("Transcription:", transcriptionPayload);
      setTranscription(recognition);
      console.log("[4] Transcription completed", {
        phraseIndex,
        recognition,
      });

      console.log("Awaiting translation...");
      const translateResponse = await fetch(`${API_URL}/api/v1/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: recognition,
          source_language: transcriptionPayload.language || "es",
          target_language: "en",
        }),
      });
      console.log("Translation status", translateResponse.status);

      if (!translateResponse.ok) {
        throw new Error("No se pudo traducir la grabación.");
      }

      const translationPayload = await translateResponse.json();
      const translatedText = translationPayload.translated || "";
      console.log("Translation:", translationPayload);
      setTranslation(translatedText);
      console.log("[5] Translation completed", {
        phraseIndex,
        translatedText,
      });

      const synthesizeResponse = await fetch(`${API_URL}/api/v1/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: translatedText }),
      });

      if (!synthesizeResponse.ok) {
        throw new Error("No se pudo generar el audio.");
      }

      const synthesizePayload = await synthesizeResponse.json();
      if (synthesizePayload.audio_url) {
        const audio = new Audio(synthesizePayload.audio_url);
        void audio.play();
      }

      const nextRecording: RecordingSummary = {
        phraseIndex,
        phraseText: currentPhrase,
        fileName: payload.file_name,
        transcription: recognition,
      };
      setRecordings((prev) => {
        const next = [...prev, nextRecording];
        console.log("Completed recordings updated", next.length, next);
        return next;
      });

      console.log("Current:", currentPhrase);
      console.log("Next:", currentPhrase + 1);

      if (phraseIndex >= PHRASES.length) {
        console.log("[6] Phrase marked as completed", {
          phraseIndex,
          completed: true,
        });
        setStatus("Entrenamiento completado");
      } else {
        console.log("[6] Phrase marked as completed", {
          phraseIndex,
          completed: true,
        });
        console.log("[7] Current phrase index:", phraseIndex);
        setCurrentIndex((prev) => {
          const nextIndex = prev + 1;
          console.log("[8] Moving to phrase", nextIndex + 1);
          console.log("Current index before update", prev);
          console.log("Next index after update", nextIndex);
          return nextIndex;
        });
        setStatus(`Frase ${phraseIndex} completada. Avanzando a la siguiente.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo completar el proceso.";
      console.error("[ERROR] Exception in voice training pipeline", error);
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
      setErrorMessage(message);
      setStatus(`Error en la frase ${phraseIndex}: ${message}`);
    } finally {
      setIsRecording(false);
      setElapsed(0);
      setRemaining(MAX_DURATION_SEC);
      chunksRef.current = [];
      startTimeRef.current = null;
      mediaStreamRef.current = null;
      sourceNodeRef.current = null;
      processNodeRef.current = null;
      audioContextRef.current = null;
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("El navegador no permite capturar audio desde el micrófono.");
      return;
    }

    try {
      setErrorMessage("");
      setTranscription("");
      setTranslation("");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextCtor = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error("AudioContext not supported");
      }

      const audioContext = new AudioContextCtor();
      const sourceNode = audioContext.createMediaStreamSource(stream);
      const processNode = audioContext.createScriptProcessor(4096, 1, 1);

      processNode.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(input));
      };

      sourceNode.connect(processNode);
      processNode.connect(audioContext.destination);

      startTimeRef.current = null;
      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceNodeRef.current = sourceNode;
      processNodeRef.current = processNode;
      setIsRecording(true);
      console.log("[1] Recording started", {
        phraseIndex: currentIndex + 1,
        phraseText: currentPhrase,
      });
      setStatus(`Grabando frase ${currentIndex + 1} de ${PHRASES.length}`);
    } catch {
      setStatus("No se pudo iniciar la grabación. Revisa el permiso del micrófono.");
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#111827,_#030712)] px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-sm uppercase tracking-[0.35em] text-slate-400">Voice Training</p>
              <h1 className="text-4xl font-semibold sm:text-5xl">Entrenamiento guiado de voz</h1>
              <p className="mt-4 max-w-2xl text-lg text-slate-400">
                Se muestra una frase por vez. Solo puedes grabar la frase activa y cada muestra se guarda en el dataset local.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {status}
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/20">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Frase activa</p>
                  <h2 className="text-2xl font-semibold">{currentIndex + 1} / {PHRASES.length}</h2>
                </div>
                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
                  {isRecording ? "Grabando" : "Esperando"}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Lee esta frase</p>
                <p className="mt-3 text-xl text-white">“{currentPhrase}”</p>

                {errorMessage ? (
                  <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                    <p className="text-sm uppercase tracking-[0.3em] text-rose-300">Error</p>
                    <p className="mt-2 text-base text-rose-50">{errorMessage}</p>
                  </div>
                ) : null}

                {transcription ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Transcripción</p>
                      <p className="mt-2 text-base text-emerald-50">{transcription}</p>
                    </div>
                    <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
                      <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Traducción</p>
                      <p className="mt-2 text-base text-sky-50">{translation || "Traduciendo..."}</p>
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 flex items-end justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Tiempo</p>
                    <p className="text-4xl font-semibold text-white">{elapsed}s</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Restan</p>
                    <p className="text-4xl font-semibold text-emerald-300">{remaining}s</p>
                  </div>
                </div>

                <div className="mt-4 h-2 rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={isRecording || isTrainingComplete}
                    className="rounded-full bg-emerald-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Iniciar grabación
                  </button>
                  <button
                    type="button"
                    disabled={!isTrainingComplete}
                    className="rounded-full border border-white/10 bg-white/10 px-5 py-3 font-medium text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Entrenar voz
                  </button>
                  <button
                    type="button"
                    onClick={() => void stopRecording()}
                    disabled={!isRecording}
                    className="rounded-full border border-white/10 bg-white/10 px-5 py-3 font-medium text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Detener grabación
                  </button>
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Dataset local</p>
                <h2 className="text-2xl font-semibold">backend/voice/datasets/default</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-slate-300">
                {recordings.length}/{PHRASES.length}
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {PHRASES.map((phrase, index) => {
                const completed = recordings.some((entry) => entry.phraseIndex === index + 1);
                return (
                  <div key={phrase} className={`rounded-2xl border p-4 ${completed ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-white/5"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-100">{String(index + 1).padStart(3, "0")}. {phrase}</p>
                        <p className="text-sm text-slate-400">
                          {completed ? (recordings.find((entry) => entry.phraseIndex === index + 1)?.transcription ? "Transcrita" : "Grabación lista") : "Pendiente"}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs ${completed ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-slate-300"}`}>
                        {completed ? "OK" : "PENDING"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
