import { useCallback } from "react";
import { storage } from "@/src/storage/mmkv";
import { getSecureValue, SecureKeys } from "@/src/storage/secureStorage";
import { SettingKeys } from "@/src/hooks/useSettings";
import { transcribeLocal } from "@/src/services/WhisperKitService";
import { transcribeCloud } from "@/src/services/CloudTranscription";
import { processReasoning } from "@/src/services/ReasoningService";
import { useTranscriptionStore } from "@/src/stores/transcriptionStore";
import type { TranscriptionProviderId, ReasoningProviderId } from "@/src/models/ModelRegistry";

export interface TranscriptionResult {
  text: string;
  wasProcessed: boolean;
}

function getCustomDictionary(): string[] {
  const raw = storage.getString(SettingKeys.CUSTOM_DICTIONARY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Get the API key for a transcription provider.
 */
async function getTranscriptionApiKey(
  provider: TranscriptionProviderId
): Promise<string> {
  let key: string | null = null;
  switch (provider) {
    case "openai":
      key = await getSecureValue(SecureKeys.OPENAI_API_KEY);
      break;
    case "groq":
      key = await getSecureValue(SecureKeys.GROQ_API_KEY);
      break;
    case "mistral":
      key = await getSecureValue(SecureKeys.MISTRAL_API_KEY);
      break;
  }
  if (!key) {
    throw new Error(
      `No API key for ${provider}. Add one in Settings → API Keys.`
    );
  }
  return key;
}

/**
 * Hook that orchestrates the full transcription pipeline:
 * 1. Route to local (WhisperKit) or cloud based on settings
 * 2. Optionally pipe through AI reasoning
 * 3. Return final text
 */
export function useTranscription() {
  const addTranscription = useTranscriptionStore((s) => s.addTranscription);

  const transcribe = useCallback(
    async (audioPath: string): Promise<TranscriptionResult> => {
      const useLocal =
        storage.getBoolean(SettingKeys.USE_LOCAL_WHISPER) ?? true;
      const language = storage.getString(SettingKeys.LANGUAGE) ?? "auto";
      const customDictionary = getCustomDictionary();

      let transcribedText: string;
      let modelUsed: string | undefined;

      if (useLocal) {
        const result = await transcribeLocal({
          audioPath,
          language: language === "auto" ? undefined : language,
          customDictionary,
        });
        transcribedText = result.text;
        modelUsed = storage.getString(SettingKeys.WHISPER_MODEL) ?? "whisperkit";
      } else {
        const provider = (storage.getString(
          SettingKeys.CLOUD_TRANSCRIPTION_PROVIDER
        ) ?? "openai") as TranscriptionProviderId;
        const model =
          storage.getString(SettingKeys.CLOUD_TRANSCRIPTION_MODEL) ??
          "gpt-4o-mini-transcribe";
        const apiKey = await getTranscriptionApiKey(provider);

        const result = await transcribeCloud({
          audioPath,
          provider,
          model,
          apiKey,
          language: language === "auto" ? undefined : language,
          customDictionary,
        });
        transcribedText = result.text;
        modelUsed = `${provider}/${model}`;
      }

      // Optionally pipe through AI reasoning
      const reasoningEnabled =
        storage.getBoolean(SettingKeys.REASONING_ENABLED) ?? false;
      const agentName = storage.getString(SettingKeys.AGENT_NAME);
      let wasProcessed = false;
      let processingMethod: string | undefined;

      if (reasoningEnabled && agentName) {
        const provider = (storage.getString(SettingKeys.REASONING_PROVIDER) ??
          "openai") as ReasoningProviderId;
        const model =
          storage.getString(SettingKeys.REASONING_MODEL) ?? "gpt-5-mini";

        const processed = await processReasoning(transcribedText, {
          provider,
          model,
          agentName,
          customDictionary,
        });

        if (processed) {
          transcribedText = processed;
          wasProcessed = true;
          processingMethod = `${provider}/${model}`;
        }
      }

      // Save to database
      addTranscription({
        text: transcribedText,
        modelUsed,
        isLocal: useLocal,
        wasProcessed,
        processingMethod,
      });

      return { text: transcribedText, wasProcessed };
    },
    [addTranscription]
  );

  return { transcribe };
}
