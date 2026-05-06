# AGENTS.md

Context for any AI coding agent (Codex, Claude, Aider, Cursor, etc.) working on this repo. This is the cross-session knowledge that doesn't live in code or git history. **Read this before doing anything.**

## Read these first

1. **`CLAUDE.md`** — full project spec: what Alma is, the 7-agent system, conventions, environment variables, security, current limitations. Codex/other agents: treat it as authoritative even though the filename references Claude.
2. **`docs/DATABASE_SCHEMA.md`** — every table, column, RLS policy, FK chain. Authoritative when you don't have direct Supabase access.
3. **`docs/AGENT_DATA_FLOWS.md`** — what each agent reads/writes for each user-triggered flow.
4. **`docs/QUERIES_COOKBOOK.md`** — copy-paste SQL for common debugging queries.
5. **`BACKEND_HANDOFF.md` / `FRONTEND_HANDOFF.md` / `BACKEND_REQUESTS.md`** — running cross-cofounder handoff docs.
6. **`docs/superpowers/specs/2026-04-23-alma-ib-agent-design.md`** — the agreed architecture for the IB wedge.
7. **`docs/MONITORING.md`** — signal taxonomy + how to recreate the live activity tracker (was a Claude Monitor process; bash poll loop + variants documented).
8. **`docs/OPEN_TASKS.md`** — tasks pending at the Claude → Codex migration (#27, #28, #58, #75, #76).

<!-- BEGIN:nextjs-agent-rules -->
## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## People

- **Dremix (Demetris Chrysostomou)** — Rice '28, owns the entire codebase (frontend + backend). Primary Alma account: `dc118@rice.edu`. Secondary tester account: `dremixc10@gmail.com` (off-domain — needs `NEXT_PUBLIC_OFF_DOMAIN_TESTERS` + `TESTING_ALLOWED_EMAILS` env entries).
- **Evangelos Paraskeva** — Brown '28, cofounder. Account: `evangelos_paraskeva@brown.edu`. When Dremix says **"my partner / my boy / my cofounder"**, default to Evangelos.
- **3rd YC cofounder** — Rice. Account: `ce53@rice.edu`. Has an `auth.users` row from 2026-04-08 but never completed setup.
- **Anya Ramnani** — Rice student, neurodivergent (autistic). Active live tester. Tests on `ar225@rice.edu`. Her personal `anya.ramnani@gmail.com` is **not** in the auth DB — don't claim she's missing if you can't find that address. If Dremix mentions "Anya" or "ar225," same person.

@rice.edu and @brown.edu pass the testing-allowlist gate by default.

## Branch state (2026-05-02)

Evangelos's `gelo-touch` branch is **partially** merged into `main`:

- **Taken:** `/pipeline` transit-map redesign, `/crm` → redirect, NavHeader/PipelineProgress rename.
- **Not taken:** his `today/page.tsx` rewrite — it would have regressed task #74 (sameSchoolPool) and task #72 (RunAlmaProgressBanner).

Evangelos must `git rebase main` onto `gelo-touch` before any further `/today` edits, otherwise his next merge will silently drop those features. Tell him at the next sync.

## Design principles (durable)

These are decisions that should shape every new feature, not bugs of the moment.

### Trust gradient: C → B → A

Every agent capability gets a per-user, per-capability autonomy level:

- **Copilot (C)** — agent drafts, puts in Gmail Drafts, human sends. First 3–5 interactions, learn from edits.
- **Preview-veto (B)** — agent queues an action, sends a preview, executes after ~30 min unless the user says stop/edit.
- **Autopilot (A)** — agent acts without preview; user sees a digest.
- **Manual override** always available — opt-in to A from day 1, lock at any level.

**New capabilities start at C by default.** Auto-graduation is driven by approvals/edits/stops. The reason this matters: ICP is IB recruits terrified of a bad AI-sent email torpedoing their recruiting year from their real .edu address. C → B → A earns the right to send.

### Email is the primary control surface

1. **Email is the product.** Night-before preview, morning digest, reply-to-override (`PREVIEW`, `LATER 10`, `SKIP`, `MORE 3`, or plain English) all happen in Gmail. This is the Alma-voice moment and the retention loop.
2. **Web app is for launch.** `/today`, `/network`, `/pipeline`, `/quests`, etc. are complementary, not replacement.
3. **iOS later.** Not in YC scope. Don't architect early frontend decisions around eventual mobile.

When speccing a new user-facing feature, ask "can this be done through email first?" — if yes, do that. Web UI is augmentation.

### Swappable contact sources

Researcher's `ContactSource` interface must be swappable. Today: LinkedIn (Serper) + Hunter.io enrichment. Tomorrow (if it lands): Rice/Brown alumni-directory access. Don't hard-code any single source.

**Status:** Both Dremix (Rice) and Evangelos (Brown) have formally asked their schools for alumni-directory access. Approval and timeline unknown. Do **not** gate launch or YC narrative on directory access — assume it doesn't land. If a school says yes, slot it in as an additional `ContactSource`, not a rebuild.

### Positive instruction + worked examples (prompt style)

When writing/refactoring an agent system prompt, structure it as: *state what success looks like → give a concrete annotated example → map common failure patterns to their **positive** fixes*. Negative-only "DO NOT" lists pile up over iterations and the model regresses on them.

`BASE_VOICE` in `src/services/agents/correspondent.ts` is the working reference. The Architect agent uses this same rule when generating prompt-fix suggestions.

## Infrastructure

### Cron — Ubuntu VPS (active)

Vercel Hobby caps crons at once/day. Real cron lives on Dremix's Ubuntu VPS:

- Host: `root@157.230.213.52` (hostname `gelo-dremix`)
- Script: `/root/alma/cron.sh` + env: `/root/alma/cron-env`
- Hits `/api/cron/*` endpoints with `Authorization: Bearer $ALMA_CRON_SECRET`
- Logs: `/var/log/alma-cron.log`
- `vercel.json` daily schedule remains as redundant backup (idempotent endpoints)

The Ubuntu box is also available for: long-running workers (if Vercel duration limits bite), webhook receivers (Gmail Pub/Sub if we move off polling), monitoring stack (Grafana/Prometheus), redis for cross-instance rate limiting.

**Revert to Vercel Pro ($20/mo)** would simplify; original schedules live in commit `72bffff`'s `vercel.json`. cron-job.org is a free alternative external scheduler.

### Supabase

Project ref: `pddeejkicavcyhondnim` · Dashboard: https://supabase.com/dashboard/project/pddeejkicavcyhondnim

Schema is in `supabase/migrations/`. Read `docs/DATABASE_SCHEMA.md` for the human view. Migrations are ground truth; doc is the readable layer. **If you propose a schema change, add a migration in `supabase/migrations/0NN_<name>.sql` and update `docs/DATABASE_SCHEMA.md` in the same PR.**

When a Supabase select returns empty unexpectedly, **first verify every column name against `docs/DATABASE_SCHEMA.md`** before assuming RLS or auth. PostgREST silently returns empty rows when a selected column doesn't exist — no loud error. (Concrete bite: `bankers.warmth_score` doesn't exist; `warmth` lives on `connections`.)

Codex local MCP: on 2026-05-04, `~/.codex/config.toml` was configured with a global `supabase` remote MCP server scoped to this project, read-only, and expecting a Supabase PAT from `SUPABASE_ACCESS_TOKEN`:
`https://mcp.supabase.com/mcp?project_ref=pddeejkicavcyhondnim&read_only=true&features=database,docs,debugging,development`.
This Codex build reported hosted OAuth as unsupported, so do not paste PATs into chat; the user should create a Supabase PAT and expose it to Codex as `SUPABASE_ACCESS_TOKEN` if they want the MCP tools active. If tools are not visible in a new Codex session, run `codex mcp list` / `codex mcp get supabase`. Until authenticated, live DB queries can still use the repo env + Supabase service-role client, but treat that as sensitive access and summarize rather than dumping rows.
On 2026-05-05 the PAT was exported into the macOS user environment with `launchctl setenv SUPABASE_ACCESS_TOKEN ...`; a fresh Codex session should be able to load the `supabase` MCP server. If the tool still is not visible, verify with `codex mcp list` and use `npx supabase db query --linked` as a fallback. Because the PAT was once pasted into chat, rotate it after the accelerator/YC crunch.

### Vercel

Web app deploys from `main`. Production domain is `alma.careers`. Welcome / approve / reset / night-preview emails send from `welcome@alma.careers`.

## Working with Dremix

When given a multi-hour window (his exam, his sleep, his calendar block), default to **full-merge-with-validation** — not cherry-picking the safe parts and deferring the rest. His direct quote: *"You have hours to work autonomously to code, review, test, feedback loop, iterate, and repeat."* Conservative recommendations under launch pressure feel like dodging.

- "Simulate e2e" means actually hit endpoints + walk flows logically, not just `tsc --noEmit`.
- "Risky during launch week" is real but he weighs maintainability + perf wins higher than the cushion. He'd rather catch a regression in a focused iteration cycle than ship debt forward.
- Exception: changes that need *his* judgment (UI copy, product decisions, sender-reputation tradeoffs, pricing) still wait for him. Code-correctness changes with deterministic validation paths don't.

## Live state (verify with git log + DB before relying)

This section captures snapshots that decay fast. Treat as starting points, not facts.

### Launch sprint (snapshot 2026-05-06)

- **Goal:** collect public access requests before Dremix's accelerator-founder meeting on 2026-05-06 and the YC application planned late on 2026-05-07.
- **Public posture:** the app is still gated, but the landing page and request list are public. `/demo` is not part of the public launch surface; keep redirects and CTAs focused on `/` and `/request-access`.
- **Launch access gate:** a school-domain auth user is not enough. Public app/API access now requires either an explicit/admin email allowlist entry or an allowed school domain plus a `profiles` row created by admin approval. This blocks direct Supabase signup from becoming app access.
- **Landing message:** public copy now leads with a beginner-friendly, fair-shot frame: Alma helps students get to real coffee chats where curiosity, preparation, and judgment can show. The launch offer is **50 Brown/Rice launch seats**, free for the 2026 recruiting cycle, first come, first served.
- **Rice/Brown only for public copy.** MIT expansion is delayed because the MIT person is not moving forward. Do not describe the team, launch audience, demo audience, or footer as MIT / Rice-Brown-MIT until Dremix explicitly reopens that expansion. Keep internal MIT code paths only where they already support existing school strings.
- **Pitch deck next session:** Dremix plans to start the next session by creating a prompt that generates an accelerator slide deck for Alma. The last slide should include a QR code to `https://alma.careers/request-access` (or the landing page with the access form clearly visible). Use the latest launch metrics from Supabase before writing traction slides.

### Live DB audit (snapshot 2026-05-05)

- Supabase CLI live queries worked with the PAT-backed session; MCP should appear after restart.
- Evangelos (`evangelos_paraskeva@brown.edu`) has not exhausted outreach: 88 eligible emailable bankers in target firms, 63 still available after excluding connections, active drafts, and 30-day skipped cooldown. Last 72h: 8 sent, 22 skipped, 5 open drafts. One `draft_send_failed` was `no_access_token` before Gmail connected; he connected Gmail and sent successfully about a minute later.
- Anya (`ar225@rice.edu`) snapshot: 26 sent, 24 skipped, 2 replies. Bassam Latif at Moelis advanced to `coffee`; Subbu Hariharan reply classified `unknown`. No Anya drafts were created after the 2026-05-04 hedge/formality guardrail change, so the next Anya-style test should verify that fix.

### Email iteration loop (snapshot 2026-05-02)

- **Done:** BASE_VOICE refactored to positive-instruction + worked-examples. Scout backfilled (180 → 239 findings, 0 zero-finding bankers). Iter cap dropped 3 → 2. Last 24h Critic data showed 5/6 drafts approved at 8.25 on iter 0. Specificity moved from chronic 4–6 to stable 7.
- **Open failure mode:** *"Brown + MS anchor is name-drop only — opener doesn't engage with anything specific."* Score lands ~7.0–7.75 — borderline. Engaging-with-the-anchor is the next prompt iteration target.
- **Architect digest** runs daily at 16:00 UTC. Wait for the first real digest before manual prompt edits — that's the signal.
- **Backlog:** "Engage with the anchor" worked example, on-demand Architect run button in `/admin`, Researcher gate on banker data thickness, v2 Architect (versioned prompts, admin-approve, A/B).

### Pending decisions

- **Casual hedges blocked.** Anya consistently skipped drafts containing *"I have no idea"*, *"weird"*, *"if you have it?"*, *"kinda"*, *"sorta"*, *"tbh"*. Shipped 2026-05-04: these now fail deterministic guardrails and `BASE_VOICE` no longer teaches "I have no idea" in the worked example. Verify the next Anya-style skipped draft set has no casual hedge language.

### Tester verification queue

Two tasks track features shipped but not yet user-confirmed: **#58** (10 items from earlier batch) and **#76** (5 items from the 2026-05-02 Anya batch — eye toggle, preset time picker, useEffect+auth deps fix, /pipeline column fix, /today→/pipeline link). Walk Anya's path end-to-end before counting them done. Full task descriptions in `docs/OPEN_TASKS.md`.

## Testing patterns (durable lessons)

Patterns from real testing — let these guide future code, not just past fixes.

- **Don't trust Google search results for LinkedIn profiles.** Serper returns stale/deleted profiles that 404. A broken "Phil C." link killed Antreas's test, he never signed up for pilot. Use a verified people-data API (Proxycurl/Apollo) when freshness matters.
- **PDF upload fails on mobile Safari** unless extraction is server-side (we use `unpdf`).
- **Claude hallucinates shared club memberships** from seed alumni data unless the prompt explicitly forbids invention.
- **Resume parser infers too many industries** — use only the primary for results.
- **Mobile: copy buttons must be big and obvious; CTAs need high contrast** (dark bg, white text, clear value prop).

### Neurodivergent-friendly UX (Anya patterns)

- **Password fields need an eye toggle.** Neurodivergent users frequently retype and need to verify without dot-masking. AuthForm + reset-password both have `showPassword` + eye/eye-off SVG. Apply to any new password input.
- **Default to discrete preset buttons over native pickers** when a choice has 3–5 sensible options. `<input type="time">` was sensory-overloading on `/setup`; replaced with four tap-targets (6/7/8/9 am) + a one-line explanation. Same principle: native dropdowns of 3–5 options → render as buttons.

### useEffect + auth state

When a `useEffect` reads from auth-loaded state, **the dep array must include the auth identity**, not just the derived field. Derived fields (`profile?.name`) are undefined on first render for new accounts and never change as auth resolves — so the effect never re-fires and the page stays in "loading" forever.

Concrete pattern: `}, [profile?.name, session?.user?.id]);` — the auth ID changes when auth resolves, kicking the effect.

Tri-state state machines (`boolean | "unknown"`) trip the same trap from the render side: don't gate UI on `=== false`, gate on `!== true` so "unknown" renders fallback UI instead of blank.

### Voice / draft quality

- **Anya's voice is formal.** When user voice signals "formal" (school, major, role), Correspondent should not lean on casual hedges. Banking emails skew formal even from juniors.
- **Critic's voiceMatch=6–7 is borderline reject** in practice — users override and send watered-down drafts. Either tighten the threshold or strengthen banned-phrases list (see pending decision).
- **Prompt examples can hallucinate student facts.** Evangelos's May 4 test repeatedly produced "APMA 1650" even though his profile/resume did not contain it; the old `BASE_VOICE` example seeded that class number. Do not put specific course numbers, clubs, internships, projects, or summer stories in worked examples unless the prompt also makes them explicit placeholders. Critic now receives known student facts and should reject student-side claims that are not present.

## When you make changes

- **Update `CLAUDE.md`** if you alter conventions, agent count, environment variables, security, or named domain terms.
- **Update this file (`AGENTS.md`)** if you discover or decide something a future agent should know that isn't derivable from code or git history. Examples: a new tester, a branch state ambiguity, a design principle you arrived at, an obscure infra fact.
- **Update `docs/DATABASE_SCHEMA.md`** in the same PR as any migration.
- **Don't update this file** with code patterns, file paths, or architecture that can be derived by reading the current project. Save it for the genuinely cross-session things.
