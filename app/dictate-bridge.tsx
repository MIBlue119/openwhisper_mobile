import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useColorScheme } from "nativewind";

/**
 * Deep link handler for keyboard extension dictation.
 *
 * Opened via: openwhispr://dictate?session=<uuid>
 *
 * This screen:
 * 1. Activates the background audio session
 * 2. Starts recording
 * 3. Transcribes when stopped
 * 4. Writes result to App Group
 * 5. Shows "Return to your app" message
 *
 * Phase 7A: Stub implementation. Full recording/transcription logic
 * will be added in Phase 7C via BackgroundDictationService.
 */
export default function DictateBridge() {
  const { session } = useLocalSearchParams<{ session?: string }>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const sessionId = useRef(session ?? "unknown");

  useEffect(() => {
    if (!session) return;

    // Phase 7C: BackgroundDictationService.start(sessionId) will be called here
    // For now, this is a stub that shows the bridge screen
    sessionId.current = session;
  }, [session]);

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.content}>
        <Text style={[styles.icon]}>🎙️</Text>
        <Text style={[styles.title, isDark && styles.textLight]}>
          Keyboard Dictation
        </Text>
        <Text style={[styles.subtitle, isDark && styles.textMuted]}>
          Recording will begin automatically.{"\n"}
          Return to your app when finished.
        </Text>
        <Text style={[styles.sessionId, isDark && styles.textMuted]}>
          Session: {sessionId.current.slice(0, 8)}...
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.returnButton,
          pressed && styles.returnButtonPressed,
        ]}
        onPress={() => {
          // Go back to the previous app or main screen
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(tabs)/dictate");
          }
        }}
      >
        <Text style={styles.returnButtonText}>Return to App</Text>
      </Pressable>
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
    gap: 12,
  },
  icon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#000",
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  sessionId: {
    fontSize: 12,
    color: "#999",
    fontFamily: "SpaceMono",
    marginTop: 8,
  },
  textLight: {
    color: "#fff",
  },
  textMuted: {
    color: "#999",
  },
  returnButton: {
    marginTop: 32,
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  returnButtonPressed: {
    opacity: 0.8,
  },
  returnButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
