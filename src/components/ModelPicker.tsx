import { useCallback } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import type { ModelInfo } from "@/modules/whisperkit/src";
import {
  formatBytes,
  checkDiskSpaceForModel,
  checkNetworkForDownload,
  getModelCompatibilityWarning,
} from "@/src/services/WhisperKitService";

interface ModelPickerProps {
  models: ModelInfo[];
  currentModel: string | null;
  recommendedModel: string | null;
  downloadProgress: Record<string, number>;
  isInitializing: boolean;
  onSelect: (name: string) => void;
  onDownload: (name: string) => void;
  onDelete: (name: string) => void;
}

function ProgressBar({ progress }: { progress: number }) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: `${withTiming(progress * 100, { duration: 300 })}%`,
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, animatedStyle]} />
    </View>
  );
}

function ModelRow({
  model,
  isActive,
  isRecommended,
  recommendedModel,
  downloadProgress,
  isInitializing,
  onSelect,
  onDownload,
  onDelete,
}: {
  model: ModelInfo;
  isActive: boolean;
  isRecommended: boolean;
  recommendedModel: string | null;
  downloadProgress?: number;
  isInitializing: boolean;
  onSelect: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const isDownloading = downloadProgress !== undefined;

  const handleDownload = useCallback(async () => {
    // Check disk space
    const { hasSpace, availableBytes } = await checkDiskSpaceForModel(
      model.sizeBytes
    );
    if (!hasSpace) {
      Alert.alert(
        "Not Enough Space",
        `This model requires ${formatBytes(model.sizeBytes)} but only ${formatBytes(availableBytes)} is available. Free up space and try again.`
      );
      return;
    }

    // Check device compatibility for large models
    const compatWarning = await getModelCompatibilityWarning(
      model.name,
      model.sizeBytes,
      recommendedModel
    );

    // Check cellular network
    const { shouldWarn: cellularWarn } = await checkNetworkForDownload(
      model.sizeBytes
    );

    // Build combined warning if needed
    const warnings: string[] = [];
    if (compatWarning) warnings.push(compatWarning);
    if (cellularWarn) {
      warnings.push(
        `You're on cellular data. This download is ${formatBytes(model.sizeBytes)}.`
      );
    }

    if (warnings.length > 0) {
      Alert.alert(
        cellularWarn ? "Download on Cellular?" : "Large Model Warning",
        warnings.join("\n\n"),
        [
          { text: "Cancel", style: "cancel" },
          { text: "Download Anyway", onPress: onDownload },
        ]
      );
      return;
    }

    onDownload();
  }, [model.sizeBytes, model.name, recommendedModel, onDownload]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Model",
      `Delete ${model.displayName}? You can re-download it later.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ]
    );
  }, [model.displayName, onDelete]);

  return (
    <View style={[styles.row, isActive && styles.rowActive]}>
      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <Text style={[styles.modelName, isActive && styles.modelNameActive]}>
            {model.displayName}
          </Text>
          {isRecommended && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Recommended</Text>
            </View>
          )}
        </View>
        <Text style={styles.modelSize}>{formatBytes(model.sizeBytes)}</Text>

        {isDownloading && (
          <View style={styles.progressContainer}>
            <ProgressBar progress={downloadProgress} />
            <Text style={styles.progressText}>
              {Math.round(downloadProgress * 100)}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.rowActions}>
        {model.isDownloaded ? (
          <>
            {isActive ? (
              <View style={styles.activeIndicator}>
                {isInitializing ? (
                  <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                  <FontAwesome name="check-circle" size={22} color="#22c55e" />
                )}
              </View>
            ) : (
              <Pressable
                onPress={onSelect}
                style={styles.selectButton}
                accessibilityRole="button"
                accessibilityLabel={`Select ${model.displayName} model`}
              >
                <Text style={styles.selectButtonText}>Use</Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleDelete}
              style={styles.deleteButton}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${model.displayName} model`}
            >
              <FontAwesome name="trash-o" size={18} color="#ef4444" />
            </Pressable>
          </>
        ) : isDownloading ? (
          <ActivityIndicator size="small" color="#3b82f6" />
        ) : (
          <Pressable
            onPress={handleDownload}
            style={styles.downloadButton}
            accessibilityRole="button"
            accessibilityLabel={`Download ${model.displayName} model`}
          >
            <FontAwesome name="cloud-download" size={16} color="#ffffff" />
            <Text style={styles.downloadButtonText}>Download</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function ModelPicker({
  models,
  currentModel,
  recommendedModel,
  downloadProgress,
  isInitializing,
  onSelect,
  onDownload,
  onDelete,
}: ModelPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>WhisperKit Models</Text>
      <Text style={styles.subtitle}>
        Download a model for on-device transcription
      </Text>
      {models.map((model) => (
        <ModelRow
          key={model.name}
          model={model}
          isActive={currentModel === model.name}
          isRecommended={recommendedModel === model.name}
          recommendedModel={recommendedModel}
          downloadProgress={downloadProgress[model.name]}
          isInitializing={isInitializing && currentModel === model.name}
          onSelect={() => onSelect(model.name)}
          onDownload={() => onDownload(model.name)}
          onDelete={() => onDelete(model.name)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderCurve: "continuous",
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  rowActive: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  rowContent: {
    flex: 1,
    marginRight: 12,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modelName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  modelNameActive: {
    color: "#1d4ed8",
  },
  modelSize: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 2,
  },
  badge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563eb",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3b82f6",
    width: 40,
    textAlign: "right",
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activeIndicator: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  selectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: "#3b82f6",
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  deleteButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: "#3b82f6",
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
});
