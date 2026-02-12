import { createMMKV, type MMKV } from "react-native-mmkv";

/**
 * MMKV storage instance configured to use the App Group shared container on iOS.
 *
 * react-native-mmkv v4 automatically detects the `AppGroupIdentifier` key in Info.plist
 * and uses the App Group container directory when present. This allows the keyboard
 * extension to read settings written by the main app.
 *
 * The `AppGroupIdentifier` is set in app.json → ios.infoPlist.
 */
export const storage: MMKV = createMMKV({
  id: "openwhispr-settings",
  encryptionKey: "openwhispr-v1",
});
