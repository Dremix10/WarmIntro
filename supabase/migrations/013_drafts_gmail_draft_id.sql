-- 013_drafts_gmail_draft_id.sql
-- Two-way Gmail draft sync. When our pipeline produces an approved draft,
-- we ALSO save it to the user's Gmail Drafts folder so they can preview
-- there. The Gmail draft ID is stored here so:
-- (a) /api/drafts/[id]/send can use Gmail's drafts.send API to atomically
--     convert the draft → sent message (no duplicate, no manual cleanup)
-- (b) The Watcher can detect manual-send-from-Gmail by polling whether
--     the gmail_draft_id still exists in the user's drafts list

ALTER TABLE drafts ADD COLUMN IF NOT EXISTS gmail_draft_id text;
CREATE INDEX IF NOT EXISTS idx_drafts_gmail_draft_id ON drafts(gmail_draft_id) WHERE gmail_draft_id IS NOT NULL;
COMMENT ON COLUMN drafts.gmail_draft_id IS 'Gmail Drafts folder ID for the corresponding draft, populated when Alma saves to the user''s Gmail. Lets us call drafts.send for atomic conversion and lets the Watcher detect when the user manually sent it from Gmail UI.';
