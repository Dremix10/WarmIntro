-- 012_rls_draft_iterations_banker_findings.sql
-- draft_iterations and banker_findings had RLS enabled but NO policies,
-- meaning no rows were ever readable by the user-scoped Supabase client
-- (only the service-role admin client could read them). Result: the
-- /api/today route returned iterations: [] for every draft even when
-- draft_iterations had real rows, so the "Critic history" UI section
-- never rendered.

-- draft_iterations: user can read iterations for drafts they own.
CREATE POLICY "Users read own draft iterations"
  ON draft_iterations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM drafts d
      WHERE d.id = draft_iterations.draft_id AND d.user_id = auth.uid()
    )
  );

-- banker_findings: scouted findings about a banker are not user-private
-- (the banker is a public-record entity in our schema, same as firms or
-- groups). Allow any authenticated user to read.
CREATE POLICY "Authenticated read banker findings"
  ON banker_findings FOR SELECT
  USING (auth.role() = 'authenticated');
