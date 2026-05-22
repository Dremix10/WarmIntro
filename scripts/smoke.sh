#!/usr/bin/env bash
# Black-box smoke test for Alma. Hits ~15 critical endpoints and reports pass/fail.
# Usage: bash scripts/smoke.sh [BASE_URL]
#   BASE_URL defaults to https://www.alma.careers
# Exits non-zero on any failure (suitable for CI).

set -uo pipefail

BASE="${1:-https://www.alma.careers}"
UA="alma-smoke/1.0"
PASS=0
FAIL=0
FAILED_TESTS=()

run() {
  local name="$1"
  local result="$2"
  if [ "$result" = "1" ]; then
    PASS=$((PASS + 1))
    printf "  \033[32m✓\033[0m %s\n" "$name"
  else
    FAIL=$((FAIL + 1))
    FAILED_TESTS+=("$name")
    printf "  \033[31m✗\033[0m %s\n" "$name"
  fi
}

http_code() {
  curl -sI -H "User-Agent: $UA" --max-redirs 0 "$1" 2>/dev/null | head -1 | awk '{print $2}' | tr -d '\r'
}

http_redirect() {
  curl -sI -H "User-Agent: $UA" --max-redirs 0 "$1" 2>/dev/null | grep -i "^location:" | awk '{print $2}' | tr -d '\r'
}

http_body() {
  curl -s -H "User-Agent: $UA" "$1" 2>/dev/null
}

echo ""
echo "smoke: $BASE"
echo ""

# 1. Public routes — / is the landing; /request-access + /login are CTAs from it.
#    /demo is intentionally redirected to the static walkthrough because the
#    upload-based demo is not part of the launch surface anymore.
echo "[public routes]"
for p in / /login /request-access /privacy /terms /forgot-password /reset-password; do
  CODE=$(http_code "$BASE$p")
  if [ "$CODE" = "200" ]; then run "$p returns 200" 1; else run "$p returns 200 (got $CODE)" 0; fi
done
COMING_SOON_CODE=$(http_code "$BASE/coming-soon")
COMING_SOON_LOC=$(http_redirect "$BASE/coming-soon")
if [ "$COMING_SOON_CODE" = "307" ] && [ "$COMING_SOON_LOC" = "/request-access" ]; then
  run "/coming-soon redirects to request access" 1
else
  run "/coming-soon redirects to request access (got $COMING_SOON_CODE $COMING_SOON_LOC)" 0
fi
DEMO_CODE=$(http_code "$BASE/demo")
DEMO_LOC=$(http_redirect "$BASE/demo")
if [ "$DEMO_CODE" = "307" ] && [ "$DEMO_LOC" = "/#how" ]; then
  run "/demo redirects to walkthrough" 1
else
  run "/demo redirects to walkthrough (got $DEMO_CODE $DEMO_LOC)" 0
fi

# 2. Gated routes redirect unauth'd users to / (the landing). Was /demo before
#    the landing existed; flipped on 2026-04-30.
echo ""
echo "[gate]"
for p in /today /setup /agents /account /account/privacy; do
  LOC=$(http_redirect "$BASE$p")
  if [ "$LOC" = "/" ]; then run "$p gated -> /" 1; else run "$p gated -> / (got $LOC)" 0; fi
done

# 4. Public APIs respond with valid JSON
echo ""
echo "[public APIs]"

FIRMS=$(http_body "$BASE/api/setup/firms")
COUNT=$(echo "$FIRMS" | python3 -c "import json,sys;d=json.load(sys.stdin);print(len(d.get('firms',[])))" 2>/dev/null)
if [ -n "$COUNT" ] && [ "$COUNT" -ge 20 ]; then run "/api/setup/firms returns >=20 firms ($COUNT)" 1; else run "/api/setup/firms (got $COUNT)" 0; fi

# 5. /api/pilot-signup — accepts unique email
EMAIL="smoke-$(date +%s)-$RANDOM@example.com"
SIGNUP=$(curl -s -X POST -H "User-Agent: $UA" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}" "$BASE/api/pilot-signup" 2>/dev/null)
SUCCESS=$(echo "$SIGNUP" | python3 -c "import json,sys;print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
if [ "$SUCCESS" = "True" ]; then run "/api/pilot-signup accepts new email" 1; else run "/api/pilot-signup failed" 0; fi

# 7. Cron auth: rejects without secret
echo ""
echo "[cron auth]"
UNAUTH_CRON=$(curl -s -X POST "$BASE/api/cron/sentinel" 2>/dev/null)
if echo "$UNAUTH_CRON" | grep -q "unauthorized"; then run "/api/cron/sentinel rejects without secret" 1; else run "/api/cron/sentinel rejection" 0; fi

# 8. Cron with secret returns valid output (only run if env has secret)
if [ -n "${ALMA_CRON_SECRET:-}" ]; then
  AUTH_CRON=$(curl -s -X POST -H "User-Agent: $UA" -H "Authorization: Bearer $ALMA_CRON_SECRET" "$BASE/api/cron/sentinel" --max-time 60 2>/dev/null)
  if echo "$AUTH_CRON" | grep -q "alertsSent"; then run "/api/cron/sentinel runs with secret" 1; else run "/api/cron/sentinel auth failed" 0; fi
fi

# 9. Authenticated routes return 403 without auth (gate caught them with redirect — confirm API also)
echo ""
echo "[auth-gated APIs]"
for p in /api/today /api/agents/runs /api/account/activity /api/parse-resume /api/extract-pdf /api/find-people /api/find-companies /api/demo/bankers; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "User-Agent: $UA" "$BASE$p" 2>/dev/null)
  if [ "$CODE" = "307" ] || [ "$CODE" = "403" ] || [ "$CODE" = "401" ]; then run "$p denies unauth'd ($CODE)" 1; else run "$p denies unauth'd (got $CODE)" 0; fi
done

# Summary
echo ""
echo "──────────────────────────────"
echo "  $PASS pass · $FAIL fail · $((PASS + FAIL)) total"
if [ $FAIL -gt 0 ]; then
  echo ""
  echo "  Failures:"
  for t in "${FAILED_TESTS[@]}"; do echo "    - $t"; done
  echo ""
  exit 1
fi
echo ""
exit 0
