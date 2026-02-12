import * as SecureStore from "expo-secure-store";

const KEY_PREFIX = "openwhispr_";

/**
 * Shared Keychain service name used by both the main app and keyboard extension.
 * Cross-target access is enabled by the shared `keychain-access-groups` entitlement
 * (com.openwhispr.mobile.shared) declared in app.json and expo-target.config.js.
 * Using a common `keychainService` ensures both targets reference the same items.
 */
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: "com.openwhispr.shared",
};

function prefixedKey(key: string): string {
  return `${KEY_PREFIX}${key}`;
}

export async function getSecureValue(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(prefixedKey(key), SECURE_STORE_OPTIONS);
}

export async function setSecureValue(
  key: string,
  value: string
): Promise<void> {
  await SecureStore.setItemAsync(prefixedKey(key), value, SECURE_STORE_OPTIONS);
}

export async function deleteSecureValue(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(prefixedKey(key), SECURE_STORE_OPTIONS);
}

export const SecureKeys = {
  OPENAI_API_KEY: "openai_api_key",
  ANTHROPIC_API_KEY: "anthropic_api_key",
  GEMINI_API_KEY: "gemini_api_key",
  GROQ_API_KEY: "groq_api_key",
  MISTRAL_API_KEY: "mistral_api_key",
} as const;

/** Convenience alias for reading a secure value */
export const getSecure = getSecureValue;

/** Convenience alias for writing a secure value */
export const setSecure = setSecureValue;
