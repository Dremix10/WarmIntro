-- 014_feedback.sql
-- User-submitted feedback / bug reports / praise. Captured via the
-- floating "Feedback" button inside the app. Lightweight + structured
-- so admins can triage without hunting through Telegram messages.

CREATE TABLE IF NOT EXISTS feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('bug','feedback','praise')),
  body        text NOT NULL,
  page        text,
  user_agent  text,
  resolved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_recent ON feedback(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_unresolved ON feedback(created_at DESC) WHERE resolved_at IS NULL;

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own feedback"
  ON feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own feedback"
  ON feedback FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE feedback IS 'User-submitted feedback from the in-app floating button. Three kinds: bug / feedback / praise. Admin reads via service-role client; users read their own.';
