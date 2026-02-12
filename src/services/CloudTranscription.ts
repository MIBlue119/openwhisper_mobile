import { getTranscriptionBaseUrl } from "@/src/models/ModelRegistry";
import type { TranscriptionProviderId } from "@/src/models/ModelRegistry";

export interface CloudTranscriptionOptions {
  audioPath: string;
  provider: TranscriptionProviderId;
  model: string;
  apiKey: string;
  language?: string;
  customDictionary?: string[];
}

export interface CloudTranscriptionResult {
  text: string;
}

/**
 * Transcribe audio using a cloud provider (OpenAI, Groq, or Mistral).
 * All providers use the same multipart/form-data format.
 */
export async function transcribeCloud(
  options: CloudTranscriptionOptions
): Promise<CloudTranscriptionResult> {
  const { audioPath, provider, model, apiKey, language, customDictionary } =
    options;

  const baseUrl = getTranscriptionBaseUrl(provider);
  const endpoint = `${baseUrl}/audio/transcriptions`;

  // Determine file extension from path
  const ext = audioPath.split(".").pop() ?? "wav";
  const mimeType =
    ext === "wav"
      ? "audio/wav"
      : ext === "m4a"
        ? "audio/mp4"
        : `audio/${ext}`;

  // Build form data — React Native supports file URIs directly
  const formData = new FormData();
  formData.append("file", {
    uri: audioPath,
    name: `audio.${ext}`,
    type: mimeType,
  } as unknown as Blob);
  formData.append("model", model);

  if (language && language !== "auto") {
    formData.append("language", language);
  }

  // Build prompt from custom dictionary
  if (customDictionary && customDictionary.length > 0) {
    formData.append("prompt", customDictionary.join(", "));
  }

  // Mistral uses different auth header
  const headers: Record<string, string> =
    provider === "mistral"
      ? { "x-api-key": apiKey }
      : { Authorization: `Bearer ${apiKey}` };

  // 60s timeout for cloud transcription
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "Cloud transcription timed out. Check your internet connection and try again."
      );
    }
    throw new Error(
      "Network error — could not reach transcription service. Check your internet connection."
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    if (response.status === 401) {
      throw new Error(
        `Invalid ${provider} API key. Check your key in Settings → API Keys.`
      );
    }
    if (response.status === 429) {
      throw new Error(
        `${provider} rate limit exceeded. Please wait a moment and try again.`
      );
    }
    throw new Error(
      `${provider} transcription failed (${response.status}): ${errorBody}`
    );
  }

  const data = await response.json();
  return { text: data.text ?? "" };
}
