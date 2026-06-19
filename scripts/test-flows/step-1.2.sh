#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

EMAIL="$(unique_email "settings")"
PASSWORD="Password1!"

register_email_user "$EMAIL" "$PASSWORD"
[[ -n "$USER_ID" ]] || fail "no user id from register"

if [[ -n "${MONGODB_URL:-}" ]] && command -v mongosh >/dev/null 2>&1; then
  step "Mongo: Settings for userId"
  settings_count="$(mongosh "$MONGODB_URL" --quiet --eval "db.settings.countDocuments({userId:ObjectId('${USER_ID}')})")"
  [[ "$settings_count" -ge 1 ]] && pass "Settings doc exists for user" || fail "no Settings doc"
else
  echo "SKIP: MONGODB_URL + mongosh to assert Settings doc"
fi

pass "step 1.2 flow complete"
