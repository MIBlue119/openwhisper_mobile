import { useCallback } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { useEffect } from "react";
import type { RecordingState } from "@/src/stores/appStore";

const BUTTON_SIZE = 80;
const RING_SIZE = BUTTON_SIZE + 16;

interface RecordButtonProps {
  state: RecordingState;
  onPress: () => void;
}

export function RecordButton({ state, onPress }: RecordButtonProps) {
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (state === "recording") {
      ringOpacity.value = withTiming(0.3, { duration: 200 });
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1000 }),
          withTiming(1.0, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(ringScale);
      ringScale.value = withTiming(1, { duration: 200 });
      ringOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [state, ringScale, ringOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const handlePress = useCallback(() => {
    if (state === "processing") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }, [state, onPress]);

  const isRecording = state === "recording";
  const isProcessing = state === "processing";

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[styles.ring, ringStyle]}
      />
      <Pressable
        onPress={handlePress}
        disabled={isProcessing}
        style={({ pressed }) => [
          styles.button,
          isRecording && styles.buttonRecording,
          isProcessing && styles.buttonProcessing,
          pressed && !isProcessing && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          isRecording
            ? "Stop recording"
            : isProcessing
              ? "Processing transcription"
              : "Start recording"
        }
        accessibilityState={{ disabled: isProcessing }}
      >
        {isProcessing ? (
          <ActivityIndicator size="large" color="#ffffff" />
        ) : isRecording ? (
          <View style={styles.stopIcon} />
        ) : (
          <View style={styles.micIcon}>
            <View style={styles.micHead} />
            <View style={styles.micBody} />
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: RING_SIZE + 16,
    height: RING_SIZE + 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: "#ef4444",
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: "#ef4444",
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonRecording: {
    backgroundColor: "#dc2626",
  },
  buttonProcessing: {
    backgroundColor: "#9ca3af",
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  stopIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: "#ffffff",
    borderCurve: "continuous",
  },
  micIcon: {
    alignItems: "center",
  },
  micHead: {
    width: 16,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  micBody: {
    width: 6,
    height: 8,
    backgroundColor: "#ffffff",
    marginTop: -2,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
});
