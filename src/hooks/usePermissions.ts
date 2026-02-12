import { Audio } from "expo-av";
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Platform } from "react-native";

type PermissionStatus = "undetermined" | "granted" | "denied";

interface PermissionsState {
  microphone: PermissionStatus;
  loading: boolean;
  requestMicrophonePermission: () => Promise<boolean>;
  openSettings: () => void;
}

export function usePermissions(): PermissionsState {
  const [microphone, setMicrophone] = useState<PermissionStatus>("undetermined");
  const [loading, setLoading] = useState(true);

  const checkPermission = useCallback(async () => {
    const { status } = await Audio.getPermissionsAsync();
    setMicrophone(status as PermissionStatus);
    setLoading(false);
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Re-check when app comes back from settings
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        checkPermission();
      }
    });
    return () => subscription.remove();
  }, [checkPermission]);

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Audio.requestPermissionsAsync();
    const granted = status === "granted";
    setMicrophone(status as PermissionStatus);
    return granted;
  }, []);

  const openSettings = useCallback(() => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    }
  }, []);

  return {
    microphone,
    loading,
    requestMicrophonePermission,
    openSettings,
  };
}
