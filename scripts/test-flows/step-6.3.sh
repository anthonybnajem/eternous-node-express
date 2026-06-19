#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
[[ -n "${ADMIN_TOKEN:-}" ]] || fail "set ADMIN_TOKEN"
TOKEN="$ADMIN_TOKEN"
step "GET admin analytics"
api_auth GET /admin/analytics
[[ "$LAST_HTTP_CODE" == "200" ]] && pass "analytics ok" || expect_not_implemented "$LAST_HTTP_CODE"
pass "step 6.3 flow complete"
