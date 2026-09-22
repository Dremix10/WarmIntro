# Alma

**[alma.careers](https://www.alma.careers)** — AI-powered outreach for investment banking recruiting.

Alma finds the right bankers to talk to, drafts personalized cold emails on your behalf, and gets smarter every week about who actually replies.

## What it does

- **Sources and verifies contacts** at target banks and groups, enriching each one with real-time context — recent posts, deals, quotes — so outreach never reads like a template.
- **Drafts, reviews, and fact-checks** every email before it sends. A dedicated agent verifies every specific claim against live web evidence before a human ever sees the draft.
- **Learns from outcomes.** A weekly job correlates who actually replied against how the system scored them going in, and recalibrates future targeting based on what worked — not assumptions baked in on day one.

## How it works

A deterministic planner (not an LLM call) dispatches a small team of specialized agents:

- **Researcher** finds and ranks candidates against the user's target list
- **Correspondent** drafts the email
- **Critic** reviews every draft on four axes and can escalate to a human
- **Fact-checker** verifies every specific claim against live web search before the draft goes out
- **Architect** watches for recurring rejection patterns and proposes prompt improvements, closing the loop

Send actions are gated by a graduated trust system — Alma earns more autonomy as its output proves reliable, rather than starting with full send access.

## Stack

Next.js, TypeScript, Claude (Sonnet 4.5), Supabase, Gmail API, Hunter.io.

---

Built with a Brown University collaborator after pitching the idea at their Emergent Conference, following a hackathon win.
