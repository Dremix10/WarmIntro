import Anthropic from "@anthropic-ai/sdk";
import { getAdminClient } from "@/lib/supabase-admin";

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

// Anthropic list pricing as of 2026-04. $/Mtoken (input, output).
// Update when models change. Keys are model IDs (or prefix matches).
const PRICING_USD_PER_MTOKEN: Record<string, { input: number; output: number }> = {
  "claude-opus-4-7": { input: 15, output: 75 },
  "claude-opus-4-": { input: 15, output: 75 },           // any opus-4.x default
  "claude-sonnet-4-": { input: 3, output: 15 },          // any sonnet-4.x default
};

function priceFor(model: string): { input: number; output: number } {
  if (PRICING_USD_PER_MTOKEN[model]) return PRICING_USD_PER_MTOKEN[model];
  for (const prefix of Object.keys(PRICING_USD_PER_MTOKEN)) {
    if (model.startsWith(prefix)) return PRICING_USD_PER_MTOKEN[prefix];
  }
  // Unknown model — bill at Sonnet rate, log so we notice.
  console.warn(`[claude] unknown pricing for model ${model}, billing at Sonnet rate`);
  return { input: 3, output: 15 };
}

interface UsageContext {
  userId?: string;
  agent?: string;
}

// Fire-and-forget write to claude_usage. Never throws — telemetry should
// never break the actual API call.
function logUsage(ctx: UsageContext | undefined, model: string, inputTokens: number, outputTokens: number) {
  void (async () => {
    try {
      const p = priceFor(model);
      const cost = (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
      const admin = getAdminClient();
      await admin.from("claude_usage").insert({
        user_id: ctx?.userId ?? null,
        agent: ctx?.agent ?? null,
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: Number(cost.toFixed(6)),
      });
    } catch (err) {
      console.warn("[claude/logUsage] failed", err);
    }
  })();
}

export async function askClaude(
  prompt: string,
  options?: {
    systemPrompt?: string;
    maxTokens?: number;
    model?: string;
    userId?: string;
    agent?: string;
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

  // Capture usage. response.usage exists on every Anthropic API response.
  if (response.usage) {
    logUsage(
      { userId: options?.userId, agent: options?.agent },
      model,
      response.usage.input_tokens,
      response.usage.output_tokens
    );
  }

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
    userId?: string;
    agent?: string;
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
