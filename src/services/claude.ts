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

export async function askClaude(
  prompt: string,
  options?: {
    systemPrompt?: string;
    maxTokens?: number;
    model?: string;
  }
): Promise<string> {
  const maxTokens = options?.maxTokens ?? 1024;
  const model = options?.model ?? MODEL;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    ...(options?.systemPrompt ? { system: options.systemPrompt } : {}),
    messages: [{ role: "user", content: prompt }],
  });

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

export async function askClaudeJSON<T>(
  prompt: string,
  options?: {
    systemPrompt?: string;
    maxTokens?: number;
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
