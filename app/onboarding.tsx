import { useCallback, useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { usePermissions } from "@/src/hooks/usePermissions";
import { storage } from "@/src/storage/mmkv";
import { SettingKeys } from "@/src/hooks/useSettings";

const TOTAL_STEPS = 5;

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View className="flex-row gap-2 justify-center mb-8">
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          className={`h-1.5 rounded-full ${
            i <= current
              ? "w-8 bg-blue-500"
              : "w-4 bg-gray-200 dark:bg-gray-700"
          }`}
        />
      ))}
    </View>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <FontAwesome name="microphone" size={64} color="#3b82f6" />
      <Text className="text-3xl font-bold text-gray-900 dark:text-white mt-6 text-center">
        Welcome to OpenWhispr
      </Text>
      <Text className="text-base text-gray-500 mt-3 text-center leading-6">
        Private, on-device dictation powered by WhisperKit. Your voice stays on
        your phone.
      </Text>
      <Pressable
        onPress={onNext}
        className="mt-10 bg-blue-500 rounded-xl px-8 py-4 active:opacity-80"
        style={{ borderCurve: "continuous" }}
      >
        <Text className="text-white font-semibold text-base">Get Started</Text>
      </Pressable>
    </View>
  );
}

function MicPermissionStep({ onNext }: { onNext: () => void }) {
  const { microphone, requestMicrophonePermission, openSettings } =
    usePermissions();

  const handleRequest = useCallback(async () => {
    await requestMicrophonePermission();
    if (microphone === "granted") {
      onNext();
    }
  }, [requestMicrophonePermission, microphone, onNext]);

  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center mb-6">
        <FontAwesome name="microphone" size={36} color="#3b82f6" />
      </View>
      <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center">
        Microphone Access
      </Text>
      <Text className="text-base text-gray-500 mt-3 text-center leading-6">
        OpenWhispr needs microphone access to record your voice for
        transcription.
      </Text>

      {microphone === "granted" ? (
        <View className="mt-8 items-center">
          <FontAwesome name="check-circle" size={48} color="#22c55e" />
          <Text className="text-green-600 font-medium mt-2">
            Microphone access granted
          </Text>
          <Pressable
            onPress={onNext}
            className="mt-6 bg-blue-500 rounded-xl px-8 py-4 active:opacity-80"
            style={{ borderCurve: "continuous" }}
          >
            <Text className="text-white font-semibold text-base">Continue</Text>
          </Pressable>
        </View>
      ) : microphone === "denied" ? (
        <View className="mt-8 items-center">
          <Text className="text-sm text-red-500 text-center mb-4">
            Microphone access was denied. Please enable it in Settings.
          </Text>
          <Pressable
            onPress={openSettings}
            className="bg-gray-200 dark:bg-gray-700 rounded-xl px-8 py-4 active:opacity-80"
            style={{ borderCurve: "continuous" }}
          >
            <Text className="text-gray-800 dark:text-gray-200 font-semibold text-base">
              Open Settings
            </Text>
          </Pressable>
          <Pressable onPress={onNext} className="mt-4 py-2">
            <Text className="text-gray-400 text-sm">Skip for now</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={handleRequest}
          className="mt-8 bg-blue-500 rounded-xl px-8 py-4 active:opacity-80"
          style={{ borderCurve: "continuous" }}
        >
          <Text className="text-white font-semibold text-base">
            Allow Microphone
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function TranscriptionSetupStep({ onNext }: { onNext: () => void }) {
  const [useLocal, setUseLocal] = useState(true);

  const handleNext = useCallback(() => {
    storage.set(SettingKeys.USE_LOCAL_WHISPER, useLocal);
    onNext();
  }, [useLocal, onNext]);

  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center">
        Transcription Mode
      </Text>
      <Text className="text-base text-gray-500 mt-3 text-center leading-6 mb-8">
        Choose how your speech is transcribed.
      </Text>

      <Pressable
        onPress={() => setUseLocal(true)}
        className={`w-full p-4 rounded-xl mb-3 border-2 ${
          useLocal
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-200 dark:border-gray-700"
        }`}
        style={{ borderCurve: "continuous" }}
      >
        <View className="flex-row items-center gap-3">
          <FontAwesome
            name="shield"
            size={20}
            color={useLocal ? "#3b82f6" : "#9ca3af"}
          />
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              On-Device (Private)
            </Text>
            <Text className="text-xs text-gray-500 mt-1">
              Uses WhisperKit. Download a model in Settings after setup.
            </Text>
          </View>
        </View>
      </Pressable>

      <Pressable
        onPress={() => setUseLocal(false)}
        className={`w-full p-4 rounded-xl mb-3 border-2 ${
          !useLocal
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-200 dark:border-gray-700"
        }`}
        style={{ borderCurve: "continuous" }}
      >
        <View className="flex-row items-center gap-3">
          <FontAwesome
            name="cloud"
            size={20}
            color={!useLocal ? "#3b82f6" : "#9ca3af"}
          />
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              Cloud
            </Text>
            <Text className="text-xs text-gray-500 mt-1">
              Uses OpenAI, Groq, or Mistral. Requires API key.
            </Text>
          </View>
        </View>
      </Pressable>

      <Pressable
        onPress={handleNext}
        className="mt-6 bg-blue-500 rounded-xl px-8 py-4 active:opacity-80"
        style={{ borderCurve: "continuous" }}
      >
        <Text className="text-white font-semibold text-base">Continue</Text>
      </Pressable>
    </View>
  );
}

function AgentNamingStep({ onNext }: { onNext: () => void }) {
  const [name, setName] = useState("");

  const handleNext = useCallback(() => {
    if (name.trim()) {
      storage.set(SettingKeys.AGENT_NAME, name.trim());
    }
    onNext();
  }, [name, onNext]);

  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center">
        Name Your Agent
      </Text>
      <Text className="text-base text-gray-500 mt-3 text-center leading-6 mb-8">
        Give your AI assistant a name. Say "Hey [name]" to activate agent mode.
      </Text>

      <TextInput
        className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4 text-lg text-gray-900 dark:text-white text-center"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Aria"
        placeholderTextColor="#9ca3af"
        autoCapitalize="words"
        autoCorrect={false}
        autoFocus
      />

      <Pressable
        onPress={handleNext}
        className="mt-8 bg-blue-500 rounded-xl px-8 py-4 active:opacity-80"
        style={{ borderCurve: "continuous" }}
      >
        <Text className="text-white font-semibold text-base">
          {name.trim() ? "Continue" : "Skip"}
        </Text>
      </Pressable>
    </View>
  );
}

function CompleteStep({ onFinish }: { onFinish: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 items-center justify-center mb-6">
        <FontAwesome name="check" size={36} color="#22c55e" />
      </View>
      <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center">
        You're All Set!
      </Text>
      <Text className="text-base text-gray-500 mt-3 text-center leading-6">
        Start dictating by tapping the record button. You can change settings
        anytime.
      </Text>
      <Pressable
        onPress={onFinish}
        className="mt-10 bg-blue-500 rounded-xl px-8 py-4 active:opacity-80"
        style={{ borderCurve: "continuous" }}
      >
        <Text className="text-white font-semibold text-base">
          Start Dictating
        </Text>
      </Pressable>
    </View>
  );
}

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const router = useRouter();

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => s + 1);
  }, []);

  const handleFinish = useCallback(() => {
    storage.set(SettingKeys.HAS_COMPLETED_ONBOARDING, true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)/dictate");
  }, [router]);

  return (
    <View className="flex-1 bg-white dark:bg-black pt-16">
      <StepIndicator current={step} total={TOTAL_STEPS} />
      {step === 0 && <WelcomeStep onNext={handleNext} />}
      {step === 1 && <MicPermissionStep onNext={handleNext} />}
      {step === 2 && <TranscriptionSetupStep onNext={handleNext} />}
      {step === 3 && <AgentNamingStep onNext={handleNext} />}
      {step === 4 && <CompleteStep onFinish={handleFinish} />}
    </View>
  );
}
