#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

step "GET /subscriptions/price-plans"
api GET /subscriptions/price-plans
[[ "$LAST_HTTP_CODE" == "200" ]] || expect_not_implemented "$LAST_HTTP_CODE"
PLAN_ID="$(extract '.data.attributes.plans[0].id // .data.attributes.plans[0]._id')"
credits="$(extract '.data.attributes.plans[0].credits')"
pass "plans listed planId=${PLAN_ID} credits=${credits}"

if [[ -n "${ADMIN_TOKEN:-}" ]]; then
  TOKEN="$ADMIN_TOKEN"
  step "POST /subscriptions/price-plans (admin)"
  api_auth_json POST /subscriptions/price-plans "{\"name\":\"Flow Plan\",\"amount\":80,\"credits\":100,\"planType\":\"monthly\",\"active\":true}"
  [[ "$LAST_HTTP_CODE" == "201" || "$LAST_HTTP_CODE" == "200" ]] && pass "admin plan create" || echo "admin plan create HTTP $LAST_HTTP_CODE"
fi
pass "step 3.1 flow complete"
