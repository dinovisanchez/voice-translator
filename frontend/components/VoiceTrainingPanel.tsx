"use client";

import { useState } from "react";

interface VoiceTrainingPanelProps {
  onTrainingComplete?: (message: string) => void;
}

export function VoiceTrainingPanel({ onTrainingComplete }: VoiceTrainingPanelProps) {
  const [isTraining, setIsTraining] = useState(false);
  const [status, setStatus] = useState("Record about one minute of speech to build a local voice profile.");

  async function handleTrainingSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("voiceSample") as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!file) {
      setStatus("Please select a recording file first.");
      return;
    }

    setIsTraining(true);
    setStatus("Uploading and analyzing your voice sample locally...");

    const formData = new FormData();
    formData.append("audio", file);
    formData.append("profile_name", "default");

    try {
      const response = await fetch("http://127.0.0.1:8000/voice-training", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Training failed");
      }

      const data = await response.json();
      setStatus(`Voice profile ready. Duration: ${data.duration_seconds}s`);
      onTrainingComplete?.(`Voice profile saved for ${data.profile_name}`);
    } catch (error) {
      setStatus("Voice training failed. Please try again with a clearer sample.");
      console.error(error);
    } finally {
      setIsTraining(false);
    }
  }

  return (
    <form onSubmit={handleTrainingSubmit} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="mb-4">
        <h3 className="text-xl font-semibold">Voice Training</h3>
        <p className="mt-2 text-sm text-slate-400">
          Capture a sample of your voice to shape future synthetic outputs with a local profile.
        </p>
      </div>

      <input
        type="file"
        name="voiceSample"
        accept="audio/*"
        className="block w-full rounded-2xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-slate-200"
      />

      <button
        type="submit"
        disabled={isTraining}
        className="mt-4 rounded-full bg-emerald-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isTraining ? "Training..." : "Train Voice Profile"}
      </button>

      <p className="mt-4 text-sm text-slate-400">{status}</p>
    </form>
  );
}