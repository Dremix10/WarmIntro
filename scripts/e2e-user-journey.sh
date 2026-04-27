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
    # Delete profile first (drops dependent rows via cascades)
    curl -s -X DELETE "$PROJECT_URL/rest/v1/profiles?id=eq.$TEST_USER_ID" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" > /dev/null
    # Delete auth user
    curl -s -X DELETE "$PROJECT_URL/auth/v1/admin/users/$TEST_USER_ID" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" > /dev/null
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
SOURCED=$(echo "$PLAN" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('result',{}).get('researcherSourced',0))" 2>/dev/null)
DRAFTED=$(echo "$PLAN" | python3 -c "import json,sys;d=json.load(sys.stdin);r=d.get('result',{});print(r.get('coldDrafted',0)+r.get('approved',0))" 2>/dev/null)
if [ "${SOURCED:-0}" -ge 1 ]; then ok "Researcher sourced $SOURCED candidate(s)"; else err "Researcher" "sourced $SOURCED"; fi
if [ "${DRAFTED:-0}" -ge 1 ]; then ok "Correspondent + Critic produced $DRAFTED draft(s)"; else err "Correspondent/Critic" "drafted $DRAFTED"; fi

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

# ── Summary ─────────────────────────────────────────────────────
echo ""
echo "──────────────────────────────"
echo "  $PASS pass · $FAIL fail · $((PASS + FAIL)) total"
echo ""
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
