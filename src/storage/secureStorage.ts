import * as SecureStore from "expo-secure-store";

const KEY_PREFIX = "openwhispr_";

/**
 * Shared Keychain access group for accessing API keys from both the main app
 * and the keyboard extension. Uses the same access group declared in entitlements.
 */
const KEYCHAIN_ACCESS_GROUP = "com.openwhispr.mobile.shared";

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessGroup: KEYCHAIN_ACCESS_GROUP,
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
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
