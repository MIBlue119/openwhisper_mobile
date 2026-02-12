import { Audio, InterruptionModeIOS } from "expo-av";
import { useCallback, useEffect, useRef } from "react";
import { useAppStore } from "@/src/stores/appStore";

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

interface UseAudioRecordingReturn {
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => Promise<void>;
}

export function useAudioRecording(): UseAudioRecordingReturn {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const meteringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setRecordingState = useAppStore((s) => s.setRecordingState);
  const setAudioLevel = useAppStore((s) => s.setAudioLevel);
  const setAudioFilePath = useAppStore((s) => s.setAudioFilePath);
  const setError = useAppStore((s) => s.setError);

  const stopMetering = useCallback(() => {
    if (meteringIntervalRef.current) {
      clearInterval(meteringIntervalRef.current);
      meteringIntervalRef.current = null;
    }
    setAudioLevel(0);
  }, [setAudioLevel]);

  const startMetering = useCallback(
    (recording: Audio.Recording) => {
      stopMetering();
      meteringIntervalRef.current = setInterval(async () => {
        try {
          const status = await recording.getStatusAsync();
          if (status.isRecording && status.metering != null) {
            // Convert dB (typically -160 to 0) to 0-1 range
            const normalized = Math.max(0, Math.min(1, (status.metering + 60) / 60));
            setAudioLevel(normalized);
          }
        } catch {
          // Recording may have been stopped
        }
      }, 100);
    },
    [setAudioLevel, stopMetering]
  );

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      // Configure audio session for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(RECORDING_OPTIONS);
      await recording.startAsync();

      recordingRef.current = recording;
      setRecordingState("recording");
      setError(null);
      startMetering(recording);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start recording";
      setError(message);
      setRecordingState("idle");
      return false;
    }
  }, [setRecordingState, setError, startMetering]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    const recording = recordingRef.current;
    if (!recording) return null;

    stopMetering();

    try {
      setRecordingState("processing");
      await recording.stopAndUnloadAsync();

      // Reset audio mode so playback works normally
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const uri = recording.getURI();
      recordingRef.current = null;

      if (uri) {
        setAudioFilePath(uri);
      }

      return uri;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to stop recording";
      setError(message);
      setRecordingState("idle");
      recordingRef.current = null;
      return null;
    }
  }, [setRecordingState, setAudioFilePath, setError, stopMetering]);

  const cancelRecording = useCallback(async (): Promise<void> => {
    const recording = recordingRef.current;
    if (!recording) return;

    stopMetering();

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
    } catch {
      // Ignore errors during cancel
    }

    recordingRef.current = null;
    setRecordingState("idle");
    setAudioFilePath(null);
  }, [setRecordingState, setAudioFilePath, stopMetering]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMetering();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, [stopMetering]);

  return {
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
