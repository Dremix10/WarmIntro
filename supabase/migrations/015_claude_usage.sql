-- 015_claude_usage.sql
-- Per-call Anthropic usage log. One row per askClaude / askClaudeJSON call
-- with the model + token counts + computed cost. Lets us:
--   - show per-user spend in admin
--   - fire a Sentinel alert when any user exceeds a daily $ threshold
--   - audit which agent / model is burning credits

CREATE TABLE IF NOT EXISTS claude_usage (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  agent         text,
  model         text NOT NULL,
  input_tokens  integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cost_usd      numeric(10,6) NOT NULL DEFAULT 0,
  occurred_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claude_usage_user_recent ON claude_usage(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_claude_usage_recent ON claude_usage(occurred_at DESC);

COMMENT ON TABLE claude_usage IS 'Per-call Anthropic API usage log keyed to the user (when known) and agent. Used by admin spend view + Sentinel daily-cost alerts.';
