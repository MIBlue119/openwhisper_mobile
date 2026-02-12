import { useCallback, useSyncExternalStore } from "react";
import { storage } from "@/src/storage/mmkv";

export const SettingKeys = {
  WHISPER_MODEL: "whisperModel",
  USE_LOCAL_WHISPER: "useLocalWhisper",
  LANGUAGE: "language",
  AGENT_NAME: "agentName",
  REASONING_MODEL: "reasoningModel",
  REASONING_PROVIDER: "reasoningProvider",
  REASONING_ENABLED: "reasoningEnabled",
  CLOUD_TRANSCRIPTION_PROVIDER: "cloudTranscriptionProvider",
  CLOUD_TRANSCRIPTION_MODEL: "cloudTranscriptionModel",
  HAS_COMPLETED_ONBOARDING: "hasCompletedOnboarding",
  CUSTOM_DICTIONARY: "customDictionary",
  AUTO_COPY: "autoCopy",
  THEME: "theme",
} as const;

type SettingKey = (typeof SettingKeys)[keyof typeof SettingKeys];

function useSetting(key: SettingKey): [string | undefined, (value: string) => void] {
  const subscribe = useCallback(
    (callback: () => void) => {
      const listener = storage.addOnValueChangedListener((changedKey: string) => {
        if (changedKey === key) callback();
      });
      return () => listener.remove();
    },
    [key]
  );

  const getSnapshot = useCallback(() => storage.getString(key), [key]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setValue = useCallback(
    (newValue: string) => {
      storage.set(key, newValue);
    },
    [key]
  );

  return [value, setValue];
}

function useBooleanSetting(key: SettingKey, defaultValue = false): [boolean, (value: boolean) => void] {
  const subscribe = useCallback(
    (callback: () => void) => {
      const listener = storage.addOnValueChangedListener((changedKey: string) => {
        if (changedKey === key) callback();
      });
      return () => listener.remove();
    },
    [key]
  );

  const getSnapshot = useCallback(
    () => storage.getBoolean(key) ?? defaultValue,
    [key, defaultValue]
  );

  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setValue = useCallback(
    (newValue: boolean) => {
      storage.set(key, newValue);
    },
    [key]
  );

  return [value, setValue];
}

export function useLanguage() {
  return useSetting(SettingKeys.LANGUAGE);
}

export function useAgentName() {
  return useSetting(SettingKeys.AGENT_NAME);
}

export function useWhisperModel() {
  return useSetting(SettingKeys.WHISPER_MODEL);
}

export function useLocalWhisper() {
  return useBooleanSetting(SettingKeys.USE_LOCAL_WHISPER, true);
}

export function useHasCompletedOnboarding() {
  return useBooleanSetting(SettingKeys.HAS_COMPLETED_ONBOARDING, false);
}

export function useAutoCopy() {
  return useBooleanSetting(SettingKeys.AUTO_COPY, false);
}

export function useReasoningProvider() {
  return useSetting(SettingKeys.REASONING_PROVIDER);
}

export function useReasoningModel() {
  return useSetting(SettingKeys.REASONING_MODEL);
}

export function useReasoningEnabled() {
  return useBooleanSetting(SettingKeys.REASONING_ENABLED, false);
}

export function useCloudTranscriptionProvider() {
  return useSetting(SettingKeys.CLOUD_TRANSCRIPTION_PROVIDER);
}

export function useCloudTranscriptionModel() {
  return useSetting(SettingKeys.CLOUD_TRANSCRIPTION_MODEL);
}
