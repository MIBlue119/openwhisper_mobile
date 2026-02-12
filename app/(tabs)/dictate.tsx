import { useCallback } from "react";
import { Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";

import { useAppStore } from "@/src/stores/appStore";
import { useAudioRecording } from "@/src/hooks/useAudioRecording";
import { usePermissions } from "@/src/hooks/usePermissions";
import { RecordButton } from "@/src/components/RecordButton";
import { WaveformVisualizer } from "@/src/components/WaveformVisualizer";
import { PermissionPrompt } from "@/src/components/PermissionPrompt";

export default function DictateScreen() {
  const recordingState = useAppStore((s) => s.recordingState);
  const audioLevel = useAppStore((s) => s.audioLevel);
  const transcribedText = useAppStore((s) => s.transcribedText);
  const error = useAppStore((s) => s.error);
  const setRecordingState = useAppStore((s) => s.setRecordingState);

  const { startRecording, stopRecording } = useAudioRecording();
  const { microphone, loading, requestMicrophonePermission, openSettings } =
    usePermissions();

  const handleRecordPress = useCallback(async () => {
    if (recordingState === "idle") {
      await startRecording();
    } else if (recordingState === "recording") {
      const uri = await stopRecording();
      if (uri) {
        // Phase 2 will add WhisperKit transcription here.
        // For now, just mark as idle with the file path available.
        setRecordingState("idle");
      }
    }
  }, [recordingState, startRecording, stopRecording, setRecordingState]);

  const handleCopyText = useCallback(async () => {
    if (transcribedText) {
      await Clipboard.setStringAsync(transcribedText);
    }
  }, [transcribedText]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <Text className="text-gray-400">Loading...</Text>
      </View>
    );
  }

  if (microphone !== "granted") {
    return (
      <View className="flex-1 bg-white dark:bg-black">
        <PermissionPrompt
          onRequestPermission={requestMicrophonePermission}
          onOpenSettings={openSettings}
          isDenied={microphone === "denied"}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black px-6">
      {/* Status Text */}
      <View className="mb-8 items-center">
        {recordingState === "recording" ? (
          <>
            <Text className="text-lg font-medium text-red-500 mb-3">
              Recording...
            </Text>
            <WaveformVisualizer
              audioLevel={audioLevel}
              isActive={true}
            />
          </>
        ) : recordingState === "processing" ? (
          <Text className="text-lg font-medium text-gray-500 dark:text-gray-400">
            Processing...
          </Text>
        ) : transcribedText ? (
          <Text
            className="text-base text-gray-800 dark:text-gray-200 text-center leading-6"
            onPress={handleCopyText}
            accessibilityHint="Tap to copy transcribed text"
          >
            {transcribedText}
          </Text>
        ) : (
          <Text className="text-base text-gray-400 dark:text-gray-500 text-center">
            Tap the button to start dictating
          </Text>
        )}
      </View>

      {/* Record Button */}
      <RecordButton state={recordingState} onPress={handleRecordPress} />

      {/* Error Display */}
      {error && (
        <View className="mt-6 px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-xl" style={{ borderCurve: "continuous" }}>
          <Text className="text-sm text-red-600 dark:text-red-400 text-center">
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}
