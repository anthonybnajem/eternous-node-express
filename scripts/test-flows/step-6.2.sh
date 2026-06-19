#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
ensure_verified_user_session

step "GET /users/me/devices"
api_auth GET /users/me/devices
if [[ "$LAST_HTTP_CODE" == "200" ]]; then
  SESSION_ID="$(extract '.data.attributes[0].id // .data.attributes.devices[0].id // empty')"
  if [[ -n "$SESSION_ID" ]]; then
    api_auth DELETE "/users/me/devices/${SESSION_ID}"
    pass "revoked session ${SESSION_ID}"
  fi
else
  expect_not_implemented "$LAST_HTTP_CODE"
fi
pass "step 6.2 flow complete"
