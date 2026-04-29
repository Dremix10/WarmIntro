-- 011_unique_active_drafts_include_escalated.sql
-- Tighten the unique-active-draft index to include rejected_unresolvable.
-- Previously the index only covered pending_critic / needs_revision /
-- approved, so an escalated draft (rejected_unresolvable) didn't block a
-- fresh INSERT for the same (user, banker, type). Result: every Run Alma
-- click after a Critic-stuck draft created a NEW duplicate row for the
-- same banker. The Researcher filter is the primary gate; this index is
-- the deterministic last-line-of-defense.

DROP INDEX IF EXISTS uq_drafts_active_user_banker_type;

CREATE UNIQUE INDEX uq_drafts_active_user_banker_type
  ON drafts (user_id, banker_id, type)
  WHERE sent_at IS NULL AND status IN ('pending_critic','needs_revision','approved','rejected_unresolvable');
