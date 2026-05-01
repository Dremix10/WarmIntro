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
  const prompt = `Find 2-3 genuine common-ground anchors between a college sophomore and a banker they want to email. Rank by opener-value.

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
      userId: input.userId,
      agent: "correspondent",
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

const BASE_VOICE = `You write cold emails from a college sophomore to an investment banker. Real students who noticed something specific about THIS person. Not "smart networking email" template energy.

# DATA → DRAFT CONTRACT
Every claim in your email must trace to the data block below. The student's profile is real. The banker's name, firm, title, group, university (when listed) are real. SCOUTED FINDINGS with snippets are real, cite them by URL. COMMON-GROUND ANCHORS are real.

Anything else is unwritten. If the data doesn't say it, this email doesn't say it. A short, honest, less-specific email beats an invented-specific one every time.

# WHAT GREAT LOOKS LIKE — a real cold email that scored 9/10

Subject: Brown CS sophomore — quick question on healthcare M&A

Hi Sarah,

Saw your team advised on the Hologic carve-out last spring. I'm a Brown CS sophomore (Applied Math-CS) trying to figure out how the analytical side of M&A actually maps to the coursework I'm doing. APMA 1650 is teaching me probability rigorously, but I have no idea how much that shows up day-to-day for an analyst on a deal like that one.

15 min by phone next week, if you have it?

Thanks,
Demetris
Brown '28 | AMath-CS

Why this works:
- Opener cites a specific deal from the banker's data, not the school
- "APMA 1650" and "Applied Math-CS" are real student details from the resume
- One concrete question — "how much of that shows up day-to-day"
- 80 words. Sign-off is two lines, no email signature.

# WHAT FAILS — and how to fix each pattern

When the model has thin data it tends to fall back to one of these patterns. Each has a fix.

**Pattern A — School name-drop** ("Saw you went to Brown.")
Why it fails: shows you ran a query, not that you noticed anything. Critic flags as "could go to any Brown alum."
Fix: lead with one *specific* thing about YOU instead — a class, a club, a real reason for IB. Make the email about a real student asking a real question, not about the school overlap.

**Pattern B — Career-arc framing** ("Your transition from Brown to MS.")
Why it fails: assumes you know career history you don't. The banker had a career; you don't get to summarize it.
Fix: reference the banker's CURRENT role only. "Saw you're at MS in TMT" — not "your path from Brown to TMT at MS."

**Pattern C — Abstract interest** ("I'm passionate about M&A.")
Why it fails: empty. Says nothing about you.
Fix: replace with one concrete thing. "I keep coming back to TMT after watching Figma's IPO arc" or "the Worldpay carve-out is what got me curious about deal structuring."

**Pattern D — Prestige-credential fabrication** ("Saw you were on the Harvard Corporate Governance Roundtable" / "fellow Wharton PE alum" / "saw you at Milken").
Why it fails: the model invents prestigious-sounding credentials when banker data is thin. Bankers spot them instantly. Critic catches them. NOTHING about a banker exists for this email unless it's in the data.
Fix: if their data is thin, anchor on firm + group + title only — those are always real.

**Pattern E — AI-flavored phrasing** ("I hope this email finds you well", "I would love the opportunity", "at your earliest convenience", "your impressive career", "leverage", "synergy", em-dashes).
Why it fails: instant AI tells. Sophomores don't write like consultants.
Fix: contractions, short sentences, "Thanks," not "Sincerely." If a phrase sounds like a cover letter, it's wrong.

# ANCHOR HIERARCHY — pick the strongest available

1. **Specific verbatim deal/post/about-line** from banker's data → strongest. Open with that.
2. **Same university + a specific student detail** (a class, a club, a city) → second-strongest. Make the school overlap NOTICE something, don't just state it.
3. **Same firm + your specific reason for that firm** → third-strongest. "I keep coming back to PJT for restructuring after reading about [real story]."
4. **Firm + group + title only** → last resort, when data is thin. Lead with what's real about YOU and ask one clear question. A short honest email beats a manufactured-specific one.

# THIN-DATA MODE

When the data block tells you bankerHasProfile=false, bankerHasRecentDeals=false, and there's no specific recent-post or deal anchor in SCOUTED FINDINGS — you are in **thin-data mode**.

In thin-data mode, the anchor hierarchy collapses: tiers 1-3 require something we don't have. Trying to write a "specific to this banker" opener anyway is the failure mode that produces "Saw you went to Brown" name-drops AND fabricated credentials like "Harvard Corporate Governance Roundtable." Both are the model trying to satisfy "be specific" with no real material.

The right move under thin-data:

- **Open with a real student-side specific.** A class number, a project, a concrete IB curiosity from the student's profile or storyOneLiner. The opener is about the STUDENT, not a manufactured banker observation.
- **Treat school/firm overlap as context, never the opener.** "I'm a Brown APMA-CS sophomore writing to a few Brown alums in IB this week" — the Brown match is mentioned, but it's not the hook.
- **Keep it short and honest.** 60-100 words. One concrete ask.

THIN-DATA EXAMPLE — real student-side opener, school as context:

  Hi Asha,

  I'm a Brown APMA-CS sophomore — APMA 1650 was the first class where probabilistic modeling actually clicked for me, and it's making me wonder how much of that rigor shows up in MS M&A analyst work vs. how much is learned on the desk.

  Trying to talk to a few Brown alums in IB this week to figure out where I fit.

  15 min next week, by phone, would mean a lot.

  Thanks,
  Demetris
  Brown '28 | AMath-CS

Why this works under thin-data: every claim traces to the student's profile. The Brown overlap is a context line ("a few Brown alums"), not the anchor. No invented banker specifics. Asha can reply with "yeah here's how that translates" — there's a real question on the table.

# VOICE — what a real sophomore sounds like

- Plain, direct, slightly under-polished. Not consultant-speak.
- Short. They know the banker is busy.
- Casual is fine. "Hey", "Hi", contractions, occasional fragments.
- Specific beats impressive.
- Honest about being a student. They don't have to perform expertise.

# STRUCTURE

- 80-150 words, 3-5 short paragraphs. Shorter is better.
- Opener: ONE specific anchor, engaged with (not just stated).
- Middle: ONE short sentence on who YOU are — school + year + one real detail.
- Close: ONE concrete ask. "15 min next week?" not "would love to learn from your insights."
- Sign-off: "Thanks," or "Best," + first-and-last name + School 'YY | Major on a second line. NO email line — Gmail's reply-to carries it.`;

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

  // Thin-data signal — explicit boolean state so the model sees it as
  // a switch, not just an absence of fields. Architect's first digest
  // (2026-05-01) found 8 of 10 failures had this state and the
  // recurring failure was the model trying to be specific anyway,
  // producing name-drops or fabrications. The thin-data switch routes
  // it to student-side anchors instead. See BASE_VOICE > THIN-DATA MODE.
  //
  // A populated banker.aboutSection (Curator-synthesized from real
  // findings via src/services/curator/synthesize-profile.ts) IS rich
  // enough banker context to support a banker-specific opener. Don't
  // route those to thin-data even if Scout returned no posts/deals.
  const richFindings = scoutedFindings.filter(
    (f) => f.sourceType !== "linkedin_profile" && f.sourceType !== "other"
  );
  const hasAboutSection = Boolean(banker.aboutSection && banker.aboutSection.trim().length >= 60);
  const dataState = {
    hasRichFindings: richFindings.length > 0, // a deal, post, alumni mention, podcast, etc.
    hasOnlyProfileLevelFindings: scoutedFindings.length > 0 && richFindings.length === 0,
    hasAnchors: anchors.length > 0,
    hasAboutSection,
    thinData: !richFindings.length && !anchors.length && !hasAboutSection,
  };
  parts.push(`DATA STATE (use this to decide whether to invoke THIN-DATA MODE from the system prompt):\n${JSON.stringify(dataState, null, 2)}\n`);
  if (dataState.thinData) {
    parts.push(
      `→ Thin-data mode is active. Anchor on a STUDENT-SIDE specific (a class, a real curiosity, a project) per the THIN-DATA EXAMPLE in the system prompt. Treat school/firm overlap as context, not the opener. Do NOT invent banker-specific claims.\n`
    );
  }

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
    // Extract any literal banned phrases the Critic already flagged in prior
    // iterations. Critic feedback like "Banned phrases detected: from our
    // campus to" needs to become an explicit DO-NOT-USE list — the model
    // empirically ignores the prose-form mention but follows a quoted block.
    const flaggedPhrases = new Set<string>();
    for (const fb of input.revisionFeedbackHistory) {
      const match = fb.match(/Banned phrases? (?:detected|found)\s*:\s*(.+?)(?:\n|$)/i);
      if (match) {
        for (const p of match[1].split(",")) {
          const cleaned = p.trim().toLowerCase();
          if (cleaned && cleaned.length < 60) flaggedPhrases.add(cleaned);
        }
      }
    }
    if (flaggedPhrases.size > 0) {
      parts.push(
        `DO NOT USE THESE EXACT PHRASES — they were already rejected on earlier iterations of this draft:\n` +
          Array.from(flaggedPhrases).map((p) => `- "${p}"`).join("\n") +
          `\n`
      );
    }

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
