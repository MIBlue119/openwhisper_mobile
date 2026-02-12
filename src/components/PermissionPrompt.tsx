import { Pressable, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface PermissionPromptProps {
  onRequestPermission: () => void;
  onOpenSettings: () => void;
  isDenied: boolean;
}

export function PermissionPrompt({
  onRequestPermission,
  onOpenSettings,
  isDenied,
}: PermissionPromptProps) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <FontAwesome name="microphone-slash" size={48} color="#9ca3af" />
      <Text className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6 text-center">
        Microphone Access Required
      </Text>
      <Text className="text-base text-gray-500 dark:text-gray-400 mt-2 text-center leading-6">
        OpenWhispr needs microphone access to record your voice for transcription.
      </Text>
      {isDenied ? (
        <Pressable
          onPress={onOpenSettings}
          className="mt-6 bg-blue-500 rounded-xl px-6 py-3 active:opacity-80"
          style={{ borderCurve: "continuous" }}
          accessibilityRole="button"
          accessibilityLabel="Open device settings to grant microphone permission"
        >
          <Text className="text-white font-semibold text-base">
            Open Settings
          </Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={onRequestPermission}
          className="mt-6 bg-blue-500 rounded-xl px-6 py-3 active:opacity-80"
          style={{ borderCurve: "continuous" }}
          accessibilityRole="button"
          accessibilityLabel="Grant microphone permission"
        >
          <Text className="text-white font-semibold text-base">
            Allow Microphone
          </Text>
        </Pressable>
      )}
    </View>
  );
}
