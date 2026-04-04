import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = "claude-sonnet-4-20250514";

const cache = new Map<string, string>();

function hashKey(prompt: string, systemPrompt?: string): string {
  const input = `${systemPrompt ?? ""}::${prompt}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

export async function askClaude(
  prompt: string,
  options?: {
    systemPrompt?: string;
    maxTokens?: number;
    skipCache?: boolean;
  }
): Promise<string> {
  const maxTokens = options?.maxTokens ?? 1024;
  const key = hashKey(prompt, options?.systemPrompt);

  if (!options?.skipCache && cache.has(key)) {
    return cache.get(key)!;
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    ...(options?.systemPrompt ? { system: options.systemPrompt } : {}),
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  cache.set(key, text);
  return text;
}

export async function askClaudeJSON<T>(
  prompt: string,
  options?: {
    systemPrompt?: string;
    maxTokens?: number;
    skipCache?: boolean;
  }
): Promise<T> {
  const systemPrompt = [
    options?.systemPrompt ?? "",
    "Respond ONLY with valid JSON. No markdown, no code fences, no explanation.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const text = await askClaude(prompt, {
    ...options,
    systemPrompt,
  });

  const cleaned = text
    .replace(/^```json?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  return JSON.parse(cleaned) as T;
}

export function getCacheSize(): number {
  return cache.size;
}

export function clearCache(): void {
  cache.clear();
}
