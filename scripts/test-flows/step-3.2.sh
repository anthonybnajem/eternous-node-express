#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
ensure_verified_user_session

step "GET /users/me/credits"
api_auth GET /users/me/credits
if [[ "$LAST_HTTP_CODE" == "200" ]]; then
  balance="$(extract '.data.attributes.balance // .data.attributes.creditBalance')"
  pass "credit balance=${balance}"
  step "GET /users/me/credits/history"
  api_auth GET "/users/me/credits/history?page=1&limit=5"
  assert_http 200
else
  expect_not_implemented "$LAST_HTTP_CODE"
fi

if [[ -n "${ADMIN_TOKEN:-}" && -n "$USER_ID" ]]; then
  TOKEN="$ADMIN_TOKEN"
  step "POST /users/${USER_ID}/credits (admin adjust)"
  api_auth_json POST "/users/${USER_ID}/credits" '{"amount":10,"reason":"flow test"}'
  [[ "$LAST_HTTP_CODE" == "200" ]] && pass "admin credit adjust" || echo "admin adjust HTTP $LAST_HTTP_CODE"
fi
pass "step 3.2 flow complete"
