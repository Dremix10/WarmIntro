-- 010_draft_iterations.sql
-- Preserve every Correspondent draft body across the Critic-loop revise
-- iterations. Without this, when iter 2 overwrites the draft.body, the
-- iter 0 and iter 1 versions are lost — the user can't review what got
-- rejected, and Correspondent can't be shown its own past mistakes.

CREATE TABLE IF NOT EXISTS draft_iterations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id        uuid NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  iteration       integer NOT NULL,
  subject         text,
  body            text NOT NULL,
  guardrail_flags jsonb,
  fact_check      jsonb,
  critic_review_id uuid REFERENCES critic_reviews(id),
  critic_verdict  text,
  critic_feedback text,
  critic_score    numeric,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (draft_id, iteration)
);

CREATE INDEX IF NOT EXISTS idx_draft_iterations_draft ON draft_iterations(draft_id, iteration);

COMMENT ON TABLE draft_iterations IS 'Per-iteration snapshot of draft body + Critic verdict during the Correspondent-Critic revise loop. Iteration 0 = first draft, iteration 1 = first revise, etc. Preserves rejected versions for review and lets Correspondent see its own past attempts.';
