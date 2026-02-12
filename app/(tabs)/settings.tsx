import { useCallback } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { useWhisperKit } from "@/src/hooks/useWhisperKit";
import {
  useLocalWhisper,
  useLanguage,
  useAgentName,
  useReasoningProvider,
  useReasoningModel,
  useReasoningEnabled,
  useCloudTranscriptionProvider,
  useCloudTranscriptionModel,
} from "@/src/hooks/useSettings";
import { ModelPicker } from "@/src/components/ModelPicker";
import { ApiKeyInput } from "@/src/components/ApiKeyInput";
import { SettingsSection } from "@/src/components/SettingsSection";
import { PickerSelect } from "@/src/components/PickerSelect";
import { SecureKeys } from "@/src/storage/secureStorage";
import {
  getTranscriptionProviders,
  getReasoningProviders,
  getTranscriptionProvider,
  getReasoningProvider,
} from "@/src/models/ModelRegistry";

const LANGUAGES = [
  { value: "auto", label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "nl", label: "Dutch" },
  { value: "pl", label: "Polish" },
  { value: "ru", label: "Russian" },
  { value: "sv", label: "Swedish" },
  { value: "tr", label: "Turkish" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
];

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

  const [useLocal, setUseLocal] = useLocalWhisper();
  const [language, setLanguage] = useLanguage();
  const [agentName, setAgentName] = useAgentName();
  const [reasoningProvider, setReasoningProvider] = useReasoningProvider();
  const [reasoningModel, setReasoningModel] = useReasoningModel();
  const [reasoningEnabled, setReasoningEnabled] = useReasoningEnabled();
  const [cloudProvider, setCloudProvider] = useCloudTranscriptionProvider();
  const [cloudModel, setCloudModel] = useCloudTranscriptionModel();

  // Build options from model registry
  const transcriptionProviderOptions = getTranscriptionProviders().map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const selectedTranscriptionProvider = getTranscriptionProvider(
    cloudProvider ?? "openai"
  );
  const transcriptionModelOptions = (
    selectedTranscriptionProvider?.models ?? []
  ).map((m) => ({
    value: m.id,
    label: m.name,
    description: m.description,
  }));

  const reasoningProviderOptions = getReasoningProviders().map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const selectedReasoningProvider = getReasoningProvider(
    reasoningProvider ?? "openai"
  );
  const reasoningModelOptions = (
    selectedReasoningProvider?.models ?? []
  ).map((m) => ({
    value: m.id,
    label: m.name,
    description: m.description,
  }));

  const handleCloudProviderChange = useCallback(
    (value: string) => {
      setCloudProvider(value);
      // Reset model when provider changes
      const provider = getTranscriptionProvider(value);
      if (provider?.models[0]) {
        setCloudModel(provider.models[0].id);
      }
    },
    [setCloudProvider, setCloudModel]
  );

  const handleReasoningProviderChange = useCallback(
    (value: string) => {
      setReasoningProvider(value);
      const provider = getReasoningProvider(value);
      if (provider?.models[0]) {
        setReasoningModel(provider.models[0].id);
      }
    },
    [setReasoningProvider, setReasoningModel]
  );

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black">
      {/* Transcription Mode */}
      <SettingsSection
        title="Transcription"
        subtitle="Choose how audio is transcribed"
      >
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1">
            <Text className="text-base font-medium text-gray-800 dark:text-gray-200">
              Use local model
            </Text>
            <Text className="text-xs text-gray-500 mt-1">
              On-device with WhisperKit (private, no internet)
            </Text>
          </View>
          <Switch
            value={useLocal}
            onValueChange={setUseLocal}
            trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
          />
        </View>

        {!useLocal && (
          <>
            <PickerSelect
              label="Cloud Provider"
              options={transcriptionProviderOptions}
              value={cloudProvider ?? "openai"}
              onChange={handleCloudProviderChange}
            />
            <PickerSelect
              label="Transcription Model"
              options={transcriptionModelOptions}
              value={cloudModel}
              onChange={setCloudModel}
            />
          </>
        )}

        <PickerSelect
          label="Language"
          options={LANGUAGES}
          value={language ?? "auto"}
          onChange={setLanguage}
        />
      </SettingsSection>

      {/* WhisperKit Models — show when local mode is on */}
      {useLocal && (
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
      )}

      {/* AI Reasoning */}
      <SettingsSection
        title="AI Text Processing"
        subtitle="Clean up and enhance transcribed text with AI"
      >
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1">
            <Text className="text-base font-medium text-gray-800 dark:text-gray-200">
              Enable AI processing
            </Text>
            <Text className="text-xs text-gray-500 mt-1">
              Cleanup, agent commands, and text enhancement
            </Text>
          </View>
          <Switch
            value={reasoningEnabled}
            onValueChange={setReasoningEnabled}
            trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
          />
        </View>

        {reasoningEnabled && (
          <>
            <PickerSelect
              label="AI Provider"
              options={reasoningProviderOptions}
              value={reasoningProvider ?? "openai"}
              onChange={handleReasoningProviderChange}
            />
            <PickerSelect
              label="AI Model"
              options={reasoningModelOptions}
              value={reasoningModel}
              onChange={setReasoningModel}
            />
            <View className="mb-3">
              <Text className="text-sm font-semibold text-gray-700 mb-1.5">
                Agent Name
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white"
                value={agentName ?? ""}
                onChangeText={setAgentName}
                placeholder='e.g. "Aria"'
                placeholderTextColor="#9ca3af"
                autoCapitalize="words"
                autoCorrect={false}
              />
              <Text className="text-xs text-gray-400 mt-1">
                Say "Hey [name]" to activate agent mode
              </Text>
            </View>
          </>
        )}
      </SettingsSection>

      {/* API Keys */}
      <SettingsSection
        title="API Keys"
        subtitle="Stored securely in iOS Keychain"
      >
        <ApiKeyInput
          label="OpenAI"
          secureKey={SecureKeys.OPENAI_API_KEY}
          placeholder="sk-..."
        />
        <ApiKeyInput
          label="Anthropic"
          secureKey={SecureKeys.ANTHROPIC_API_KEY}
          placeholder="sk-ant-..."
        />
        <ApiKeyInput
          label="Google Gemini"
          secureKey={SecureKeys.GEMINI_API_KEY}
          placeholder="AI..."
        />
        <ApiKeyInput
          label="Groq"
          secureKey={SecureKeys.GROQ_API_KEY}
          placeholder="gsk_..."
        />
        <ApiKeyInput
          label="Mistral"
          secureKey={SecureKeys.MISTRAL_API_KEY}
          placeholder="..."
        />
      </SettingsSection>

      <View className="h-8" />
    </ScrollView>
  );
}
