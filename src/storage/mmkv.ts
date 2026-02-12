import { createMMKV, type MMKV } from "react-native-mmkv";

export const storage: MMKV = createMMKV({
  id: "openwhispr-settings",
  encryptionKey: "openwhispr-v1",
});
