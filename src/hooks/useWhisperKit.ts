import { useCallback, useEffect, useRef, useState } from "react";
import * as WhisperKitModule from "@/modules/whisperkit/src";
import type {
  ModelInfo,
  DownloadProgressEvent,
  DownloadCompleteEvent,
} from "@/modules/whisperkit/src";

interface WhisperKitState {
  isInitialized: boolean;
  isLoading: boolean;
  currentModel: string | null;
  availableModels: ModelInfo[];
  downloadProgress: Record<string, number>;
  recommendedModel: string | null;
  error: string | null;
}

interface UseWhisperKitReturn extends WhisperKitState {
  initialize: (model: string) => Promise<boolean>;
  downloadModel: (name: string) => Promise<boolean>;
  deleteModel: (name: string) => Promise<boolean>;
  refreshModels: () => Promise<void>;
  transcribe: (
    audioPath: string,
    language?: string,
    prompt?: string
  ) => Promise<WhisperKitModule.TranscriptionResult>;
}

export function useWhisperKit(): UseWhisperKitReturn {
  const [state, setState] = useState<WhisperKitState>({
    isInitialized: false,
    isLoading: false,
    currentModel: null,
    availableModels: [],
    downloadProgress: {},
    recommendedModel: null,
    error: null,
  });

  const progressSubRef = useRef<ReturnType<
    typeof WhisperKitModule.addDownloadProgressListener
  > | null>(null);
  const completeSubRef = useRef<ReturnType<
    typeof WhisperKitModule.addDownloadCompleteListener
  > | null>(null);

  // Subscribe to download events
  useEffect(() => {
    if (!WhisperKitModule.isAvailable()) return;

    progressSubRef.current = WhisperKitModule.addDownloadProgressListener(
      (event: DownloadProgressEvent) => {
        setState((prev) => ({
          ...prev,
          downloadProgress: {
            ...prev.downloadProgress,
            [event.modelName]: event.progress,
          },
        }));
      }
    );

    completeSubRef.current = WhisperKitModule.addDownloadCompleteListener(
      (event: DownloadCompleteEvent) => {
        setState((prev) => {
          const newProgress = { ...prev.downloadProgress };
          delete newProgress[event.modelName];

          return {
            ...prev,
            downloadProgress: newProgress,
            error: event.success ? prev.error : event.error ?? "Download failed",
          };
        });

        // Refresh model list after download
        if (event.success) {
          refreshModels();
        }
      }
    );

    return () => {
      progressSubRef.current?.remove();
      completeSubRef.current?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load available models and recommended model on mount
  useEffect(() => {
    if (!WhisperKitModule.isAvailable()) {
      setState((prev) => ({
        ...prev,
        error: "WhisperKit native module not available. Rebuild with 'npx expo run:ios'.",
      }));
      return;
    }
    refreshModels();
    loadRecommendedModel();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshModels = useCallback(async () => {
    try {
      const models = await WhisperKitModule.getAvailableModels();
      setState((prev) => ({ ...prev, availableModels: models }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load models";
      setState((prev) => ({ ...prev, error: message }));
    }
  }, []);

  const loadRecommendedModel = useCallback(async () => {
    try {
      const recommended = await WhisperKitModule.getRecommendedModel();
      setState((prev) => ({ ...prev, recommendedModel: recommended }));
    } catch {
      // Non-critical, can continue without recommendation
    }
  }, []);

  const initialize = useCallback(async (model: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const success = await WhisperKitModule.initialize(model);
      setState((prev) => ({
        ...prev,
        isInitialized: success,
        isLoading: false,
        currentModel: success ? model : null,
      }));
      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to initialize WhisperKit";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isInitialized: false,
        error: message,
      }));
      return false;
    }
  }, []);

  const downloadModel = useCallback(
    async (name: string): Promise<boolean> => {
      setState((prev) => ({
        ...prev,
        downloadProgress: { ...prev.downloadProgress, [name]: 0 },
        error: null,
      }));
      try {
        return await WhisperKitModule.downloadModel(name);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Download failed";
        setState((prev) => {
          const newProgress = { ...prev.downloadProgress };
          delete newProgress[name];
          return { ...prev, downloadProgress: newProgress, error: message };
        });
        return false;
      }
    },
    []
  );

  const deleteModel = useCallback(
    async (name: string): Promise<boolean> => {
      try {
        const success = await WhisperKitModule.deleteModel(name);
        if (success) {
          await refreshModels();
          if (state.currentModel === name) {
            setState((prev) => ({
              ...prev,
              isInitialized: false,
              currentModel: null,
            }));
          }
        }
        return success;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete model";
        setState((prev) => ({ ...prev, error: message }));
        return false;
      }
    },
    [state.currentModel, refreshModels]
  );

  const transcribe = useCallback(
    async (
      audioPath: string,
      language?: string,
      prompt?: string
    ): Promise<WhisperKitModule.TranscriptionResult> => {
      if (!state.isInitialized) {
        throw new Error("WhisperKit is not initialized");
      }
      return WhisperKitModule.transcribe(audioPath, language, prompt);
    },
    [state.isInitialized]
  );

  return {
    ...state,
    initialize,
    downloadModel,
    deleteModel,
    refreshModels,
    transcribe,
  };
}
