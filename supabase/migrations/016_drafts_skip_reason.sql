-- 016_drafts_skip_reason.sql
-- Adds skip_reason column for the Skip-with-reason → regenerate flow
-- (#47). When a user skips a draft they can optionally explain what
-- was wrong with it. The reason becomes input to the regeneration
-- loop (the next Correspondent attempt sees it as cumulative critic
-- feedback) and a signal for prompt-iteration analysis.

ALTER TABLE drafts ADD COLUMN IF NOT EXISTS skip_reason TEXT;
COMMENT ON COLUMN drafts.skip_reason IS 'Optional user-provided reason explaining why this draft was skipped. Fed back to Correspondent on regenerate. NULL when no reason given or status != skipped.';
