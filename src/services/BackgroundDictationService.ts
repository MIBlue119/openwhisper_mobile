/**
 * BackgroundDictationService
 *
 * Coordinates the recording → transcription → App Group write pipeline
 * triggered by the keyboard extension.
 *
 * This is a Phase 7A stub. Full implementation will be added in Phase 7C.
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

/** Dictation session phases matching the Swift DictationPhase enum. */
export type DictationPhase =
  | "idle"
  | "start_requested"
  | "recording"
  | "transcribing"
  | "complete"
  | "error";

/** Dictation state written to App Group UserDefaults. */
export interface DictationState {
  sessionId: string;
  phase: DictationPhase;
  text?: string;
  error?: string;
  timestamp: number;
}

/**
 * Start a dictation session triggered by the keyboard extension.
 *
 * Phase 7C will implement:
 * - AVAudioSession activation with .playAndRecord category
 * - Audio recording via expo-av
 * - Silence detection (3s below -40dB)
 * - Max duration (5 minutes)
 * - WhisperKit / cloud transcription routing
 * - AI reasoning pipeline (optional)
 * - App Group write for result
 * - Heartbeat pinging
 *
 * @param sessionId - UUID from the keyboard extension's dictation request
 */
export async function startDictationSession(
  _sessionId: string
): Promise<void> {
  // Stub: Phase 7C implementation
  console.log(
    `[BackgroundDictation] Session ${_sessionId} requested (stub)`
  );
}

/**
 * Stop the current dictation session and transcribe.
 */
export async function stopDictationSession(): Promise<void> {
  // Stub: Phase 7C implementation
  console.log("[BackgroundDictation] Stop requested (stub)");
}

/**
 * Check if the background audio session is currently active.
 */
export function isBackgroundSessionActive(): boolean {
  // Stub: Phase 7C implementation
  return false;
}
