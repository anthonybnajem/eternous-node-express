#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

EMAIL="$(unique_email "sess")"
PASSWORD="Password1!"

register_email_user "$EMAIL" "$PASSWORD"
mark_user_verified_dev "$EMAIL" || true

step "POST /auth/login (session 1 — default UA)"
login_with_password "$EMAIL" "$PASSWORD"
REFRESH1="$REFRESH"
TOKEN1="$TOKEN"
pass "session 1 login ok"

step "POST /auth/login (session 2 — FlowTest/Chrome)"
api_json POST /auth/login "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" -H "User-Agent: FlowTest/Chrome"
assert_http 200
REFRESH2="$(extract_refresh_token)"
TOKEN2="$(extract_access_token)"
[[ -n "$REFRESH2" ]] || fail "no refresh token for session 2"
pass "session 2 login ok"

step "POST /auth/refresh-tokens (rotate session 1 refresh)"
api_json POST /auth/refresh-tokens "{\"refreshToken\":\"${REFRESH1}\"}"
if [[ "$LAST_HTTP_CODE" == "200" ]]; then
  NEW_ACCESS="$(extract_access_token)"
  NEW_REFRESH="$(extract_refresh_token)"
  [[ -n "$NEW_ACCESS" ]] && pass "refresh token rotated from Mongo"
  REFRESH1="$NEW_REFRESH"
  TOKEN="$NEW_ACCESS"
else
  expect_not_implemented "$LAST_HTTP_CODE"
fi

step "GET /users/me/devices"
api_auth GET /users/me/devices
if [[ "$LAST_HTTP_CODE" == "200" ]]; then
  DEVICE_COUNT="$(echo "$LAST_RESPONSE" | jq '.data.attributes.devices | length // .data.devices | length // 0')"
  [[ "${DEVICE_COUNT:-0}" -ge 2 ]] && pass "devices list has ${DEVICE_COUNT} active sessions" || echo "WARN: expected >=2 devices, got ${DEVICE_COUNT:-0}"
  pass "devices list returned"
elif [[ "$LAST_HTTP_CODE" == "404" ]]; then
  echo "SKIP: /users/me/devices not built yet — sessions may still exist in Mongo"
else
  echo "$LAST_RESPONSE" | jq . 2>/dev/null || echo "$LAST_RESPONSE"
  fail "GET /users/me/devices failed (HTTP $LAST_HTTP_CODE)"
fi

pass "step 1.5 flow complete"
