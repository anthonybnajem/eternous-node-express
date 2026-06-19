#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
ensure_verified_user_session

step "GET /users/me/settings"
api_auth GET /users/me/settings
if [[ "$LAST_HTTP_CODE" == "200" ]]; then
  step "PATCH /users/me/settings/notifications"
  api_auth_json PATCH /users/me/settings/notifications '{"birthdayNotificationsEnabled":false}'
  assert_http 200
  pass "notification settings updated"
else
  expect_not_implemented "$LAST_HTTP_CODE"
fi
pass "step 4.2 flow complete"
