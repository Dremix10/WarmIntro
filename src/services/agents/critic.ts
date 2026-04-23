// Critic agent — reviews every Correspondent draft on 4 axes
// Verdict: approve | reject | escalate_to_planner (after N iterations)
// Writes critic_reviews row and signals scored outcomes for flywheel

import { startAgentRun, endAgentRun, askClaudeJSON, logSignal, getAdminClient } from "./shared";
import type { CriticScores, CriticVerdict } from "@/shared/ib-types";

export interface CriticInput {
  draftId: string;
}

export interface CriticOutput {
  reviewId: string;
  verdict: CriticVerdict;
  scores: CriticScores;
  overallScore: number;
  feedback?: string;
  suggestedRevision?: string;
}

const MAX_ITERATIONS = 3;
const APPROVAL_THRESHOLD = 7; // per axis

const SYSTEM_PROMPT = `You are a recruiting VP reviewing a cold email a college sophomore is about to send to an investment banker. Your job is to score it on 4 axes and either approve or reject with surgical feedback.

Axes (each 0-10):
1. Specificity — is there real, verifiable banker context? Does it reference a specific deal, post, career move, or group? Generic praise or vague "I admire your work" = low score. Specific call-out from their LinkedIn or a deal = high score.
2. Voice Match — does this sound like a 20-year-old sophomore who wrote it themselves? Or does it sound like AI / consultant-speak / someone trying too hard? Contractions, short sentences, casual-but-thoughtful = high score. Formal, "I hope this email finds you well" = low score.
3. Guardrails — no em-dashes (—). No banned words (cognizant, leverage, endeavor, synergy, furthermore, accordingly, aforementioned). Appropriate length (100-180 words). Ends with correct sign-off. Polite ask for 15 min, not a demand.
4. Shared-ground anchor — does this open with something GENUINELY specific to this banker, or is it a generic "I saw you work at X" opener that could be sent to anyone in the group?

Rules:
- If ANY axis scores below 7, verdict = reject. Give surgical feedback on the weakest axis.
- Don't be nice. Be the reviewer these students need. If it's bad, say what's bad and how to fix it.
- If all axes ≥ 7, verdict = approve.
- feedback: 1-3 sentences, actionable. If reject, include a "try this" one-line suggestion.
- suggestedRevision (optional): if you can quickly rewrite the opener or subject to fix the weakest axis, include it verbatim.`;

interface DraftRow {
  id: string;
  user_id: string;
  banker_id: string | null;
  body: string;
  subject: string | null;
  type: string;
  iteration_count: number;
  guardrail_flags: Record<string, unknown>;
}

export async function runCritic(input: CriticInput): Promise<CriticOutput> {
  const admin = getAdminClient();

  const { data: draft } = await admin
    .from("drafts")
    .select("*")
    .eq("id", input.draftId)
    .single();
  if (!draft) throw new Error("Draft not found");

  const d = draft as DraftRow;

  const ctx = await startAgentRun({
    agent: "critic",
    userId: d.user_id,
    triggeredBy: "agent_dispatch",
    inputSummary: { draftId: input.draftId, iteration: d.iteration_count },
  });

  try {
    // Hard auto-reject if guardrails blocked the draft
    const flags = d.guardrail_flags ?? {};
    const bannedPhrases = Array.isArray((flags as { bannedPhrasesFound?: unknown }).bannedPhrasesFound)
      ? (flags as { bannedPhrasesFound: string[] }).bannedPhrasesFound
      : [];
    const tooShort = Boolean((flags as { tooShort?: boolean }).tooShort);
    const tooLong = Boolean((flags as { tooLong?: boolean }).tooLong);

    if (bannedPhrases.length > 0 || tooShort || tooLong) {
      const guardrailScore = bannedPhrases.length > 0 ? 2 : tooShort ? 4 : 5;
      const review = await persistReview({
        draftId: d.id,
        scores: { specificity: 5, voiceMatch: 5, guardrails: guardrailScore, sharedGround: 5 },
        overallScore: (5 + 5 + guardrailScore + 5) / 4,
        verdict: d.iteration_count >= MAX_ITERATIONS ? "escalate_to_planner" : "reject",
        feedback: [
          bannedPhrases.length > 0 ? `Banned phrases detected: ${bannedPhrases.join(", ")}` : null,
          tooShort ? "Email is too short — should be 100-180 words" : null,
          tooLong ? "Email is too long — trim to 100-180 words" : null,
        ]
          .filter(Boolean)
          .join(". "),
      });
      await advanceDraftStatus(d.id, review.verdict);
      await endAgentRun(ctx, { verdict: review.verdict, reason: "guardrail_hard_fail" });
      return review;
    }

    // Claude review
    const prompt = `Review this draft:

SUBJECT: ${d.subject ?? "(no subject)"}

BODY:
${d.body}

TYPE: ${d.type} (${d.type === "cold" ? "first-time cold outreach to this banker" : d.type === "followup" ? "follow-up on a prior unanswered email" : d.type === "reply" ? "response to the banker's reply" : "thank-you after a coffee chat"})

Return JSON:
{
  "scores": {
    "specificity": 0-10,
    "voiceMatch": 0-10,
    "guardrails": 0-10,
    "sharedGround": 0-10
  },
  "overallScore": 0-10 (arithmetic mean),
  "verdict": "approve" | "reject",
  "feedback": "1-3 sentences",
  "suggestedRevision": "optional quick rewrite of the weakest part, or omit"
}`;

    const result = await askClaudeJSON<{
      scores: CriticScores;
      overallScore: number;
      verdict: "approve" | "reject";
      feedback: string;
      suggestedRevision?: string;
    }>(prompt, {
      systemPrompt: SYSTEM_PROMPT,
      maxTokens: 1024,
      skipCache: true,
    });

    // Enforce axis-threshold even if Claude says approve
    const minAxis = Math.min(result.scores.specificity, result.scores.voiceMatch, result.scores.guardrails, result.scores.sharedGround);
    let verdict: CriticVerdict = minAxis >= APPROVAL_THRESHOLD ? "approve" : "reject";

    if (verdict === "reject" && d.iteration_count + 1 >= MAX_ITERATIONS) {
      verdict = "escalate_to_planner";
    }

    const review = await persistReview({
      draftId: d.id,
      scores: result.scores,
      overallScore: result.overallScore,
      verdict,
      feedback: result.feedback,
      suggestedRevision: result.suggestedRevision,
    });

    await advanceDraftStatus(d.id, verdict);

    await logSignal({
      userId: d.user_id,
      bankerId: d.banker_id ?? undefined,
      draftId: d.id,
      agent: "critic",
      signalType: `critic_${verdict}`,
      metadata: {
        overallScore: result.overallScore,
        axes: result.scores,
        iteration: d.iteration_count,
      },
    });

    await endAgentRun(ctx, { verdict, overallScore: result.overallScore });
    return review;
  } catch (err) {
    await endAgentRun(ctx, {}, String(err));
    throw err;
  }
}

async function persistReview(opts: {
  draftId: string;
  scores: CriticScores;
  overallScore: number;
  verdict: CriticVerdict;
  feedback?: string;
  suggestedRevision?: string;
}): Promise<CriticOutput> {
  const admin = getAdminClient();
  const { data } = await admin
    .from("critic_reviews")
    .insert({
      draft_id: opts.draftId,
      scores: opts.scores as unknown as never,
      overall_score: opts.overallScore,
      verdict: opts.verdict,
      feedback: opts.feedback,
      suggested_revision: opts.suggestedRevision,
    })
    .select("id")
    .single();

  await admin.from("drafts").update({ critic_review_id: data?.id }).eq("id", opts.draftId);

  return {
    reviewId: data?.id ?? "",
    scores: opts.scores,
    overallScore: opts.overallScore,
    verdict: opts.verdict,
    feedback: opts.feedback,
    suggestedRevision: opts.suggestedRevision,
  };
}

async function advanceDraftStatus(draftId: string, verdict: CriticVerdict): Promise<void> {
  const admin = getAdminClient();
  const newStatus =
    verdict === "approve"
      ? "approved"
      : verdict === "escalate_to_planner"
      ? "rejected_unresolvable"
      : "needs_revision";
  await admin.from("drafts").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", draftId);
}
