-- 008_drafts_critic_override.sql
-- Track when the user explicitly approves a draft despite the latest Critic
-- review verdict being "reject". The /api/drafts/[id]/approve route now
-- requires an override:true flag in this case and writes this column to
-- TRUE; otherwise it returns 409 and the UI surfaces the rejected claims.

ALTER TABLE drafts ADD COLUMN IF NOT EXISTS critic_override boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN drafts.critic_override IS 'TRUE when the user explicitly approved this draft despite the latest critic_review verdict being reject. /api/drafts/[id]/approve sets this when called with override:true.';
