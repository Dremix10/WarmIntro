-- 009_banker_findings.sql
-- Cache for the Scout agent. Each row is a real-time-scouted artifact about
-- a banker (recent LinkedIn post, press mention, deal announcement, etc.)
-- that the Correspondent can cite as concrete shared-ground.
--
-- Findings expire after 14 days so we re-scout periodically. URL is unique
-- per banker so re-scouting is idempotent.

CREATE TABLE IF NOT EXISTS banker_findings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banker_id      uuid NOT NULL REFERENCES bankers(id) ON DELETE CASCADE,
  url            text NOT NULL,
  title          text NOT NULL,
  snippet        text,
  source_type    text NOT NULL CHECK (source_type IN ('linkedin_post','article','press_mention','podcast','deal_announcement','other')),
  published_hint text,
  scouted_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  UNIQUE (banker_id, url)
);

CREATE INDEX IF NOT EXISTS idx_banker_findings_banker_fresh
  ON banker_findings (banker_id, expires_at DESC);

COMMENT ON TABLE banker_findings IS 'Real-time scouted findings about a banker (recent posts, articles, mentions). Populated by Scout agent before Correspondent runs. Findings expire after 14 days; re-scout on demand.';
