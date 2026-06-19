#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
ensure_verified_user_session

for path in /archive/storage /archive/recent-sessions "/archive/recordings?search=test"; do
  step "GET ${path}"
  api_auth GET "$path"
  [[ "$LAST_HTTP_CODE" == "200" ]] && pass "$path ok" || expect_not_implemented "$LAST_HTTP_CODE"
done
pass "step 5.3 flow complete"
