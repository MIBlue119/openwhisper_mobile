import * as WhisperKitModule from "@/modules/whisperkit/src";
import type { TranscriptionResult } from "@/modules/whisperkit/src";
import * as Network from "expo-network";
import { storage } from "@/src/storage/mmkv";
import { SettingKeys } from "@/src/hooks/useSettings";

export interface TranscriptionOptions {
  audioPath: string;
  language?: string;
  customDictionary?: string[];
}

/**
 * Service that handles the full local transcription pipeline:
 * audio file → WhisperKit → transcription text
 */
export async function transcribeLocal(
  options: TranscriptionOptions
): Promise<TranscriptionResult> {
  const { audioPath, language, customDictionary } = options;

  // Build prompt from custom dictionary (improves recognition of specific words)
  const prompt =
    customDictionary && customDictionary.length > 0
      ? customDictionary.join(", ")
      : undefined;

  // Use language from settings if not explicitly provided
  const lang = language ?? storage.getString(SettingKeys.LANGUAGE) ?? undefined;
  const effectiveLang = lang === "auto" ? undefined : lang;

  return WhisperKitModule.transcribe(audioPath, effectiveLang, prompt);
}

/**
 * Initialize WhisperKit with the user's selected model.
 * Falls back to recommended model if none selected.
 */
export async function initializeWithSelectedModel(): Promise<boolean> {
  let model = storage.getString(SettingKeys.WHISPER_MODEL);

  if (!model) {
    // Get device-recommended model
    model = await WhisperKitModule.getRecommendedModel();
    storage.set(SettingKeys.WHISPER_MODEL, model);
  }

  // Check if model is downloaded
  const isDownloaded = await WhisperKitModule.isModelDownloaded(model);
  if (!isDownloaded) {
    return false;
  }

  return WhisperKitModule.initialize(model);
}

/**
 * Check available disk space before downloading a model.
 * Returns true if enough space, false otherwise.
 */
export async function checkDiskSpaceForModel(
  modelSizeBytes: number
): Promise<{ hasSpace: boolean; availableBytes: number }> {
  const available = await WhisperKitModule.getAvailableDiskSpace();
  // Require 20% extra space as buffer
  const required = Math.ceil(modelSizeBytes * 1.2);
  return {
    hasSpace: available >= required,
    availableBytes: Number(available),
  };
}

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const CELLULAR_WARNING_THRESHOLD = 100 * 1024 * 1024; // 100 MB

/**
 * Check if downloading a model on cellular should trigger a warning.
 * Returns { shouldWarn: true } if on cellular and model exceeds 100MB.
 */
export async function checkNetworkForDownload(
  modelSizeBytes: number
): Promise<{ shouldWarn: boolean; networkType: string }> {
  try {
    const networkState = await Network.getNetworkStateAsync();
    const isCellular =
      networkState.type === Network.NetworkStateType.CELLULAR;
    return {
      shouldWarn: isCellular && modelSizeBytes > CELLULAR_WARNING_THRESHOLD,
      networkType: isCellular ? "cellular" : "wifi",
    };
  } catch {
    // If we can't determine network type, don't block the download
    return { shouldWarn: false, networkType: "unknown" };
  }
}

/**
 * Check if a model is larger than the recommended model for this device.
 * Returns a warning message if the model may cause performance issues.
 */
export async function getModelCompatibilityWarning(
  modelName: string,
  modelSizeBytes: number,
  recommendedModel: string | null
): Promise<string | null> {
  if (!recommendedModel) return null;

  try {
    const models = await WhisperKitModule.getAvailableModels();
    const recommended = models.find((m) => m.name === recommendedModel);
    if (!recommended) return null;

    // Warn if model is significantly larger than recommended (>2x size)
    if (modelSizeBytes > recommended.sizeBytes * 2) {
      return `This model (${formatBytes(modelSizeBytes)}) is much larger than the recommended model for your device (${recommended.displayName}, ${formatBytes(recommended.sizeBytes)}). It may cause slow transcription or memory issues.`;
    }
  } catch {
    // Non-critical, skip warning
  }
  return null;
}
