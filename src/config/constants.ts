export const API_ENDPOINTS = {
  OPENAI_BASE: "https://api.openai.com/v1",
  OPENAI_RESPONSES: "https://api.openai.com/v1/responses",
  ANTHROPIC: "https://api.anthropic.com/v1/messages",
  GEMINI: "https://generativelanguage.googleapis.com/v1beta",
  GROQ_BASE: "https://api.groq.com/openai/v1",
  MISTRAL_BASE: "https://api.mistral.ai/v1",
} as const;

export const API_VERSIONS = {
  ANTHROPIC: "2023-06-01",
} as const;

export const TOKEN_LIMITS = {
  MIN_TOKENS: 100,
  MAX_TOKENS: 2048,
  MAX_TOKENS_ANTHROPIC: 4096,
  MAX_TOKENS_GEMINI: 8192,
  TOKEN_MULTIPLIER: 2,
} as const;

export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000,
  BACKOFF_MULTIPLIER: 2,
} as const;
