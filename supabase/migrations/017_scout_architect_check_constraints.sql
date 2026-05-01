-- 017_scout_architect_check_constraints.sql
-- Align DB CHECK constraints with the agent-roster + Scout sourceType
-- expansions shipped 2026-04-30 → 2026-05-01.
--
-- Symptom that surfaced this: scripts/backfill-scout.ts started failing
-- at the upsert step with `code: 23514` (CHECK violation). Scout had
-- been quietly working around the constraint by writing rows that
-- happened to land in the existing enum, but the gate relaxation
-- (df06b51) introduced two new sourceType values ('linkedin_profile',
-- 'alumni_mention') that the DB didn't allow. Same story with
-- agent_runs — 'scout' has been used in code for weeks, and
-- 'architect' was added tonight as the 7th agent.

ALTER TABLE agent_runs DROP CONSTRAINT IF EXISTS agent_runs_agent_check;
ALTER TABLE agent_runs ADD CONSTRAINT agent_runs_agent_check
  CHECK (agent = ANY (ARRAY['planner','researcher','correspondent','critic','watcher','curator','scout','architect']));

ALTER TABLE banker_findings DROP CONSTRAINT IF EXISTS banker_findings_source_type_check;
ALTER TABLE banker_findings ADD CONSTRAINT banker_findings_source_type_check
  CHECK (source_type = ANY (ARRAY['linkedin_post','linkedin_profile','article','press_mention','podcast','deal_announcement','alumni_mention','other']));
