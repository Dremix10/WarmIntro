-- Migration: 019_banker_profiles_curator_synthesis
-- Allow 'curator_synthesis' as a valid scrape_source on banker_profiles.
-- The Curator now materialises about_section + recent_posts from Scout
-- findings via LLM synthesis (src/services/curator/synthesize-profile.ts);
-- this is functionally distinct from raw 'serper' or human 'manual' so
-- it gets its own value for traceability.
--
-- Forward-only + additive: extending the allowed set never invalidates
-- existing rows. Safe to apply BEFORE or AFTER deploying the synthesis
-- script — old rows keep their old labels.

ALTER TABLE banker_profiles
  DROP CONSTRAINT IF EXISTS banker_profiles_scrape_source_check;

ALTER TABLE banker_profiles
  ADD CONSTRAINT banker_profiles_scrape_source_check
  CHECK (scrape_source = ANY (ARRAY[
    'proxycurl'::text,
    'serper'::text,
    'manual'::text,
    'curator_synthesis'::text
  ]));
