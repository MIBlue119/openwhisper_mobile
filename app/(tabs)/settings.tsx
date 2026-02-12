import { ScrollView, Text, View } from "react-native";
import { useWhisperKit } from "@/src/hooks/useWhisperKit";
import { ModelPicker } from "@/src/components/ModelPicker";

export default function SettingsScreen() {
  const {
    availableModels,
    currentModel,
    recommendedModel,
    downloadProgress,
    isLoading,
    initialize,
    downloadModel,
    deleteModel,
  } = useWhisperKit();

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black">
      {/* Model Management Section */}
      <ModelPicker
        models={availableModels}
        currentModel={currentModel}
        recommendedModel={recommendedModel}
        downloadProgress={downloadProgress}
        isInitializing={isLoading}
        onSelect={initialize}
        onDownload={downloadModel}
        onDelete={deleteModel}
      />

      {/* Placeholder sections for future phases */}
      <View className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
        <Text className="text-sm text-gray-400 dark:text-gray-500 text-center">
          Language, API Keys, and more settings coming in Phase 3-5
        </Text>
      </View>
    </ScrollView>
  );
}
