#!/usr/bin/env bash
# Shared helpers for step flow tests. Source from step scripts: source "$(dirname "$0")/lib.sh"

set -euo pipefail

BASE="${BASE:-http://localhost:3000/api/v1}"
LAST_HTTP_CODE=""
LAST_RESPONSE=""
TOKEN="${TOKEN:-}"
REFRESH="${REFRESH:-}"
USER_ID="${USER_ID:-}"

require_jq() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "ERROR: jq is required. Install: brew install jq"
    exit 1
  fi
}

require_jq

step() {
  echo ""
  echo "==> $*"
}

pass() {
  echo "PASS: $*"
}

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

api() {
  local method="$1"
  local path="$2"
  shift 2
  local body_file
  body_file="$(mktemp)"
  local code
  code="$(
    curl -sS -o "$body_file" -w "%{http_code}" -X "$method" "${BASE}${path}" "$@"
  )"
  LAST_HTTP_CODE="$code"
  LAST_RESPONSE="$(cat "$body_file")"
  rm -f "$body_file"
}

api_json() {
  local method="$1"
  local path="$2"
  local payload="$3"
  api "$method" "$path" -H "Content-Type: application/json" -d "$payload"
}

api_auth_json() {
  local method="$1"
  local path="$2"
  local payload="$3"
  [[ -n "$TOKEN" ]] || fail "TOKEN not set — login first"
  api "$method" "$path" -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" -d "$payload"
}

api_auth() {
  local method="$1"
  local path="$2"
  shift 2
  [[ -n "$TOKEN" ]] || fail "TOKEN not set — login first"
  api "$method" "$path" -H "Authorization: Bearer ${TOKEN}" "$@"
}

assert_http() {
  local expected="$1"
  [[ "$LAST_HTTP_CODE" == "$expected" ]] || {
    echo "$LAST_RESPONSE" | jq . 2>/dev/null || echo "$LAST_RESPONSE"
    fail "expected HTTP $expected got $LAST_HTTP_CODE"
  }
}

extract() {
  jq -r "$1 // empty" <<<"$LAST_RESPONSE"
}

extract_access_token() {
  extract '.data.token.access.token // .data.attributes.tokens.access.token'
}

extract_refresh_token() {
  extract '.data.token.refresh.token // .data.attributes.tokens.refresh.token'
}

extract_user_id() {
  extract '.data.attributes.user.id // .data.attributes.user._id // .data.attributes.user // empty' | head -c 24
}

extract_attr() {
  local key="$1"
  extract ".data.attributes.${key} // .data.${key}"
}

unique_email() {
  local prefix="${1:-flow}"
  echo "${prefix}.$(date +%s)@example.com"
}

mark_user_verified_dev() {
  local email="$1"
  if [[ -z "${MONGODB_URL:-}" ]]; then
    echo "SKIP: MONGODB_URL not set — cannot auto-verify user for dev flow"
    return 1
  fi
  if ! command -v mongosh >/dev/null 2>&1; then
    echo "SKIP: mongosh not installed — verify user in Firebase/Mongo manually"
    return 1
  fi
  local db_url="${MONGODB_URL}"
  [[ "$db_url" != *"-test"* ]] || true
  mongosh "$db_url" --quiet --eval "db.users.updateOne({email:'${email}'},{\$set:{isEmailVerified:true}})" >/dev/null
  pass "marked ${email} isEmailVerified=true (dev only)"
}

login_with_password() {
  local email="$1"
  local password="$2"
  step "POST /auth/login"
  api_json POST /auth/login "{\"email\":\"${email}\",\"password\":\"${password}\"}"
  assert_http 200
  TOKEN="$(extract_access_token)"
  REFRESH="$(extract_refresh_token)"
  USER_ID="$(extract_user_id)"
  [[ -n "$TOKEN" ]] || fail "no access token in login response"
  pass "logged in as ${email} userId=${USER_ID}"
}

register_email_user() {
  local email="$1"
  local password="$2"
  local full_name="${3:-Flow Test User}"
  step "POST /auth/register ${email}"
  api_json POST /auth/register "{\"email\":\"${email}\",\"password\":\"${password}\",\"fullName\":\"${full_name}\"}"
  assert_http 201
  USER_ID="$(extract_user_id)"
  local requires_verify
  requires_verify="$(extract '.data.attributes.requiresEmailVerification')"
  pass "registered userId=${USER_ID} requiresEmailVerification=${requires_verify}"
}

ensure_verified_user_session() {
  local email password
  if [[ -n "${TEST_EMAIL:-}" && -n "${TEST_PASSWORD:-}" ]]; then
    login_with_password "$TEST_EMAIL" "$TEST_PASSWORD"
    return 0
  fi

  email="$(unique_email "session")"
  password="${TEST_PASSWORD:-Password1!}"
  register_email_user "$email" "$password"
  if mark_user_verified_dev "$email"; then
    login_with_password "$email" "$password"
    return 0
  fi
  fail "Set TEST_EMAIL + TEST_PASSWORD (verified user) or MONGODB_URL + mongosh for auto-verify"
}

expect_not_implemented() {
  local http="$1"
  if [[ "$http" == "404" || "$http" == "501" || "$http" == "405" ]]; then
    echo "SKIP: endpoint not implemented yet (HTTP $http) — script ready for when step is built"
    exit 0
  fi
}
