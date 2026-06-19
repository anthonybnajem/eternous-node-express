#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

EMAIL="$(unique_email "activity")"
PASSWORD="Password1!"

register_email_user "$EMAIL" "$PASSWORD"
mark_user_verified_dev "$EMAIL" || true

if [[ -z "${TOKEN:-}" ]]; then
  login_with_password "$EMAIL" "$PASSWORD" 2>/dev/null || {
    [[ -n "${TEST_EMAIL:-}" ]] && login_with_password "$TEST_EMAIL" "${TEST_PASSWORD:-Password1!}"
  }
fi

step "GET /activities (own)"
api_auth GET /activities
assert_http 200
pass "activities list returned"

step "GET /activities without token → 401"
api GET /activities
[[ "$LAST_HTTP_CODE" == "401" ]] && pass "unauthorized as expected" || fail "expected 401"

if [[ -n "${ADMIN_TOKEN:-}" ]]; then
  TOKEN="$ADMIN_TOKEN"
  step "GET /activities/admin?type=admin_action"
  api_auth GET "/activities/admin?type=admin_action&limit=5"
  assert_http 200
  pass "admin activities returned"
else
  echo "SKIP: set ADMIN_TOKEN to test admin activity list"
fi

pass "step 0.2 flow complete"
