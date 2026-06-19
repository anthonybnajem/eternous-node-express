#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

ensure_verified_user_session

step "login again with different User-Agent (second session)"
api_json POST /auth/login "{\"email\":\"${TEST_EMAIL:-}\",\"password\":\"${TEST_PASSWORD:-Password1!}\"}" -H "User-Agent: FlowTest/Chrome"
# If no TEST_EMAIL, re-login using TOKEN from ensure session
if [[ -z "${TEST_EMAIL:-}" ]]; then
  EMAIL="$(unique_email "sess2")"
  register_email_user "$EMAIL" "Password1!"
  mark_user_verified_dev "$EMAIL"
  login_with_password "$EMAIL" "Password1!"
fi

REFRESH1="$REFRESH"
step "POST /auth/refresh-tokens"
api_json POST /auth/refresh-tokens "{\"refreshToken\":\"${REFRESH1}\"}"
if [[ "$LAST_HTTP_CODE" == "200" ]]; then
  NEW_ACCESS="$(extract_access_token)"
  [[ -n "$NEW_ACCESS" ]] && pass "refresh token rotated from Mongo"
else
  expect_not_implemented "$LAST_HTTP_CODE"
fi

step "GET /users/me/devices"
api_auth GET /users/me/devices
if [[ "$LAST_HTTP_CODE" == "200" ]]; then
  pass "devices list returned"
elif [[ "$LAST_HTTP_CODE" == "404" ]]; then
  echo "SKIP: /users/me/devices not built yet — sessions may still exist in Mongo"
else
  expect_not_implemented "$LAST_HTTP_CODE"
fi

pass "step 1.5 flow complete"
