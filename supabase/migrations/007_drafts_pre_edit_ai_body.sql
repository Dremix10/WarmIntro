-- 007_drafts_pre_edit_ai_body.sql
-- Snapshot the AI-authored body the first time a user edits a draft so the
-- flywheel can learn from "AI wrote X, user shipped Y" diffs without losing
-- the AI version. NULL means user never edited.

ALTER TABLE drafts ADD COLUMN IF NOT EXISTS pre_edit_ai_body text;
COMMENT ON COLUMN drafts.pre_edit_ai_body IS 'Snapshot of body the first time a user edits this draft. Lets the flywheel learn from "AI wrote X, user shipped Y" diffs without losing the AI version. NULL means user never edited.';
