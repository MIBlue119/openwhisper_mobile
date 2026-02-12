import { Audio } from "expo-av";
import { storage } from "@/src/storage/mmkv";

const AUDIO_CUES_ENABLED_KEY = "audio_cues_enabled";

// Frequencies chosen for pleasant, non-intrusive cues
const START_FREQUENCY = 880; // A5 - bright, attention-getting
const STOP_FREQUENCY = 660; // E5 - softer, completion feel

let isPlaying = false;

/**
 * Check if audio cues are enabled (default: true).
 */
export function areAudioCuesEnabled(): boolean {
  return storage.getBoolean(AUDIO_CUES_ENABLED_KEY) ?? true;
}

/**
 * Toggle audio cues on/off.
 */
export function setAudioCuesEnabled(enabled: boolean): void {
  storage.set(AUDIO_CUES_ENABLED_KEY, enabled);
}

/**
 * Play a short system sound to indicate recording has started.
 * Uses a quick ascending tone.
 */
export async function playStartCue(): Promise<void> {
  if (!areAudioCuesEnabled() || isPlaying) return;
  await playTone(START_FREQUENCY, 120);
}

/**
 * Play a short system sound to indicate recording has stopped.
 * Uses a quick descending tone.
 */
export async function playStopCue(): Promise<void> {
  if (!areAudioCuesEnabled() || isPlaying) return;
  await playTone(STOP_FREQUENCY, 150);
}

/**
 * Generate and play a simple sine wave tone.
 * This avoids needing bundled audio files.
 */
async function playTone(frequency: number, durationMs: number): Promise<void> {
  isPlaying = true;
  try {
    const sampleRate = 44100;
    const numSamples = Math.floor((sampleRate * durationMs) / 1000);
    const numChannels = 1;
    const bitsPerSample = 16;

    // Generate PCM samples
    const samples = new Int16Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Apply fade-in/fade-out envelope to prevent clicks
      const fadeLen = Math.floor(numSamples * 0.1);
      let envelope = 1;
      if (i < fadeLen) envelope = i / fadeLen;
      else if (i > numSamples - fadeLen) envelope = (numSamples - i) / fadeLen;

      samples[i] = Math.floor(
        Math.sin(2 * Math.PI * frequency * t) * 0.3 * 32767 * envelope
      );
    }

    // Build WAV file in memory
    const dataSize = numSamples * numChannels * (bitsPerSample / 8);
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // WAV header
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, "data");
    view.setUint32(40, dataSize, true);

    // PCM data
    for (let i = 0; i < numSamples; i++) {
      view.setInt16(44 + i * 2, samples[i], true);
    }

    // Convert to base64 data URI
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const uri = `data:audio/wav;base64,${base64}`;

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, volume: 0.5 }
    );

    // Cleanup after playback
    sound.setOnPlaybackStatusUpdate((status) => {
      if ("didJustFinish" in status && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        isPlaying = false;
      }
    });
  } catch {
    // Audio cues are non-critical; never block the user
    isPlaying = false;
  }
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
