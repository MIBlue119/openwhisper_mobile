import {
  API_ENDPOINTS,
  API_VERSIONS,
  TOKEN_LIMITS,
} from "@/src/config/constants";

export interface ReasoningRequest {
  text: string;
  model: string;
  systemPrompt: string;
  apiKey: string;
}

function estimateMaxTokens(text: string, provider: string): number {
  const estimated = Math.max(
    text.length * TOKEN_LIMITS.TOKEN_MULTIPLIER,
    TOKEN_LIMITS.MIN_TOKENS
  );
  const limit =
    provider === "gemini"
      ? TOKEN_LIMITS.MAX_TOKENS_GEMINI
      : provider === "anthropic"
        ? TOKEN_LIMITS.MAX_TOKENS_ANTHROPIC
        : TOKEN_LIMITS.MAX_TOKENS;
  return Math.min(estimated, limit);
}

/**
 * OpenAI Responses API (primary) with Chat Completions fallback.
 */
export async function processWithOpenAI(
  req: ReasoningRequest
): Promise<string> {
  // Try Responses API first
  const responsesResult = await callOpenAIResponses(req);
  if (responsesResult !== null) return responsesResult;

  // Fallback to Chat Completions
  return callOpenAIChatCompletions(req);
}

async function callOpenAIResponses(
  req: ReasoningRequest
): Promise<string | null> {
  try {
    const response = await fetch(API_ENDPOINTS.OPENAI_RESPONSES, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.apiKey}`,
      },
      body: JSON.stringify({
        model: req.model,
        input: [
          { role: "system", content: req.systemPrompt },
          { role: "user", content: req.text },
        ],
        store: false,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    // Extract text from Responses API format
    const output = data.output;
    if (Array.isArray(output)) {
      for (const item of output) {
        if (item.type === "message" && Array.isArray(item.content)) {
          for (const block of item.content) {
            if (block.type === "output_text" || block.type === "text") {
              return block.text;
            }
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function callOpenAIChatCompletions(
  req: ReasoningRequest
): Promise<string> {
  const maxTokens = estimateMaxTokens(req.text, "openai");
  const response = await fetch(
    `${API_ENDPOINTS.OPENAI_BASE}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.apiKey}`,
      },
      body: JSON.stringify({
        model: req.model,
        messages: [
          { role: "system", content: req.systemPrompt },
          { role: "user", content: req.text },
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text().catch(() => "Unknown error");
    throw new Error(`OpenAI request failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Anthropic Messages API — direct call (no CORS issues in React Native).
 */
export async function processWithAnthropic(
  req: ReasoningRequest
): Promise<string> {
  const maxTokens = estimateMaxTokens(req.text, "anthropic");

  const response = await fetch(API_ENDPOINTS.ANTHROPIC, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": req.apiKey,
      "anthropic-version": API_VERSIONS.ANTHROPIC,
    },
    body: JSON.stringify({
      model: req.model,
      max_tokens: maxTokens,
      system: req.systemPrompt,
      messages: [{ role: "user", content: req.text }],
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "Unknown error");
    throw new Error(`Anthropic request failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  const content = data.content;
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block.type === "text") return block.text;
    }
  }
  return "";
}

/**
 * Google Gemini generateContent API.
 */
export async function processWithGemini(
  req: ReasoningRequest
): Promise<string> {
  const maxTokens = estimateMaxTokens(req.text, "gemini");
  const endpoint = `${API_ENDPOINTS.GEMINI}/models/${req.model}:generateContent`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": req.apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: `${req.systemPrompt}\n\n${req.text}` }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "Unknown error");
    throw new Error(`Gemini request failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  const candidates = data.candidates;
  if (Array.isArray(candidates) && candidates.length > 0) {
    const parts = candidates[0]?.content?.parts;
    if (Array.isArray(parts)) {
      // Skip thinking blocks, take text content
      for (const part of parts) {
        if (part.text && !part.thought) return part.text;
      }
      // If all are thought blocks, take last text
      for (const part of parts) {
        if (part.text) return part.text;
      }
    }
  }
  return "";
}

/**
 * Groq Chat Completions API (OpenAI-compatible).
 */
export async function processWithGroq(
  req: ReasoningRequest & { disableThinking?: boolean }
): Promise<string> {
  const maxTokens = estimateMaxTokens(req.text, "groq");

  const body: Record<string, unknown> = {
    model: req.model,
    messages: [
      { role: "system", content: req.systemPrompt },
      { role: "user", content: req.text },
    ],
    max_tokens: maxTokens,
    temperature: 0.3,
  };

  // Disable thinking for models like Qwen that default to thinking mode
  if (req.disableThinking) {
    body.reasoning_effort = "none";
  }

  const response = await fetch(
    `${API_ENDPOINTS.GROQ_BASE}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.apiKey}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const err = await response.text().catch(() => "Unknown error");
    throw new Error(`Groq request failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}
