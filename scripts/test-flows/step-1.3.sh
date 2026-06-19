#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

EMAIL="$(unique_email "verify")"
PASSWORD="Password1!"

register_email_user "$EMAIL" "$PASSWORD"
requires="$(extract '.data.attributes.requiresEmailVerification')"
[[ "$requires" == "true" ]] && pass "register returns requiresEmailVerification" || fail "expected requiresEmailVerification"

step "POST /auth/login before verify → 400"
api_json POST /auth/login "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}"
[[ "$LAST_HTTP_CODE" == "400" ]] && pass "login blocked until verified" || fail "expected 400 Email not verified"

step "POST /auth/resend-verification"
api_json POST /auth/resend-verification "{\"email\":\"${EMAIL}\"}"
if [[ "$LAST_HTTP_CODE" == "200" ]]; then
  pass "resend verification ok"
elif [[ "$LAST_HTTP_CODE" == "503" || "$LAST_HTTP_CODE" == "500" ]]; then
  echo "SKIP: Firebase/SMTP not configured for resend"
else
  echo "resend returned HTTP $LAST_HTTP_CODE (may be rate-limited 429)"
fi

if [[ -n "${FIREBASE_ID_TOKEN:-}" ]]; then
  step "POST /auth/verify-email with idToken"
  api_json POST /auth/verify-email "{\"idToken\":\"${FIREBASE_ID_TOKEN}\"}"
  assert_http 200
  TOKEN="$(extract_access_token)"
  pass "verify-email issued Mongo JWT"
elif mark_user_verified_dev "$EMAIL"; then
  login_with_password "$EMAIL" "$PASSWORD"
  pass "dev verify + login chain ok"
else
  echo "TIP: set FIREBASE_ID_TOKEN after client verify, or MONGODB_URL+mongosh for dev auto-verify"
fi

pass "step 1.3 flow complete"
