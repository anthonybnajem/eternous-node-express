#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
ensure_verified_user_session

for path in /billing/overview /billing/payment-methods "/billing/history?page=1"; do
  step "GET ${path}"
  api_auth GET "$path"
  [[ "$LAST_HTTP_CODE" == "200" ]] && pass "$path ok" || expect_not_implemented "$LAST_HTTP_CODE"
done
pass "step 3.3 flow complete"
