import { useLocalSearchParams, router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useColorScheme } from "nativewind";
import * as Haptics from "expo-haptics";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  startDictationSession,
  stopDictationSession,
  deactivateBackgroundSession,
  startBackgroundObserver,
} from "@/src/services/BackgroundDictationService";
import { useAppStore } from "@/src/stores/appStore";

type BridgeState = "starting" | "recording" | "transcribing" | "complete" | "error";

/**
 * Deep link handler for keyboard extension dictation.
 *
 * Opened via: openwhispr://dictate?session=<uuid>
 *
 * This screen:
 * 1. Activates the background audio session
 * 2. Starts recording
 * 3. Shows recording waveform
 * 4. Transcribes when stopped (user tap or silence detection)
 * 5. Writes result to App Group
 * 6. Shows "Return to your app" message
 */
export default function DictateBridge() {
  const { session } = useLocalSearchParams<{ session?: string }>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const sessionId = useRef(session ?? "");
  const [state, setState] = useState<BridgeState>("starting");
  const [resultText, setResultText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const audioLevel = useAppStore((s) => s.audioLevel);

  // Start dictation session
  useEffect(() => {
    if (!session) return;
    sessionId.current = session;

    let cancelled = false;

    (async () => {
      try {
        setState("recording");
        await startDictationSession(session);
        // After this, the service is running and will handle everything
        // Start the background observer for future keyboard requests
        startBackgroundObserver();
      } catch (err) {
        if (cancelled) return;
        setState("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to start recording"
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const handleStop = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState("transcribing");
    try {
      await stopDictationSession();
      setState("complete");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setState("error");
      setErrorMessage("Failed to transcribe");
    }
  }, []);

  const handleReturn = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/dictate");
    }
  }, []);

  if (!session) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <Text style={[styles.subtitle, isDark && styles.textMuted]}>
          No session ID provided.
        </Text>
        <Pressable style={styles.returnButton} onPress={handleReturn}>
          <Text style={styles.returnButtonText}>Go to App</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.content}>
        {/* State icon */}
        {state === "recording" && (
          <View style={styles.recordingIndicator}>
            <View
              style={[
                styles.waveformCircle,
                { transform: [{ scale: 1 + audioLevel * 0.5 }] },
              ]}
            />
            <FontAwesome name="microphone" size={32} color="#ef4444" />
          </View>
        )}
        {state === "starting" && (
          <FontAwesome name="hourglass-half" size={36} color="#f59e0b" />
        )}
        {state === "transcribing" && (
          <FontAwesome name="cog" size={36} color="#3b82f6" />
        )}
        {state === "complete" && (
          <FontAwesome name="check-circle" size={48} color="#22c55e" />
        )}
        {state === "error" && (
          <FontAwesome name="exclamation-circle" size={48} color="#ef4444" />
        )}

        {/* Title */}
        <Text style={[styles.title, isDark && styles.textLight]}>
          {state === "starting" && "Connecting..."}
          {state === "recording" && "Listening..."}
          {state === "transcribing" && "Transcribing..."}
          {state === "complete" && "Done!"}
          {state === "error" && "Error"}
        </Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, isDark && styles.textMuted]}>
          {state === "starting" && "Setting up background audio session"}
          {state === "recording" &&
            "Speak now. Tap Stop when finished.\nAuto-stops after 3s of silence."}
          {state === "transcribing" &&
            "Processing your speech..."}
          {state === "complete" &&
            "Text has been sent to your keyboard.\nReturn to your app to see it inserted."}
          {state === "error" && (errorMessage ?? "Something went wrong")}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {state === "recording" && (
          <Pressable
            style={({ pressed }) => [
              styles.stopButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleStop}
          >
            <FontAwesome
              name="stop"
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.stopButtonText}>Stop Recording</Text>
          </Pressable>
        )}

        {(state === "complete" || state === "error") && (
          <Pressable
            style={({ pressed }) => [
              styles.returnButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleReturn}
          >
            <Text style={styles.returnButtonText}>
              {state === "complete" ? "Return to App" : "Go Back"}
            </Text>
          </Pressable>
        )}
      </View>

      <Text style={[styles.sessionId, isDark && styles.textMuted]}>
        Session: {sessionId.current.slice(0, 8)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  containerDark: {
    backgroundColor: "#1c1c1e",
  },
  content: {
    alignItems: "center",
    gap: 16,
  },
  recordingIndicator: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  waveformCircle: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  sessionId: {
    position: "absolute",
    bottom: 40,
    fontSize: 11,
    color: "#bbb",
    fontFamily: "SpaceMono",
  },
  textLight: {
    color: "#fff",
  },
  textMuted: {
    color: "#999",
  },
  actions: {
    marginTop: 32,
    gap: 12,
  },
  stopButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderCurve: "continuous",
  },
  stopButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  returnButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderCurve: "continuous",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  returnButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
