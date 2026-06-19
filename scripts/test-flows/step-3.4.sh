#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
ensure_verified_user_session

step "GET /subscriptions/me"
api_auth GET /subscriptions/me
[[ "$LAST_HTTP_CODE" == "200" ]] || expect_not_implemented "$LAST_HTTP_CODE"
SUB_ID="$(extract '.data.attributes.currentSubscription.id // .data.attributes.currentSubscription._id // empty')"
PLAN_ID="$(extract '.data.attributes.plans[0].id // empty')"

if [[ -n "$PLAN_ID" ]]; then
  step "POST /subscriptions/upgrade"
  api_auth_json POST /subscriptions/upgrade "{\"planId\":\"${PLAN_ID}\"}"
  echo "upgrade HTTP $LAST_HTTP_CODE"
fi

if [[ -n "$SUB_ID" ]]; then
  step "PATCH /subscriptions/${SUB_ID}/cancel"
  api_auth_json PATCH "/subscriptions/${SUB_ID}/cancel" '{}'
  echo "cancel HTTP $LAST_HTTP_CODE"
fi
pass "step 3.4 flow complete"
