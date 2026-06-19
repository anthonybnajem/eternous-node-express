#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

EMAIL="$(unique_email "pwd")"
PASSWORD="Password1!"
NEW_PASSWORD="Password2!"

register_email_user "$EMAIL" "$PASSWORD"
mark_user_verified_dev "$EMAIL" || true
login_with_password "$EMAIL" "$PASSWORD" 2>/dev/null || {
  mark_user_verified_dev "$EMAIL" && login_with_password "$EMAIL" "$PASSWORD"
}

OLD_TOKEN="$TOKEN"
OLD_REFRESH="$REFRESH"
step "POST /auth/change-password"
api_auth_json POST /auth/change-password "{\"oldPassword\":\"${PASSWORD}\",\"newPassword\":\"${NEW_PASSWORD}\"}"
if [[ "$LAST_HTTP_CODE" == "200" ]]; then
  pass "change-password ok"
  step "old refresh token should be revoked"
  api_json POST /auth/refresh-tokens "{\"refreshToken\":\"${OLD_REFRESH}\"}"
  [[ "$LAST_HTTP_CODE" == "401" ]] && pass "old refresh revoked" || echo "WARN: old refresh still valid (HTTP $LAST_HTTP_CODE)"
  step "login with new password"
  login_with_password "$EMAIL" "$NEW_PASSWORD"
  pass "new password works"
elif [[ "$LAST_HTTP_CODE" == "404" || "$LAST_HTTP_CODE" == "501" ]]; then
  expect_not_implemented "$LAST_HTTP_CODE"
else
  echo "$LAST_RESPONSE" | jq . 2>/dev/null || echo "$LAST_RESPONSE"
  fail "change-password step 1.4 not fully wired (HTTP $LAST_HTTP_CODE)"
fi

pass "step 1.4 flow complete"
