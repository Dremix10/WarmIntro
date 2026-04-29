-- Persist fact-checker results alongside drafts so the UI can show citations
-- under each email body. Each entry: { claim, verdict, evidenceUrls, notes }.

ALTER TABLE drafts ADD COLUMN IF NOT EXISTS fact_check jsonb;
