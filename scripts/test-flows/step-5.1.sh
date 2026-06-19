#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
ensure_verified_user_session

MEMBER_ID="${MEMBER_ID:-}"
[[ -n "$MEMBER_ID" ]] || { bash "$(dirname "$0")/step-2.2.sh" 2>/dev/null || true; }

step "POST /chat"
api_auth_json POST /chat '{"memberId":"'${MEMBER_ID:-000000000000000000000001}'","message":"Hello flow test"}'
if [[ "$LAST_HTTP_CODE" == "200" ]]; then
  text="$(extract '.data.attributes.text')"
  audio="$(extract '.data.attributes.audioUrl')"
  pass "chat text=${text:0:40} audioUrl=${audio:0:40}"
else
  expect_not_implemented "$LAST_HTTP_CODE"
fi
pass "step 5.1 flow complete"
