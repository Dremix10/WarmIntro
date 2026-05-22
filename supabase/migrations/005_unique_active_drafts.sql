-- Prevent duplicate drafts when run-now and cron tick race against each other,
-- or when the user double-clicks. The Researcher already excludes bankers with
-- active drafts in code, but the DB index is the last line of defense.

CREATE UNIQUE INDEX IF NOT EXISTS uq_drafts_active_user_banker_type
  ON drafts (user_id, banker_id, type)
  WHERE sent_at IS NULL AND status IN ('pending_critic','needs_revision','approved');
