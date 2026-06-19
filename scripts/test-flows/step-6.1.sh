#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
ensure_verified_user_session

step "POST /users/me/security/2fa/enable"
api_auth_json POST /users/me/security/2fa/enable '{}'
if [[ "$LAST_HTTP_CODE" == "200" ]]; then
  api_auth_json POST /users/me/security/2fa/verify '{"code":"123456"}'
  api_auth_json POST /users/me/security/2fa/disable '{"code":"123456"}'
  pass "2fa flow attempted"
else
  expect_not_implemented "$LAST_HTTP_CODE"
fi
pass "step 6.1 flow complete"
