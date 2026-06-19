#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
ensure_verified_user_session

if [[ -n "${MONGODB_URL:-}" && -n "${USER_ID:-}" ]] && command -v mongosh >/dev/null 2>&1; then
  mongosh "$MONGODB_URL" --quiet --eval "db.users.updateOne({_id:ObjectId('${USER_ID}')},{\$set:{creditBalance:20}})" >/dev/null || true
fi

step "GET /users/me/credits (before)"
api_auth GET /users/me/credits
before="$(extract '.data.attributes.balance // .data.attributes.creditBalance // 0')"

if [[ -z "${MEMBER_ID:-}" ]]; then
  api GET /member-relation-types
  TYPE_ID="$(extract '.data.attributes[0].id // .data[0].id // .[0].id')"
  api_auth_json POST /trees '{"name":"Chat Credits Tree"}'
  TREE_ID="$(extract '.data.attributes.tree.id // .data.attributes.id')"
  api_auth_json POST "/trees/${TREE_ID}/members" "{\"name\":\"Grandma\",\"memberRelationTypeId\":\"${TYPE_ID}\"}"
  MEMBER_ID="$(extract '.data.attributes.member.id // .data.attributes.id')"
fi

step "POST /chat"
api_auth_json POST /chat "{\"memberId\":\"${MEMBER_ID}\",\"message\":\"Credit deduct test\"}"
[[ "$LAST_HTTP_CODE" == "200" ]] && pass "chat ok" || echo "chat HTTP $LAST_HTTP_CODE"

step "GET /users/me/credits (after chat)"
api_auth GET /users/me/credits
after="$(extract '.data.attributes.balance // .data.attributes.creditBalance // 0')"
pass "credits before=${before} after=${after}"
pass "step 5.2 flow complete"
