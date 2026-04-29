#!/usr/bin/env bash
# White-box end-to-end user journey for Alma.
#   sign-up new test user -> save profile -> save trust -> run planner ->
#   verify drafts created -> clean up.
#
# Usage: BASE=https://www.alma.careers bash scripts/e2e-user-journey.sh
# Reads ANON key + service-role key + cron secret from .env.local.

set -uo pipefail

BASE="${BASE:-https://www.alma.careers}"
UA="alma-e2e/1.0"

# Load env
if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi
if [ -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY must be set"
  exit 1
fi

PROJECT_URL="https://pddeejkicavcyhondnim.supabase.co"
TEST_EMAIL="e2e-$(date +%s)-$RANDOM@brown.edu"
TEST_PASS="E2eTest!$(date +%s)"
PASS=0
FAIL=0

step() { printf "\n→ \033[34m%s\033[0m\n" "$1"; }
ok() { PASS=$((PASS + 1)); printf "  \033[32m✓\033[0m %s\n" "$1"; }
err() { FAIL=$((FAIL + 1)); printf "  \033[31m✗\033[0m %s — %s\n" "$1" "$2"; }

cleanup() {
  if [ -n "${TEST_USER_ID:-}" ]; then
    step "Cleanup: deleting test user $TEST_EMAIL"
    AUTH_HDR=("-H" "apikey: $SUPABASE_SERVICE_ROLE_KEY" "-H" "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")
    # Drop dependent rows explicitly — auth.users → signals/agent_runs/etc isn't
    # always cascading, and test cancellations can otherwise leave orphans
    # that trigger noisy "profile_not_found" alerts in the planner.
    for tbl in signals agent_runs drafts critic_reviews connections trust_levels profiles; do
      curl -s -X DELETE "$PROJECT_URL/rest/v1/$tbl?user_id=eq.$TEST_USER_ID" "${AUTH_HDR[@]}" > /dev/null
    done
    # profiles uses .id not .user_id
    curl -s -X DELETE "$PROJECT_URL/rest/v1/profiles?id=eq.$TEST_USER_ID" "${AUTH_HDR[@]}" > /dev/null
    # Delete auth user last
    curl -s -X DELETE "$PROJECT_URL/auth/v1/admin/users/$TEST_USER_ID" "${AUTH_HDR[@]}" > /dev/null
    echo "  cleaned"
  fi
}
trap cleanup EXIT

# ── 1. Sign up ───────────────────────────────────────────────
step "1. Sign up a fresh @brown.edu test user"
SIGNUP=$(curl -s -X POST "$PROJECT_URL/auth/v1/signup" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}")

TEST_USER_ID=$(echo "$SIGNUP" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('user',{}).get('id') or d.get('id') or '')" 2>/dev/null)
ACCESS=$(echo "$SIGNUP" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('access_token') or '')" 2>/dev/null)

if [ -z "$TEST_USER_ID" ]; then err "signup" "$(echo "$SIGNUP" | head -c 200)"; exit 1; fi
ok "signup created user $TEST_USER_ID"

# Need email_confirm true to sign in immediately. Use admin API.
curl -s -X PUT "$PROJECT_URL/auth/v1/admin/users/$TEST_USER_ID" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" -d '{"email_confirm":true}' > /dev/null

# Re-signin to get a clean access token
SIGNIN=$(curl -s -X POST "$PROJECT_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}")
ACCESS=$(echo "$SIGNIN" | python3 -c "import json,sys;print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
if [ -z "$ACCESS" ]; then err "signin" "no token"; exit 1; fi
ok "signin returns access token"

# Add to whitelist temporarily for gate
EMAIL_LOWER=$(echo "$TEST_EMAIL" | tr '[:upper:]' '[:lower:]')
WHITELIST_ENV=$(grep "^TESTING_ALLOWED_EMAILS=" .env.local | cut -d= -f2)

# ── 2. Save profile (the upsert) ─────────────────────────────
step "2. POST /api/setup/profile (upsert path that was buggy before)"
PROF=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/setup/profile" \
  -H "User-Agent: $UA" -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" \
  -d '{"name":"E2E Tester","major":"Economics","graduationYear":2028,"university":"Brown University","targetFirms":["morgan-stanley","evercore","centerview"],"targetGroups":["tmt","m-and-a"],"storyOneLiner":"E2E test run."}')
CODE=$(echo "$PROF" | tail -1)
BODY=$(echo "$PROF" | head -n -1)
if [ "$CODE" = "200" ]; then ok "profile upsert returns 200"; else err "profile upsert" "$CODE $BODY"; fi

# ── 3. Save trust ─────────────────────────────────────────────
step "3. POST /api/setup/trust"
TRUST=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/setup/trust" \
  -H "User-Agent: $UA" -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" \
  -d '{"sendNewEmail":"C","sendFollowup":"C","sendReply":"C","preferredSendTime":"07:00"}')
CODE=$(echo "$TRUST" | tail -1)
if [ "$CODE" = "200" ]; then ok "trust upsert returns 200"; else err "trust upsert" "$CODE"; fi

# ── 4. /api/today should report state correctly ──────────────
step "4. GET /api/today before Planner runs"
TODAY=$(curl -s -X GET "$BASE/api/today" -H "User-Agent: $UA" -H "Authorization: Bearer $ACCESS")
NEEDS_SETUP=$(echo "$TODAY" | python3 -c "import json,sys;print(json.load(sys.stdin).get('needsSetup',True))" 2>/dev/null)
if [ "$NEEDS_SETUP" = "False" ]; then ok "/api/today says needsSetup=false (profile complete)"; else err "/api/today needsSetup wrong" "got $NEEDS_SETUP"; fi

# ── 5. Run Planner ──────────────────────────────────────────────
step "5. POST /api/planner/run-now (cap=1, ~50s)"
PLAN=$(curl -s -X POST "$BASE/api/planner/run-now" \
  -H "User-Agent: $UA" -H "Authorization: Bearer $ACCESS" --max-time 90)
echo "  raw planner response: $(echo "$PLAN" | head -c 400)"
SOURCED=$(echo "$PLAN" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('result',{}).get('researcherSourced',0))" 2>/dev/null)
DRAFTED=$(echo "$PLAN" | python3 -c "import json,sys;d=json.load(sys.stdin);r=d.get('result',{});print(r.get('coldDrafted',0)+r.get('approved',0))" 2>/dev/null)
QUEUE_FULL=$(echo "$PLAN" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('result',{}).get('queueFull',False))" 2>/dev/null)
if [ "${SOURCED:-0}" -ge 1 ]; then ok "Researcher sourced $SOURCED candidate(s)"; else err "Researcher" "sourced $SOURCED (queueFull=$QUEUE_FULL)"; fi
# Counts any draft row, not just approved. Critic-rejected drafts are
# expected on tightened fact-check rules — what matters is the agent
# pipeline ran end-to-end and persisted SOMETHING.
ANY_DRAFT_COUNT=$(curl -s -G "$PROJECT_URL/rest/v1/drafts" \
  --data-urlencode "user_id=eq.$TEST_USER_ID" \
  --data-urlencode "select=id" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  | python3 -c "import json,sys;print(len(json.load(sys.stdin)))" 2>/dev/null)
if [ "${ANY_DRAFT_COUNT:-0}" -ge 1 ]; then ok "Correspondent + Critic produced $ANY_DRAFT_COUNT draft row(s) (any status)"; else err "Correspondent/Critic" "drafted $ANY_DRAFT_COUNT (no draft row created)"; fi

# ── 6. /api/today AFTER Planner ─────────────────────────────────
step "6. GET /api/today after Planner — should show drafts"
TODAY_AFTER=$(curl -s -X GET "$BASE/api/today" -H "User-Agent: $UA" -H "Authorization: Bearer $ACCESS")
DRAFT_COUNT=$(echo "$TODAY_AFTER" | python3 -c "import json,sys;d=json.load(sys.stdin);print(len(d.get('drafts',[])))" 2>/dev/null)
if [ "${DRAFT_COUNT:-0}" -ge 1 ]; then ok "/api/today shows $DRAFT_COUNT draft(s) in queue"; else err "/api/today drafts" "got $DRAFT_COUNT"; fi

# ── 7. /api/agents/runs ─────────────────────────────────────────
step "7. GET /api/agents/runs — verify agent activity logged"
AGENTS=$(curl -s -X GET "$BASE/api/agents/runs?limit=20" -H "User-Agent: $UA" -H "Authorization: Bearer $ACCESS")
RUN_COUNT=$(echo "$AGENTS" | python3 -c "import json,sys;d=json.load(sys.stdin);print(len(d.get('runs',[])))" 2>/dev/null)
if [ "${RUN_COUNT:-0}" -ge 3 ]; then ok "/api/agents/runs has $RUN_COUNT logged runs"; else err "/api/agents/runs" "$RUN_COUNT runs"; fi

# ── 8. Drafts contain a fact_check field ────────────────────────
# Cold drafts go through fact-checker now. fact_check column should be
# populated (jsonb { ok, checks: [] }). Catches a regression where the
# Critic wiring drops fact-check.
step "8. Drafts have fact_check populated (column exists + Critic wrote it)"
FACT_CHECK_COUNT=$(curl -s -G "$PROJECT_URL/rest/v1/drafts" \
  --data-urlencode "user_id=eq.$TEST_USER_ID" \
  --data-urlencode "fact_check=not.is.null" \
  --data-urlencode "select=id" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  | python3 -c "import json,sys;print(len(json.load(sys.stdin)))" 2>/dev/null)
if [ "${FACT_CHECK_COUNT:-0}" -ge 1 ]; then ok "$FACT_CHECK_COUNT draft(s) carry fact_check JSON"; else err "fact_check populated" "0 drafts have fact_check"; fi

# ── 9. mark_sent endpoint creates a connection (#1 regression: was missing) ──
# Critic now rejects any draft with unverifiable specifics — fact-checker
# is tight by design. For the e2e, we user-override approve any draft
# (mirrors what a real user does on /today via the "Looks good" button)
# so the rest of the send pipeline gets exercised.
step "9. POST /api/drafts/[id]/mark_sent → creates connections row"
ANY_DRAFT_ID=$(curl -s -G "$PROJECT_URL/rest/v1/drafts" \
  --data-urlencode "user_id=eq.$TEST_USER_ID" \
  --data-urlencode "sent_at=is.null" \
  --data-urlencode "select=id" \
  --data-urlencode "limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print(d[0]['id'] if d else '')" 2>/dev/null)
if [ -n "$ANY_DRAFT_ID" ]; then
  # User-override approve. Pass override:true so the Critic-rejected gate lets
  # us through — same path the UI uses on rejected cards.
  curl -s -X POST "$BASE/api/drafts/$ANY_DRAFT_ID/approve" \
    -H "User-Agent: $UA" -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" \
    -d '{"override":true}' > /dev/null
  curl -s -X POST "$BASE/api/drafts/$ANY_DRAFT_ID/mark_sent" \
    -H "User-Agent: $UA" -H "Authorization: Bearer $ACCESS" > /dev/null
  CONN_COUNT=$(curl -s -G "$PROJECT_URL/rest/v1/connections" \
    --data-urlencode "user_id=eq.$TEST_USER_ID" \
    --data-urlencode "stage=eq.sent" \
    --data-urlencode "select=id" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    | python3 -c "import json,sys;print(len(json.load(sys.stdin)))" 2>/dev/null)
  if [ "${CONN_COUNT:-0}" -ge 1 ]; then ok "mark_sent created a connection row (stage=sent)"; else err "mark_sent → connection" "0 connections after mark_sent"; fi
else
  err "mark_sent setup" "no draft to mark"
fi

# ── 10. Stage-advance endpoint moves a connection ───────────────
step "10. POST /api/connections/[id]/stage advances a connection"
CONN_ID=$(curl -s -G "$PROJECT_URL/rest/v1/connections" \
  --data-urlencode "user_id=eq.$TEST_USER_ID" \
  --data-urlencode "select=id" \
  --data-urlencode "limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print(d[0]['id'] if d else '')" 2>/dev/null)
if [ -n "$CONN_ID" ]; then
  STAGE_RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/connections/$CONN_ID/stage" \
    -H "User-Agent: $UA" -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" \
    -d '{"stage":"replied"}')
  STAGE_CODE=$(echo "$STAGE_RES" | tail -1)
  if [ "$STAGE_CODE" = "200" ]; then ok "/api/connections/[id]/stage returns 200"; else err "stage advance" "$STAGE_CODE"; fi
else
  err "stage advance setup" "no connection found"
fi

# ── 11. Custom reset-password endpoint accepts requests ─────────
# Doesn't actually verify email delivery (Resend is async + we don't
# have an inbox here) — but verifies the endpoint isn't 500-ing,
# which is the most likely regression mode.
step "11. POST /api/auth/reset-password returns 200"
RESET_RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/auth/reset-password" \
  -H "User-Agent: $UA" -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\"}")
RESET_CODE=$(echo "$RESET_RES" | tail -1)
if [ "$RESET_CODE" = "200" ]; then ok "/api/auth/reset-password returns 200"; else err "reset-password" "$RESET_CODE"; fi

# ── Summary ─────────────────────────────────────────────────────
echo ""
echo "──────────────────────────────"
echo "  $PASS pass · $FAIL fail · $((PASS + FAIL)) total"
echo ""
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
