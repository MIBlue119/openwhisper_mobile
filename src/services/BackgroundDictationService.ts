/**
 * BackgroundDictationService
 *
 * Coordinates the recording → transcription → App Group write pipeline
 * triggered by the keyboard extension.
 *
 * Architecture:
 * 1. Keyboard extension writes `startRequested` to App Group UserDefaults
 * 2. Keyboard extension opens `openwhispr://dictate?session=<uuid>`
 * 3. This service activates AVAudioSession in background mode
 * 4. Records audio (16kHz mono WAV)
 * 5. Runs WhisperKit or cloud transcription
 * 6. Writes result to App Group UserDefaults
 * 7. Keyboard extension reads result and inserts text
 */

import { Audio, InterruptionModeIOS } from "expo-av";
import { AppState, type AppStateStatus } from "react-native";
import { storage } from "@/src/storage/mmkv";
import { getSecureValue, SecureKeys } from "@/src/storage/secureStorage";
import { SettingKeys } from "@/src/hooks/useSettings";
import { transcribeLocal } from "@/src/services/WhisperKitService";
import { transcribeCloud } from "@/src/services/CloudTranscription";
import { processReasoning } from "@/src/services/ReasoningService";
import { insertTranscription } from "@/src/storage/database";
import type {
  TranscriptionProviderId,
  ReasoningProviderId,
} from "@/src/models/ModelRegistry";

// ---------------------------------------------------------------------------
// Types matching the Swift DictationPhase / DictationState
// ---------------------------------------------------------------------------

export type DictationPhase =
  | "idle"
  | "start_requested"
  | "recording"
  | "transcribing"
  | "complete"
  | "error";

export interface DictationState {
  sessionId: string;
  phase: DictationPhase;
  text?: string;
  error?: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// App Group constants (must match targets/_shared/Constants.swift)
// ---------------------------------------------------------------------------

const APP_GROUP = "group.com.openwhispr.mobile";
const KEY_DICTATION_STATE = "com.openwhispr.dictation_state";
const KEY_BG_SESSION_ACTIVE = "com.openwhispr.bg_session_active";
const KEY_BG_SESSION_PING = "com.openwhispr.bg_session_ping";

// ---------------------------------------------------------------------------
// App Group UserDefaults access via NativeModules
// We need a thin bridge to read/write App Group UserDefaults from JS.
// For now, we use the MMKV shared storage as a proxy since MMKV is already
// configured with the App Group container.
// ---------------------------------------------------------------------------

function readDictationState(): DictationState | null {
  const raw = storage.getString(KEY_DICTATION_STATE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DictationState;
  } catch {
    return null;
  }
}

function writeDictationState(state: DictationState): void {
  storage.set(KEY_DICTATION_STATE, JSON.stringify(state));
}

function setBackgroundSessionActive(active: boolean): void {
  storage.set(KEY_BG_SESSION_ACTIVE, active);
  if (active) {
    storage.set(KEY_BG_SESSION_PING, Date.now() / 1000);
  }
}

function pingBackgroundSession(): void {
  storage.set(KEY_BG_SESSION_PING, Date.now() / 1000);
}

// ---------------------------------------------------------------------------
// Recording options (same as useAudioRecording)
// ---------------------------------------------------------------------------

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: ".wav",
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: ".wav",
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/wav",
    bitsPerSecond: 256000,
  },
};

// ---------------------------------------------------------------------------
// Service state
// ---------------------------------------------------------------------------

let activeSessionId: string | null = null;
let activeRecording: Audio.Recording | null = null;
let silenceTimer: ReturnType<typeof setTimeout> | null = null;
let maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let meteringInterval: ReturnType<typeof setInterval> | null = null;
let pollingInterval: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: { remove: () => void } | null = null;

const SILENCE_THRESHOLD_DB = -40;
const SILENCE_DURATION_MS = 3000;
const MAX_RECORDING_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const HEARTBEAT_INTERVAL_MS = 30_000;
const POLL_INTERVAL_MS = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  if (!key) throw new Error(`No API key for ${provider}`);
  return key;
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

function cleanupTimers(): void {
  if (silenceTimer) {
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
  if (maxDurationTimer) {
    clearTimeout(maxDurationTimer);
    maxDurationTimer = null;
  }
  if (meteringInterval) {
    clearInterval(meteringInterval);
    meteringInterval = null;
  }
}

function cleanupSession(): void {
  cleanupTimers();
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
  activeRecording = null;
  activeSessionId = null;
}

// ---------------------------------------------------------------------------
// Core pipeline
// ---------------------------------------------------------------------------

async function runTranscription(audioPath: string): Promise<string> {
  const useLocal = storage.getBoolean(SettingKeys.USE_LOCAL_WHISPER) ?? true;
  const language = storage.getString(SettingKeys.LANGUAGE) ?? "auto";
  const customDictionary = getCustomDictionary();

  let text: string;
  let modelUsed: string | undefined;

  if (useLocal) {
    const result = await transcribeLocal({
      audioPath,
      language: language === "auto" ? undefined : language,
      customDictionary,
    });
    text = result.text;
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
    text = result.text;
    modelUsed = `${provider}/${model}`;
  }

  // Optionally run AI reasoning
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

    const processed = await processReasoning(text, {
      provider,
      model,
      agentName,
      customDictionary,
    });

    if (processed) {
      text = processed;
      wasProcessed = true;
      processingMethod = `${provider}/${model}`;
    }
  }

  // Save to database with source="keyboard"
  insertTranscription({
    text,
    modelUsed,
    isLocal: useLocal,
    wasProcessed,
    processingMethod,
    source: "keyboard",
  });

  return text;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start a dictation session triggered by the keyboard extension.
 */
export async function startDictationSession(
  sessionId: string
): Promise<void> {
  // If already recording for a different session, stop it first
  if (activeRecording && activeSessionId !== sessionId) {
    await stopDictationSession();
  }

  activeSessionId = sessionId;

  try {
    // Activate audio session for background recording
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(RECORDING_OPTIONS);
    await recording.startAsync();
    activeRecording = recording;

    // Update state to recording
    writeDictationState({
      sessionId,
      phase: "recording",
      timestamp: Date.now() / 1000,
    });

    // Set background session active + start heartbeat
    setBackgroundSessionActive(true);
    heartbeatInterval = setInterval(pingBackgroundSession, HEARTBEAT_INTERVAL_MS);

    // Start silence detection via metering
    let silentSince: number | null = null;
    meteringInterval = setInterval(async () => {
      if (!activeRecording) return;
      try {
        const status = await activeRecording.getStatusAsync();
        if (!status.isRecording || status.metering == null) return;

        if (status.metering < SILENCE_THRESHOLD_DB) {
          if (!silentSince) silentSince = Date.now();
          if (Date.now() - silentSince >= SILENCE_DURATION_MS) {
            // Auto-stop after sustained silence
            await stopDictationSession();
          }
        } else {
          silentSince = null;
        }
      } catch {
        // Recording may have been stopped
      }
    }, 200);

    // Max duration auto-stop (5 minutes)
    maxDurationTimer = setTimeout(async () => {
      if (activeRecording && activeSessionId === sessionId) {
        await stopDictationSession();
      }
    }, MAX_RECORDING_DURATION_MS);

    // Start polling for stop requests from keyboard
    startPollingForStopRequest(sessionId);

    // Handle audio interruptions (phone call, Siri)
    appStateSubscription = AppState.addEventListener(
      "change",
      async (nextState: AppStateStatus) => {
        // If app is about to terminate while recording, try to save partial
        if (nextState === "inactive" && activeRecording && activeSessionId === sessionId) {
          // Let the recording continue in background mode
          // iOS will terminate with applicationWillTerminate handled elsewhere
        }
      }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to start recording";
    writeDictationState({
      sessionId,
      phase: "error",
      error: message,
      timestamp: Date.now() / 1000,
    });
    cleanupSession();
  }
}

/**
 * Stop the current dictation session and transcribe.
 */
export async function stopDictationSession(): Promise<void> {
  const sessionId = activeSessionId;
  const recording = activeRecording;

  if (!recording || !sessionId) return;

  cleanupTimers();

  try {
    // Update state to transcribing
    writeDictationState({
      sessionId,
      phase: "transcribing",
      timestamp: Date.now() / 1000,
    });

    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true, // Keep session alive for future dictations
    });

    const uri = recording.getURI();
    activeRecording = null;

    if (!uri) {
      throw new Error("No audio file produced");
    }

    // Run transcription pipeline
    const text = await runTranscription(uri);

    // Write completion
    writeDictationState({
      sessionId,
      phase: "complete",
      text,
      timestamp: Date.now() / 1000,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Transcription failed";
    writeDictationState({
      sessionId,
      phase: "error",
      error: message,
      timestamp: Date.now() / 1000,
    });
  } finally {
    activeRecording = null;
    activeSessionId = null;
    // Don't call full cleanupSession — keep heartbeat alive for future dictations
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }
}

/**
 * Poll for stop requests or new dictation requests from the keyboard extension.
 */
function startPollingForStopRequest(sessionId: string): void {
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(() => {
    const state = readDictationState();
    if (!state || state.sessionId !== sessionId) return;

    // Keyboard signals stop by writing startRequested with text="stop"
    if (state.phase === "start_requested" && state.text === "stop") {
      stopDictationSession();
    }
  }, POLL_INTERVAL_MS);
}

/**
 * Check if the background audio session is currently active.
 */
export function isBackgroundSessionActive(): boolean {
  return storage.getBoolean(KEY_BG_SESSION_ACTIVE) ?? false;
}

/**
 * Deactivate the background session (e.g. on app termination).
 */
export function deactivateBackgroundSession(): void {
  setBackgroundSessionActive(false);
  cleanupSession();
}

/**
 * Start observing for new dictation requests from the keyboard extension.
 * This should be called when the app starts and keep running in the background.
 */
export function startBackgroundObserver(): void {
  // If already observing, skip
  if (pollingInterval) return;

  pollingInterval = setInterval(async () => {
    const state = readDictationState();
    if (!state) return;

    // If keyboard requests a new dictation and we're not already recording
    if (state.phase === "start_requested" && state.text !== "stop" && !activeRecording) {
      await startDictationSession(state.sessionId);
    }
  }, POLL_INTERVAL_MS);
}
