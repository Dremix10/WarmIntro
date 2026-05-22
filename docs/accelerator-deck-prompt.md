# Accelerator pitch deck generator prompt (2026-05-06 meeting)

Use this prompt with your deck-writing model to generate a concise 10-slide accelerator deck for Alma.

## 0) Fill live metrics first (from Supabase)

Before you run the prompt, replace these placeholders with latest numbers from production:

- `{{waitlist_total}}`
- `{{accounts_total}}`
- `{{active_users_total}}` (profiles with target firms selected)
- `{{emails_sent_total}}`
- `{{users_with_replies_total}}`
- `{{coffees_total}}` (connections at stage `coffee`)
- `{{last_7d_sent}}`
- `{{last_7d_replies}}`
- `{{last_7d_new_signups}}`

If any metric is unavailable, use `N/A` and explicitly mark it as pending instrumentation.

---

## 1) Master prompt to generate the deck

```text
You are a top-tier accelerator storytelling partner helping founders win a first meeting.

Task: Create a 10-slide investor-style deck for "Alma" in markdown format.

Audience:
- Accelerator founder meeting on May 6, 2026.
- They need to quickly understand market pain, wedge, product truth, early signal quality, and why this team can execute.

Output format requirements:
1) Exactly 10 slides.
2) For each slide use:
   - "## Slide X — <Title>"
   - "Headline:" (1 sentence)
   - "Key points:" (3-5 bullets, each ≤ 14 words)
   - "Speaker notes:" (90-130 words, natural spoken delivery)
3) Keep claims concrete and falsifiable; avoid generic AI hype language.
4) Do NOT mention MIT in team/school positioning. Position is Rice + Brown.
5) Last slide must be a CTA with QR code destination: https://alma.careers/request-access
6) Include one short line on trust gradient (C→B→A) and why it matters for real .edu sending.
7) Use the provided metrics exactly; do not invent numbers.

Company facts you must use:
- Name: Alma
- One-liner: Email-first AI agent for IB recruiting networking.
- URL: https://alma.careers
- Founders: Demetris Chrysostomou (Rice '28), Evangelos Paraskeva (Brown '28)
- Focus users right now: Rice + Brown students targeting SA2028 IB recruiting.
- Product flow: resume -> target firms -> banker discovery -> personalized draft generation -> critic review -> send from Gmail -> reply detection -> pipeline updates.
- Core differentiation: agentic end-to-end workflow in email control surface, not just a chatbot.
- Safety UX: trust gradient C (copilot drafts), B (preview-veto), A (autopilot), manual override always.

Traction metrics (replace placeholders with the provided values exactly):
- Waitlist signups: {{waitlist_total}}
- Accounts created: {{accounts_total}}
- Activated users: {{active_users_total}}
- Emails sent: {{emails_sent_total}}
- Users with replies: {{users_with_replies_total}}
- Coffees booked/progressed to coffee stage: {{coffees_total}}
- Last 7 days sent: {{last_7d_sent}}
- Last 7 days replies: {{last_7d_replies}}
- Last 7 days new signups: {{last_7d_new_signups}}

Deck arc requirements:
- Slide 1: Vision + one-line wedge.
- Slide 2: Problem (IB networking workload + timing pressure).
- Slide 3: Why now (earlier recruiting, AI capability threshold, behavior shift).
- Slide 4: Product demo-in-words (email-first loop).
- Slide 5: Trust & safety model (C→B→A and user control).
- Slide 6: Early traction (use metrics table style in bullets).
- Slide 7: Learning loop / moat (Critic + Architect prompt iteration, quality improvement).
- Slide 8: GTM (Rice/Brown campus distribution channels + expansion path).
- Slide 9: Team + founder-market fit.
- Slide 10: Ask + QR CTA to request-access page.

Style constraints:
- Tone: calm, sharp, builder-led, no buzzword stuffing.
- Prefer short, concrete nouns and verbs.
- Each headline should feel like a claim, not a topic label.
- Speaker notes should include one sentence of narrative momentum into next slide.

Now produce the full 10-slide deck.
```

---

## 2) Optional tighter variant (if you only have 5 minutes)

```text
Rewrite this deck to 7 slides maximum while preserving the same narrative arc and using identical metrics. Keep the final slide as a QR CTA to https://alma.careers/request-access.
```

## 3) Presenter checklist (final 60 seconds before meeting)

- Confirm every metric was refreshed within the last 2 hours.
- Open QR destination on mobile and verify the form is visible.
- Rehearse slide 5 (trust gradient) in under 20 seconds.
- Rehearse slide 6 (traction) without reading numbers monotonously.
- End with a concrete ask: pilot intros, founder feedback cadence, next meeting date.
