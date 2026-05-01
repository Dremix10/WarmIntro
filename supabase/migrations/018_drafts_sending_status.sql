-- 018_drafts_sending_status.sql
-- Adds the transient 'sending' status + send_started_at column for the
-- CAS guard in outreach/sendDraft.ts. See docs/refactor-plan.md (D6).
--
-- Forward-only and additive: existing code that ignores 'sending' state
-- continues to work; rows in 'sending' look like "not approved" to
-- callers that filter on status='approved'.
--
-- BEFORE RUNNING THIS MIGRATION, paste this query first to confirm the
-- existing CHECK constraint name. The default in Postgres is
-- "drafts_status_check" (auto-generated from inline `check (...)` in
-- migration 004). If your live DB uses a different name, replace
-- "drafts_status_check" below with whatever the query returns.
--
--   SELECT conname FROM pg_constraint
--   WHERE conrelid = 'drafts'::regclass AND contype = 'c';

-- 1. Status enum: add 'sending'
ALTER TABLE drafts DROP CONSTRAINT IF EXISTS drafts_status_check;
ALTER TABLE drafts ADD CONSTRAINT drafts_status_check
  CHECK (status IN (
    'pending_critic',
    'needs_revision',
    'approved',
    'sending',
    'sent',
    'skipped',
    'edited_by_user',
    'rejected_unresolvable'
  ));

-- 2. Track when the CAS claim happened. The 5-minute stale-claim recovery
--    in sendDraft.ts uses this column to re-claim wedged rows. Without
--    it we couldn't tell "currently sending" from "stuck since yesterday".
ALTER TABLE drafts
  ADD COLUMN IF NOT EXISTS send_started_at TIMESTAMPTZ;

-- 3. Active-draft uniqueness must cover 'sending' too. An in-flight send
--    is still active for the (user, banker, type) tuple — without this
--    clause, a second draft could be approved-and-sent for the same
--    banker while the first is mid-Gmail-call.
DROP INDEX IF EXISTS uq_drafts_active_user_banker_type;

CREATE UNIQUE INDEX uq_drafts_active_user_banker_type
  ON drafts (user_id, banker_id, type)
  WHERE sent_at IS NULL AND status IN (
    'pending_critic',
    'needs_revision',
    'approved',
    'sending',
    'rejected_unresolvable'
  );

-- 4. Helper index for the Sentinel "stuck sending" alert. Lets the
--    alert query find rows in O(log n) instead of full-scanning drafts.
CREATE INDEX IF NOT EXISTS idx_drafts_sending_started
  ON drafts (send_started_at)
  WHERE status = 'sending';
