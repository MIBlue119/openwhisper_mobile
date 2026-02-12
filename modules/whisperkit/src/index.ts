import {
  requireOptionalNativeModule,
  type EventSubscription,
} from "expo-modules-core";

export interface TranscriptionResult {
  text: string;
  language: string;
  segments: TranscriptionSegment[];
  durationMs: number;
}

export interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
}

export interface ModelInfo {
  name: string;
  displayName: string;
  sizeBytes: number;
  isDownloaded: boolean;
}

export interface DownloadProgressEvent {
  modelName: string;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
}

export interface DownloadCompleteEvent {
  modelName: string;
  success: boolean;
  error?: string;
}

type WhisperKitEventsMap = {
  onDownloadProgress: (event: DownloadProgressEvent) => void;
  onDownloadComplete: (event: DownloadCompleteEvent) => void;
};

interface WhisperKitNativeModule {
  initialize(model: string): Promise<boolean>;
  transcribe(
    audioPath: string,
    language: string | null,
    prompt: string | null
  ): Promise<TranscriptionResult>;
  downloadModel(name: string): Promise<boolean>;
  deleteModel(name: string): Promise<boolean>;
  getAvailableModels(): Promise<ModelInfo[]>;
  getDownloadedModels(): Promise<string[]>;
  isModelDownloaded(name: string): Promise<boolean>;
  getRecommendedModel(): Promise<string>;
  getAvailableDiskSpace(): Promise<number>;
  addListener<K extends keyof WhisperKitEventsMap>(
    eventName: K,
    listener: WhisperKitEventsMap[K]
  ): EventSubscription;
  removeAllListeners(eventName: keyof WhisperKitEventsMap): void;
}

const WhisperKitNative =
  requireOptionalNativeModule<WhisperKitNativeModule>("WhisperKitModule");

function getNativeModule(): WhisperKitNativeModule {
  if (!WhisperKitNative) {
    throw new Error(
      "WhisperKitModule native module is not available. " +
        "Run 'npx expo run:ios' to rebuild the native app with the module included."
    );
  }
  return WhisperKitNative;
}

/**
 * Check if the WhisperKit native module is available.
 */
export function isAvailable(): boolean {
  return WhisperKitNative != null;
}

/**
 * Initialize WhisperKit with a specific model.
 */
export async function initialize(model: string): Promise<boolean> {
  return getNativeModule().initialize(model);
}

/**
 * Transcribe an audio file using the loaded WhisperKit model.
 */
export async function transcribe(
  audioPath: string,
  language?: string,
  prompt?: string
): Promise<TranscriptionResult> {
  return getNativeModule().transcribe(
    audioPath,
    language ?? null,
    prompt ?? null
  );
}

/**
 * Download a WhisperKit model with progress events.
 */
export async function downloadModel(name: string): Promise<boolean> {
  return getNativeModule().downloadModel(name);
}

/**
 * Delete a downloaded model to free disk space.
 */
export async function deleteModel(name: string): Promise<boolean> {
  return getNativeModule().deleteModel(name);
}

/**
 * Get list of available models with metadata.
 */
export async function getAvailableModels(): Promise<ModelInfo[]> {
  return getNativeModule().getAvailableModels();
}

/**
 * Get list of model names that are already downloaded.
 */
export async function getDownloadedModels(): Promise<string[]> {
  return getNativeModule().getDownloadedModels();
}

/**
 * Check if a specific model is downloaded.
 */
export async function isModelDownloaded(name: string): Promise<boolean> {
  return getNativeModule().isModelDownloaded(name);
}

/**
 * Get WhisperKit's recommended model for this device.
 */
export async function getRecommendedModel(): Promise<string> {
  return getNativeModule().getRecommendedModel();
}

/**
 * Get available disk space in bytes.
 */
export async function getAvailableDiskSpace(): Promise<number> {
  return getNativeModule().getAvailableDiskSpace();
}

/**
 * Subscribe to model download progress events.
 */
export function addDownloadProgressListener(
  listener: (event: DownloadProgressEvent) => void
): EventSubscription {
  return getNativeModule().addListener("onDownloadProgress", listener);
}

/**
 * Subscribe to model download completion events.
 */
export function addDownloadCompleteListener(
  listener: (event: DownloadCompleteEvent) => void
): EventSubscription {
  return getNativeModule().addListener("onDownloadComplete", listener);
}
