import { Redirect } from "expo-router";
import { storage } from "@/src/storage/mmkv";
import { SettingKeys } from "@/src/hooks/useSettings";

export default function Index() {
  const hasOnboarded = storage.getBoolean(SettingKeys.HAS_COMPLETED_ONBOARDING) ?? false;

  if (!hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/dictate" />;
}
