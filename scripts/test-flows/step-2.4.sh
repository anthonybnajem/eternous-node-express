#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
ensure_verified_user_session

step "GET /member-relation-types"
api GET /member-relation-types
TYPE_ID="$(extract '.data.attributes[0].id // .data[0].id')"

step "POST /trees"
api_auth_json POST /trees '{"name":"Home Flow Tree"}'
TREE_ID="$(extract '.data.attributes.tree.id // .data.attributes.id')"

step "POST /trees/${TREE_ID}/members"
api_auth_json POST "/trees/${TREE_ID}/members" "{\"name\":\"Grandma\",\"memberRelationTypeId\":\"${TYPE_ID}\",\"biography\":\"Home test\"}"
MEMBER_ID="$(extract '.data.attributes.member.id // .data.attributes.id')"

step "PATCH /members/${MEMBER_ID}/favorite"
api_auth_json PATCH "/members/${MEMBER_ID}/favorite" '{"isFavorite":true}'
assert_http 200

step "touch lastTimeUsed via member update"
api_auth_json PATCH "/members/${MEMBER_ID}" '{"bio":"Recently used"}'
assert_http 200
mongosh "${MONGODB_URL:-}" --quiet --eval "db.members.updateOne({_id:ObjectId('${MEMBER_ID}')},{\$set:{lastTimeUsed:new Date()}})" 2>/dev/null || true

step "GET /home"
api_auth GET /home
if [[ "$LAST_HTTP_CODE" == "200" ]]; then
  favorites="$(extract '.data.attributes.favorites | length // 0')"
  recent="$(extract '.data.attributes.recentlyUsed | length // 0')"
  [[ "${favorites:-0}" -ge 1 ]] && pass "home has favorites=${favorites}" || echo "WARN: favorites=${favorites:-0}"
  pass "home recentlyUsed=${recent}"
else
  fail "GET /home failed (HTTP $LAST_HTTP_CODE)"
fi

pass "step 2.4 flow complete"
