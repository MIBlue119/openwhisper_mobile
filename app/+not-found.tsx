import { Link, Stack } from "expo-router";
import { View, Text } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center p-5 bg-white dark:bg-black">
        <Text className="text-xl font-bold text-gray-800 dark:text-gray-200">
          This screen doesn't exist.
        </Text>
        <Link href="/" className="mt-4 py-4">
          <Text className="text-sm text-blue-500">Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}
