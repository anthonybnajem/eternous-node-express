#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

step "npm run typecheck"
npm run typecheck
pass "typecheck ok"

step "GET /activities without auth → 401"
api GET /activities
[[ "$LAST_HTTP_CODE" == "401" ]] && pass "activities route mounted" || fail "expected 401"

pass "step 1.1 flow complete"
