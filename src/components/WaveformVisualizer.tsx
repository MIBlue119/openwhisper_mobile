import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const BAR_COUNT = 5;
const BAR_WIDTH = 4;
const BAR_GAP = 3;
const MAX_HEIGHT = 32;
const MIN_HEIGHT = 4;

interface WaveformVisualizerProps {
  audioLevel: number; // 0-1
  isActive: boolean;
}

function WaveformBar({ index, audioLevel, isActive }: { index: number; audioLevel: number; isActive: boolean }) {
  const height = useSharedValue(MIN_HEIGHT);

  useEffect(() => {
    if (!isActive) {
      height.value = withSpring(MIN_HEIGHT, { damping: 15, stiffness: 200 });
      return;
    }

    // Each bar has a slightly different multiplier for visual variety
    const multipliers = [0.6, 0.9, 1.0, 0.85, 0.55];
    const targetHeight = MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) * audioLevel * (multipliers[index] ?? 0.7);
    height.value = withSpring(targetHeight, { damping: 12, stiffness: 180 });
  }, [audioLevel, isActive, height, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        animatedStyle,
        { backgroundColor: isActive ? "#ef4444" : "#9ca3af" },
      ]}
    />
  );
}

export function WaveformVisualizer({ audioLevel, isActive }: WaveformVisualizerProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <WaveformBar
          key={i}
          index={i}
          audioLevel={audioLevel}
          isActive={isActive}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: BAR_GAP,
    height: MAX_HEIGHT + 8,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: BAR_WIDTH / 2,
  },
});
