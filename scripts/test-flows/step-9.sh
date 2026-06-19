#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
ensure_verified_user_session

step "GET /users/me"
api_auth GET /users/me
if [[ "$LAST_HTTP_CODE" == "200" ]]; then
  credits="$(extract '.data.attributes.creditBalance // .data.attributes.user.creditBalance')"
  pass "profile ok creditBalance=${credits}"
  step "PATCH /users/me"
  api_auth_json PATCH /users/me '{"fullName":"Flow Updated Name"}'
  assert_http 200
else
  expect_not_implemented "$LAST_HTTP_CODE"
fi
pass "step 9 flow complete"
