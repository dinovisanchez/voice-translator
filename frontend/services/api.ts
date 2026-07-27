import { API_URL } from "./config";

const API_BASE_URL = API_URL;

export async function translateText(text: string, sourceLang: string, targetLang: string) {
  const response = await fetch(`${API_BASE_URL}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, source_lang: sourceLang, target_lang: targetLang }),
  });

  if (!response.ok) {
    throw new Error("Translation request failed");
  }

  return response.json();
}

export async function transcribeAudio(file: File) {
  const formData = new FormData();
  formData.append("audio", file);

  const response = await fetch(`${API_BASE_URL}/process-audio`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Audio processing request failed");
  }

  return response.json();
}
