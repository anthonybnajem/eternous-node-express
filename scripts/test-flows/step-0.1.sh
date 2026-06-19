#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
step "npm run seed:relation-types"
npm run seed:relation-types
if [[ -n "${MONGODB_URL:-}" ]] && command -v mongosh >/dev/null 2>&1; then
  step "count MemberRelationType in Mongo"
  count="$(mongosh "$MONGODB_URL" --quiet --eval 'db.memberrelationtypes.countDocuments()')"
  [[ "$count" -ge 13 ]] && pass "found ${count} relation types" || fail "expected >= 13 types, got ${count}"
else
  echo "SKIP: set MONGODB_URL + mongosh to assert 13 relation types in DB"
fi
pass "step 0.1 flow complete"
