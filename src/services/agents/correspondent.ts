// Correspondent agent — draft cold / followup / reply / thank-you emails
// Uses findCommonGround tool; applies guardrails; Critic reviews the output

import { startAgentRun, endAgentRun, askClaudeJSON, logSignal } from "./shared";
import { OPUS_MODEL } from "@/services/claude";
import { restSelectOne, restSelect, restInsert, restUpdate, eq } from "@/lib/supabase-rest";
import { applyGuardrails } from "@/services/guardrails";
import { scoutBankerFindings, type ScoutedFinding } from "./scout";
import type { CommonGroundAnchor, DraftType } from "@/shared/ib-types";

export interface CorrespondentInput {
  userId: string;
  type: DraftType;
  bankerId: string;
  connectionId?: string;
  threadContext?: {
    previousMessageBodyPreview?: string;
    daysSilent?: number;
    incomingReplyBody?: string;
  };
  // Cumulative feedback from EVERY prior Critic iteration on this draft.
  // The model needs the full history — without it, iter 2 forgets what
  // iter 0 said and re-introduces the same banned phrasing. Index 0 is
  // iter 0's feedback, index 1 is iter 1's, etc.
  revisionFeedbackHistory?: string[];
  // Set by the Critic-loop on revise iterations. The unique index
  // uq_drafts_active_user_banker_type forbids two active drafts for the same
  // (user, banker, type), so revise iterations MUST UPDATE the existing draft
  // — INSERTing a fresh one silently fails and breaks the loop.
  existingDraftId?: string;
  iteration?: number;
}

export interface CorrespondentOutput {
  draftId?: string;
  subject: string;
  body: string;
  anchors: CommonGroundAnchor[];
  rejectedForNoAnchor?: boolean;
  guardrailFlags: ReturnType<typeof applyGuardrails>["flags"];
}

// ===== findCommonGround tool =====
interface UserContext {
  name: string;
  university: string;
  major: string;
  graduationYear: number;
  storyOneLiner?: string;
  clubs?: string[];
  hometown?: string;
  coursework?: string[];
  warmHints: string[];
}

interface BankerContext {
  name: string;
  title: string;
  firm: string;
  firmName?: string;
  linkedinUrl?: string;
  group?: string;
  university?: string;
  gradYear?: number;
  aboutSection?: string;
  recentPosts: Array<{ content: string }>;
  recentDeals: Array<{ name: string; description?: string }>;
  pastPositions: Array<{ firm: string; role: string }>;
  education: Array<{ school: string; degree?: string; activities?: string[] }>;
  interests: string[];
}

export async function findCommonGround(
  user: UserContext,
  banker: BankerContext
): Promise<CommonGroundAnchor[]> {
  const prompt = `Find 2-3 genuine common-ground anchors between a college sophomore and a banker they're reaching out to. Rank by opener-value.

STUDENT:
${JSON.stringify(user, null, 2)}

BANKER:
${JSON.stringify(banker, null, 2)}

Return JSON:
[
  {
    "type": "shared_major" | "shared_club" | "shared_city" | "shared_hobby" | "banker_recent_post" | "banker_deal_area" | "shared_alma_mater_of_past_position" | "shared_coursework",
    "detail": "one sentence, specific: what the overlap is",
    "confidence": 0-1,
    "openerAngle": "one sentence: how a natural 20-year-old student could reference this in the first line of an email"
  }
]

Rules:
- Only include ACTUAL overlaps you can verify from the data above. Don't invent.
- If none high-confidence exists, return [].
- Prefer specific overlaps (a deal the banker worked on that intersects student's interest area) over generic ones (both went to liberal arts college).
- confidence: 0.9+ = nearly identical (same club, same hometown); 0.7-0.89 = strong connection (same field, shared major area); 0.5-0.69 = weaker but real.`;

  try {
    const anchors = await askClaudeJSON<CommonGroundAnchor[]>(prompt, { maxTokens: 1024 });
    return Array.isArray(anchors) ? anchors.filter((a) => a.confidence >= 0.5) : [];
  } catch (err) {
    console.warn("[correspondent] findCommonGround failed", err);
    return [];
  }
}

async function getBankerContext(bankerId: string): Promise<BankerContext | null> {
  const [banker, profile, deals] = await Promise.all([
    restSelectOne("bankers", { select: "*", filters: { id: eq(bankerId) } }),
    restSelectOne("banker_profiles", { select: "*", filters: { banker_id: eq(bankerId) } }),
    restSelect("banker_deals", { select: "*", filters: { banker_id: eq(bankerId) }, limit: 5 }),
  ]);

  if (!banker) return null;

  let firmName: string | undefined;
  if (banker.firm_id) {
    const firm = await restSelectOne("firms", { select: "name", filters: { id: eq(banker.firm_id) } });
    firmName = firm?.name;
  }

  return {
    name: banker.name,
    title: banker.title,
    firm: firmName ?? banker.firm_id ?? "",
    firmName,
    linkedinUrl: banker.linkedin_url ?? undefined,
    group: banker.group_id ?? undefined,
    university: banker.university ?? undefined,
    gradYear: banker.grad_year ?? undefined,
    aboutSection: profile?.about_section ?? undefined,
    recentPosts: ((profile?.recent_posts ?? []) as Array<{ content: string }>).slice(0, 5),
    recentDeals: deals.map((d) => ({ name: d.deal_name, description: d.description ?? undefined })),
    pastPositions: ((profile?.past_positions ?? []) as Array<{ firm: string; role: string }>).slice(0, 5),
    education: ((profile?.education ?? []) as Array<{ school: string; degree?: string; activities?: string[] }>).slice(0, 3),
    interests: (profile?.interests ?? []) as string[],
  };
}

async function getUserContext(userId: string): Promise<UserContext | null> {
  const data = await restSelectOne("profiles", {
    select: "name, university, major, graduation_year, story_one_liner, warm_hints, skills, experience",
    filters: { id: eq(userId) },
  });
  if (!data) return null;
  return {
    name: data.name,
    university: data.university,
    major: data.major,
    graduationYear: data.graduation_year,
    storyOneLiner: data.story_one_liner ?? undefined,
    clubs: [],
    warmHints: (data.warm_hints ?? []) as string[],
  };
}

// ===== Drafting =====

export async function runCorrespondent(input: CorrespondentInput): Promise<CorrespondentOutput> {
  const ctx = await startAgentRun({
    agent: "correspondent",
    userId: input.userId,
    triggeredBy: "agent_dispatch",
    inputSummary: { type: input.type, bankerId: input.bankerId },
  });

  try {
    const [user, banker] = await Promise.all([getUserContext(input.userId), getBankerContext(input.bankerId)]);
    if (!user || !banker) {
      await endAgentRun(ctx, { error: "missing context" }, "missing_context");
      return { subject: "", body: "", anchors: [], rejectedForNoAnchor: false, guardrailFlags: { emDashesReplaced: 0, bannedWordsFound: [], bannedPhrasesFound: [], tooLong: false, tooShort: false } };
    }

    // Step 1: Find common ground + scout for recent findings in parallel
    // (only for cold outreach; follow-ups and replies use prior thread).
    let anchors: CommonGroundAnchor[] = [];
    let scoutedFindings: ScoutedFinding[] = [];
    if (input.type === "cold") {
      const [cg, sc] = await Promise.all([
        findCommonGround(user, banker),
        scoutBankerFindings({
          bankerId: input.bankerId,
          bankerName: banker.name,
          firmName: banker.firmName,
          linkedinUrl: banker.linkedinUrl,
        }),
      ]);
      anchors = cg;
      scoutedFindings = sc;
      if (anchors.length === 0) {
        // Researcher rejection path — bubble back
        await logSignal({
          userId: input.userId,
          bankerId: input.bankerId,
          agent: "correspondent",
          signalType: "rejected_no_common_ground",
          metadata: {},
        });
        await endAgentRun(ctx, { rejectedForNoAnchor: true });
        return { subject: "", body: "", anchors: [], rejectedForNoAnchor: true, guardrailFlags: { emDashesReplaced: 0, bannedWordsFound: [], bannedPhrasesFound: [], tooLong: false, tooShort: false } };
      }
    }

    // Step 2: Draft the email
    const draftingPrompt = buildDraftPrompt(input, user, banker, anchors, scoutedFindings);
    const drafted = await askClaudeJSON<{ subject: string; body: string }>(draftingPrompt, {
      systemPrompt: systemPromptForType(input.type),
      maxTokens: 1024,
      // Opus follows the HARD BANS list and cumulative revision history more
      // reliably than Sonnet. The drafted email is the centerpiece of the
      // product — instruction-following matters more than per-call cost.
      model: OPUS_MODEL,
      skipCache: Boolean(input.revisionFeedbackHistory && input.revisionFeedbackHistory.length > 0),
    });

    // Step 3: Apply guardrails
    const { body: cleanedBody, flags } = applyGuardrails(drafted.body);

    // Step 4: Persist as draft. On revise iterations we MUST update the
    // existing row — the unique index uq_drafts_active_user_banker_type
    // would silently reject a fresh INSERT for the same (user, banker, type).
    let draftId: string | undefined;
    if (input.existingDraftId) {
      await restUpdate(
        "drafts",
        {
          subject: drafted.subject,
          body: cleanedBody,
          guardrail_flags: flags,
          status: "pending_critic",
          iteration_count: input.iteration ?? 1,
          // Reset critic linkage so the next Critic run produces a fresh review
          // attached to this revised body.
          critic_review_id: null,
          fact_check: null,
          updated_at: new Date().toISOString(),
        },
        { id: eq(input.existingDraftId) }
      );
      draftId = input.existingDraftId;
    } else {
      const inserted = await restInsert("drafts", {
        user_id: input.userId,
        banker_id: input.bankerId,
        connection_id: input.connectionId,
        type: input.type,
        subject: drafted.subject,
        body: cleanedBody,
        guardrail_flags: flags,
        status: "pending_critic",
        iteration_count: 0,
      });
      draftId = inserted[0]?.id;
    }

    await logSignal({
      userId: input.userId,
      bankerId: input.bankerId,
      draftId,
      agent: "correspondent",
      signalType: "draft_created",
      metadata: { type: input.type, anchors: anchors.map((a) => a.type) },
    });

    await endAgentRun(ctx, { draftId, anchorCount: anchors.length, guardrailFlags: flags });

    return {
      draftId,
      subject: drafted.subject,
      body: cleanedBody,
      anchors,
      rejectedForNoAnchor: false,
      guardrailFlags: flags,
    };
  } catch (err) {
    await endAgentRun(ctx, {}, String(err));
    throw err;
  }
}

// ===== Prompts =====

const BASE_VOICE = `You are writing as a 20-year-old college sophomore reaching out to an investment banking professional. The point is to sound like a real curious student who noticed something specific. NOT like a "smart networking email" written by AI.

ZERO-FABRICATION RULE — read this twice:
You MUST NOT invent or paraphrase ANY specific claim about the banker. If their data has no recent post, do NOT reference one. If their data lists no specific deal, do NOT name one. If you don't see a specific career detail, do NOT make one up. You can only reference:
- The school overlap (if it exists in the data)
- Their firm + group (verbatim from data)
- Their title (verbatim from data)
- Any verbatim line from "recent_post" or "deal_areas" or "about_section" if those fields are explicitly populated.
If you're tempted to write "I saw your team advised on X" or "Your post about Y caught my attention" — STOP and check whether X or Y appears verbatim in the data. If not, the line cannot exist. Lean on the school/firm/group anchors instead. A short honest email beats a fabricated specific one — bankers can spot fabrications instantly and it ends the conversation before it starts.


VOICE TARGET — what a real sophomore sounds like:
- Plain, direct, slightly under-polished. They don't write like consultants.
- Short. They get to the point because they know the banker is busy.
- A little casual is fine. "Hey", "Hi", contractions, sentence fragments occasionally.
- Specific over impressive. "I saw your team advised on the Worldpay carve-out" beats "I'm interested in M&A".
- Honest about being a student. They don't have to perform expertise.

HARD BANS (these dead-give-away AI patterns must NEVER appear):
- "I hope this email finds you well", "reaching out to", "please find attached", "at your earliest convenience"
- "leverage", "endeavor", "synergy", "cognizant", "furthermore", "accordingly", "aforementioned"
- Em-dashes (—). Use commas, periods, or separate sentences.
- ANY "transition / move / jump / path / journey from X to Y" framing — e.g. "your transition to Jefferies", "making the jump from Brown to IB", "your path from school to MS". These imply you know career history specifics you don't actually know. The banker had a career arc; you don't get to summarize it.
- "made the transition from X to Y", "the analytical side of X work", "highlights exactly the kind of X that draws me"
- Generic praise like "your impressive career", "your fascinating work", "I greatly admire"
- Fake-deep takes about the industry. The student doesn't have those yet.
- Formal sign-offs like "Sincerely", "Regards", "Best regards". Use "Thanks," or "Best,".
- "I'm interested in M&A" or any abstract statement of interest. Replace with one concrete thing they noticed.

STRUCTURE:
- 3-5 short paragraphs OR 80-150 words total. Shorter is better than longer.
- Open with one specific, observable thing — a deal they worked on, a post they wrote, a club you both did, a class they took. Not "I noticed you went to X" — actually engage with the thing.
- One short sentence on who YOU are (school + year + one real detail from your background, not a generic "I study X and am interested in Y").
- One specific ask. "15 min for a quick call next week?" Not "would love to learn from your insights".
- End with EXACTLY two lines: Name (first + last)\\nUniversity 'YY | Major. NO email line at the bottom — Gmail's reply-to header already carries the address. Adding the email below the name reads as cold-template / scam.`;

function systemPromptForType(type: DraftType): string {
  switch (type) {
    case "cold":
      return `${BASE_VOICE}\n\nTASK: Cold outreach. Open with the strongest anchor, but ENGAGE with it specifically — don't just name-drop the school or club. The opener should feel like the student actually noticed something, not like they ran a query. Middle: one short sentence about who they are. Close: a 15-min ask for next week.`;
    case "followup":
      return `${BASE_VOICE}\n\nTASK: Short polite follow-up to a prior unanswered email. Lead with a NEW angle (a specific recent post, deal, or news item about their firm) — never just "checking in" or "bumping this". Don't apologize for following up. Don't sound desperate.`;
    case "reply":
      return `${BASE_VOICE}\n\nTASK: Reply to the banker's incoming message. Match their energy and length. Thank them in one sentence. Address what they asked. If they suggested a call, propose 2-3 specific 15-min windows.`;
    case "thank_you":
      return `${BASE_VOICE}\n\nTASK: Thank-you within 24 hours of a coffee chat. Reference ONE specific thing they actually said (not a generic "thanks for your insights"). Share what you're taking away from it. Ask ONE follow-up question on that same thread. Signal you'll stay in touch — don't promise.`;
  }
}

function buildDraftPrompt(
  input: CorrespondentInput,
  user: UserContext,
  banker: BankerContext,
  anchors: CommonGroundAnchor[],
  scoutedFindings: ScoutedFinding[] = []
): string {
  const parts: string[] = [];
  parts.push(`STUDENT:\n${JSON.stringify(user, null, 2)}\n`);
  parts.push(`BANKER:\n${JSON.stringify(banker, null, 2)}\n`);
  if (anchors.length > 0) {
    parts.push(`COMMON-GROUND ANCHORS (use the highest-confidence one for the opener):\n${JSON.stringify(anchors, null, 2)}\n`);
  }
  if (scoutedFindings.length > 0) {
    // Real-time-scouted findings about this banker (LinkedIn posts, press
    // mentions, podcast appearances). Use AT MOST one in the email, and only
    // if it's relevant — fact-checker will verify against the source URL.
    parts.push(
      `SCOUTED FINDINGS (real-time web search; use AT MOST one as a concrete reference, ONLY if naturally relevant — do NOT force):\n` +
        scoutedFindings
          .slice(0, 4)
          .map(
            (f, i) =>
              `[${i + 1}] type=${f.sourceType} title="${f.title}" url=${f.url}${f.snippet ? ` snippet="${f.snippet.slice(0, 200)}"` : ""}`
          )
          .join("\n") +
        `\n`
    );
  }
  if (input.threadContext?.previousMessageBodyPreview) {
    parts.push(`PRIOR MESSAGE (your previous outreach, paraphrase don't repeat):\n${input.threadContext.previousMessageBodyPreview.slice(0, 600)}\n`);
  }
  if (input.threadContext?.incomingReplyBody) {
    parts.push(`INCOMING REPLY FROM BANKER:\n${input.threadContext.incomingReplyBody.slice(0, 800)}\n`);
  }
  if (input.threadContext?.daysSilent !== undefined) {
    parts.push(`DAYS SINCE LAST CONTACT: ${input.threadContext.daysSilent}\n`);
  }
  if (input.revisionFeedbackHistory && input.revisionFeedbackHistory.length > 0) {
    // Show ALL prior Critic verdicts so the model sees the cumulative
    // critique. Without this, iter 2 forgets iter 0's lesson and re-
    // introduces the same banned framing the Critic already rejected.
    parts.push(
      `CRITIC REVISION HISTORY — every prior attempt got rejected for the reason listed. Address ALL of these in this rewrite, not just the latest:\n` +
        input.revisionFeedbackHistory
          .map((f, i) => `[Iteration ${i} REJECTED]: ${f}`)
          .join("\n") +
        `\n\nThis is your FINAL attempt before the draft escalates. If you reuse a pattern any prior iteration was rejected for, the draft fails.\n`
    );
  }

  parts.push(`Return JSON: {"subject": string, "body": string}`);
  return parts.join("\n");
}
