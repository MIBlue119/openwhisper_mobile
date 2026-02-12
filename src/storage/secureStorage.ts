import * as SecureStore from "expo-secure-store";

const KEY_PREFIX = "openwhispr_";

function prefixedKey(key: string): string {
  return `${KEY_PREFIX}${key}`;
}

export async function getSecureValue(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(prefixedKey(key));
}

export async function setSecureValue(
  key: string,
  value: string
): Promise<void> {
  await SecureStore.setItemAsync(prefixedKey(key), value);
}

export async function deleteSecureValue(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(prefixedKey(key));
}

export const SecureKeys = {
  OPENAI_API_KEY: "openai_api_key",
  ANTHROPIC_API_KEY: "anthropic_api_key",
  GEMINI_API_KEY: "gemini_api_key",
  GROQ_API_KEY: "groq_api_key",
} as const;
