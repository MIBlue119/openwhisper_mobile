import promptData from "@/src/config/promptData.json";
import { getReasoningProvider } from "@/src/models/ModelRegistry";
import type { ReasoningProviderId } from "@/src/models/ModelRegistry";
import {
  processWithOpenAI,
  processWithAnthropic,
  processWithGemini,
  processWithGroq,
} from "./reasoning/providers";
import { getSecure, SecureKeys } from "@/src/storage/secureStorage";

export interface ReasoningConfig {
  provider: ReasoningProviderId;
  model: string;
  agentName: string;
  customDictionary?: string[];
}

/**
 * Detect if the user is addressing their agent by name.
 */
function detectAgentName(transcript: string, agentName: string): boolean {
  const lower = transcript.toLowerCase();
  const name = agentName.toLowerCase();
  return lower.includes(name);
}

/**
 * Build the system prompt based on whether the agent is being addressed.
 */
function buildSystemPrompt(
  transcript: string,
  agentName: string,
  customDictionary?: string[]
): string {
  const isAgentMode = detectAgentName(transcript, agentName);
  const basePrompt = isAgentMode
    ? promptData.FULL_PROMPT
    : promptData.CLEANUP_PROMPT;

  let prompt = basePrompt.replace(/\{\{agentName\}\}/g, agentName);

  if (customDictionary && customDictionary.length > 0) {
    prompt += promptData.DICTIONARY_SUFFIX + customDictionary.join(", ");
  }

  return prompt;
}

/**
 * Get the API key for a provider from secure storage.
 */
async function getApiKeyForProvider(
  provider: ReasoningProviderId
): Promise<string> {
  let key: string | null = null;
  switch (provider) {
    case "openai":
      key = await getSecure(SecureKeys.OPENAI_API_KEY);
      break;
    case "anthropic":
      key = await getSecure(SecureKeys.ANTHROPIC_API_KEY);
      break;
    case "gemini":
      key = await getSecure(SecureKeys.GEMINI_API_KEY);
      break;
    case "groq":
      key = await getSecure(SecureKeys.GROQ_API_KEY);
      break;
  }
  if (!key) {
    throw new Error(
      `No API key configured for ${provider}. Add one in Settings.`
    );
  }
  return key;
}

/**
 * Process transcribed text through AI reasoning.
 * Detects agent mode, selects prompt, routes to provider.
 */
export async function processReasoning(
  text: string,
  config: ReasoningConfig
): Promise<string> {
  if (!text.trim()) return "";

  const { provider, model, agentName, customDictionary } = config;
  const systemPrompt = buildSystemPrompt(text, agentName, customDictionary);
  const apiKey = await getApiKeyForProvider(provider);

  // Check for model-specific options
  const providerInfo = getReasoningProvider(provider);
  const modelInfo = providerInfo?.models.find((m) => m.id === model);

  const request = { text, model, systemPrompt, apiKey };

  switch (provider) {
    case "openai":
      return processWithOpenAI(request);
    case "anthropic":
      return processWithAnthropic(request);
    case "gemini":
      return processWithGemini(request);
    case "groq":
      return processWithGroq({
        ...request,
        disableThinking: (modelInfo as { disableThinking?: boolean })
          ?.disableThinking,
      });
    default:
      throw new Error(`Unsupported reasoning provider: ${provider}`);
  }
}
