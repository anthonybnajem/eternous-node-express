#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
ensure_verified_user_session

# Ensure at least one favorite member (run 2.2 if needed)
step "GET /home"
api_auth GET /home
if [[ "$LAST_HTTP_CODE" == "200" ]]; then
  favorites="$(extract '.data.attributes.favorites | length')"
  recent="$(extract '.data.attributes.recentlyUsed | length')"
  pass "home favorites=${favorites} recentlyUsed=${recent}"
else
  expect_not_implemented "$LAST_HTTP_CODE"
fi
pass "step 2.4 flow complete"
