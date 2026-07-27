"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface VoiceRecorderProps {
  onStatusChange?: (status: string) => void;
}

export function VoiceRecorder({ onStatusChange }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const statusLabel = useMemo(() => {
    if (!isReady) return "Preparing microphone";
    return isRecording ? "Recording" : "Ready";
  }, [isReady, isRecording]);

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Your browser does not support audio recording");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const webmBlob = new Blob(chunksRef.current, { type: "audio/webm" });
      const wavBlob = webmBlob;
      const url = URL.createObjectURL(wavBlob);
      setAudioUrl(url);
      stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setIsReady(true);
      onStatusChange?.("Recording complete");
    };

    recorder.start();
    setIsRecording(true);
    setIsReady(true);
    onStatusChange?.("Recording started");
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const playRecording = () => {
    if (audioUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
      }
      audioRef.current.play().catch(() => undefined);
    }
  };

  const downloadRecording = () => {
    if (!audioUrl) return;
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = "voice-recording.wav";
    link.click();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Studio</p>
          <h3 className="text-lg font-semibold">Professional Recorder</h3>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
          {statusLabel}
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={startRecording}
          disabled={isRecording}
          className="rounded-full bg-emerald-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Start Recording
        </button>
        <button
          type="button"
          onClick={stopRecording}
          disabled={!isRecording}
          className="rounded-full border border-white/10 bg-white/10 px-5 py-3 font-medium text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Stop Recording
        </button>
        <button
          type="button"
          onClick={playRecording}
          disabled={!audioUrl}
          className="rounded-full border border-white/10 bg-white/10 px-5 py-3 font-medium text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Play
        </button>
        <button
          type="button"
          onClick={downloadRecording}
          disabled={!audioUrl}
          className="rounded-full border border-white/10 bg-white/10 px-5 py-3 font-medium text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Download WAV
        </button>
      </div>
    </div>
  );
}
