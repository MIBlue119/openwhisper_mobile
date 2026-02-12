import registryData from "./modelRegistryData.json";

export interface TranscriptionModel {
  id: string;
  name: string;
  description: string;
}

export interface TranscriptionProvider {
  id: string;
  name: string;
  baseUrl: string;
  models: TranscriptionModel[];
}

export interface ReasoningModel {
  id: string;
  name: string;
  description: string;
  disableThinking?: boolean;
}

export interface ReasoningProvider {
  id: string;
  name: string;
  models: ReasoningModel[];
}

export function getTranscriptionProviders(): TranscriptionProvider[] {
  return registryData.transcriptionProviders;
}

export function getReasoningProviders(): ReasoningProvider[] {
  return registryData.cloudProviders;
}

export function getTranscriptionProvider(
  id: string
): TranscriptionProvider | undefined {
  return registryData.transcriptionProviders.find((p) => p.id === id);
}

export function getReasoningProvider(
  id: string
): ReasoningProvider | undefined {
  return registryData.cloudProviders.find((p) => p.id === id);
}

export function getTranscriptionBaseUrl(providerId: string): string {
  const provider = getTranscriptionProvider(providerId);
  return provider?.baseUrl ?? "https://api.openai.com/v1";
}

export type ReasoningProviderId = "openai" | "anthropic" | "gemini" | "groq";
export type TranscriptionProviderId = "openai" | "groq" | "mistral";
