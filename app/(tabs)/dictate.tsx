import { useCallback } from "react";
import { AccessibilityInfo, Pressable, Share, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { useAppStore } from "@/src/stores/appStore";
import { useAudioRecording } from "@/src/hooks/useAudioRecording";
import { usePermissions } from "@/src/hooks/usePermissions";
import { useWhisperKit } from "@/src/hooks/useWhisperKit";
import { useTranscription } from "@/src/hooks/useTranscription";
import { useLocalWhisper } from "@/src/hooks/useSettings";
import { RecordButton } from "@/src/components/RecordButton";
import { WaveformVisualizer } from "@/src/components/WaveformVisualizer";
import { PermissionPrompt } from "@/src/components/PermissionPrompt";
import { playStartCue, playStopCue } from "@/src/utils/audioCues";

export default function DictateScreen() {
  const recordingState = useAppStore((s) => s.recordingState);
  const audioLevel = useAppStore((s) => s.audioLevel);
  const transcribedText = useAppStore((s) => s.transcribedText);
  const error = useAppStore((s) => s.error);
  const setRecordingState = useAppStore((s) => s.setRecordingState);
  const setTranscribedText = useAppStore((s) => s.setTranscribedText);
  const setError = useAppStore((s) => s.setError);

  const { startRecording, stopRecording } = useAudioRecording();
  const { microphone, loading, requestMicrophonePermission, openSettings } =
    usePermissions();
  const { isInitialized } = useWhisperKit();
  const { transcribe } = useTranscription();
  const [useLocal] = useLocalWhisper();

  // Can transcribe if local model is loaded, or if using cloud transcription
  const canTranscribe = isInitialized || !useLocal;

  const handleRecordPress = useCallback(async () => {
    if (recordingState === "idle") {
      // Re-check permission in case it was revoked while app was open
      if (microphone !== "granted") {
        setError(
          "Microphone access was revoked. Go to Settings to re-enable it."
        );
        return;
      }
      setError(null);
      const started = await startRecording();
      if (started) {
        playStartCue();
        AccessibilityInfo.announceForAccessibility("Recording started");
      }
    } else if (recordingState === "recording") {
      playStopCue();
      AccessibilityInfo.announceForAccessibility("Recording stopped. Transcribing.");
      const uri = await stopRecording();
      if (uri) {
        if (canTranscribe) {
          setRecordingState("processing");
          try {
            const result = await transcribe(uri);
            setTranscribedText(result.text);
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );
            AccessibilityInfo.announceForAccessibility(
              "Transcription complete. " + result.text.slice(0, 100)
            );
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Transcription failed";
            setError(message);
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Error
            );
            AccessibilityInfo.announceForAccessibility("Transcription failed. " + message);
          }
          setRecordingState("idle");
        } else {
          setTranscribedText(null);
          setError(
            "No transcription model loaded. Go to Settings → Models to download one."
          );
          setRecordingState("idle");
        }
      }
    }
  }, [
    recordingState,
    microphone,
    canTranscribe,
    startRecording,
    stopRecording,
    transcribe,
    setRecordingState,
    setTranscribedText,
    setError,
  ]);

  const handleCopy = useCallback(async () => {
    if (transcribedText) {
      await Clipboard.setStringAsync(transcribedText);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [transcribedText]);

  const handleShare = useCallback(async () => {
    if (transcribedText) {
      await Share.share({ message: transcribedText });
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
      {/* Status / Transcription Area */}
      <View className="mb-8 items-center max-w-full">
        {recordingState === "recording" ? (
          <>
            <Text className="text-lg font-medium text-red-500 mb-3">
              Recording...
            </Text>
            <WaveformVisualizer audioLevel={audioLevel} isActive={true} />
          </>
        ) : recordingState === "processing" ? (
          <Text className="text-lg font-medium text-gray-500 dark:text-gray-400">
            Transcribing...
          </Text>
        ) : transcribedText ? (
          <View className="items-center gap-4">
            <Text
              className="text-base text-gray-800 dark:text-gray-200 text-center leading-6"
              selectable
            >
              {transcribedText}
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleCopy}
                className="flex-row items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 active:opacity-70"
                style={{ borderCurve: "continuous" }}
                accessibilityRole="button"
                accessibilityLabel="Copy transcribed text"
                accessibilityHint="Copies the transcription to your clipboard"
              >
                <FontAwesome name="copy" size={14} color="#6b7280" />
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  Copy
                </Text>
              </Pressable>
              <Pressable
                onPress={handleShare}
                className="flex-row items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 active:opacity-70"
                style={{ borderCurve: "continuous" }}
                accessibilityRole="button"
                accessibilityLabel="Share transcribed text"
                accessibilityHint="Opens the share sheet to send text to other apps"
              >
                <FontAwesome name="share-square-o" size={14} color="#6b7280" />
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  Share
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="items-center">
            <Text className="text-base text-gray-400 dark:text-gray-500 text-center">
              Tap the button to start dictating
            </Text>
            {!canTranscribe && (
              <Text className="text-sm text-amber-500 mt-2 text-center">
                No model loaded — go to Settings to download one
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Record Button */}
      <RecordButton state={recordingState} onPress={handleRecordPress} />

      {/* Error Display */}
      {error && (
        <View
          className="mt-6 px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-xl"
          style={{ borderCurve: "continuous" }}
        >
          <Text className="text-sm text-red-600 dark:text-red-400 text-center">
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}
