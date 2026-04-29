import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
// Default model for cheap/parallel work (Researcher Serper synthesis,
// fact-check extract, Scout classification). Correspondent + Critic
// override to Opus because Sonnet ignored both system-prompt HARD BANS
// and cumulative revision history during testing — Opus follows
// instructions more reliably and the per-call cost is justified.
const MODEL = "claude-sonnet-4-20250514";
// Opus 4.7 (latest). Used by Correspondent + Critic for stricter
// instruction-following — Sonnet ignored HARD BAN list and cumulative
// revision history; Opus 4.7 reliably honors multi-step constraint prompts.
export const OPUS_MODEL = "claude-opus-4-7";

const MAX_CACHE_SIZE = 200;
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
    model?: string;
  }
): Promise<string> {
  const maxTokens = options?.maxTokens ?? 1024;
  const model = options?.model ?? MODEL;
  // Cache is keyed on (model + system + prompt) so two callers with
  // different models don't collide.
  const key = hashKey(prompt, `${model}::${options?.systemPrompt ?? ""}`);

  if (!options?.skipCache && cache.has(key)) {
    return cache.get(key)!;
  }

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    ...(options?.systemPrompt ? { system: options.systemPrompt } : {}),
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  if (cache.size >= MAX_CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, text);
  return text;
}

export async function askClaudeJSON<T>(
  prompt: string,
  options?: {
    systemPrompt?: string;
    maxTokens?: number;
    skipCache?: boolean;
    model?: string;
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
