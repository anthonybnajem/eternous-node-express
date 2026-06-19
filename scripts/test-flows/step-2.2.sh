#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
ensure_verified_user_session

step "GET /member-relation-types (public)"
api GET /member-relation-types
if [[ "$LAST_HTTP_CODE" != "200" ]]; then expect_not_implemented "$LAST_HTTP_CODE"; fi
TYPE_ID="$(extract '.data.attributes[0].id // .data[0].id // .[0].id')"

step "POST /trees (for members)"
api_auth_json POST /trees '{"name":"Members Flow Tree"}'
[[ "$LAST_HTTP_CODE" == "201" ]] || expect_not_implemented "$LAST_HTTP_CODE"
TREE_ID="$(extract '.data.attributes.tree.id // .data.attributes.id')"

step "POST /trees/${TREE_ID}/members"
api_auth_json POST "/trees/${TREE_ID}/members" "{\"name\":\"Grandma\",\"memberRelationTypeId\":\"${TYPE_ID}\",\"biography\":\"Test\"}"
if [[ "$LAST_HTTP_CODE" == "201" ]]; then
  MEMBER_ID="$(extract '.data.attributes.member.id // .data.attributes.id')"
  step "GET /members/${MEMBER_ID}"
  api_auth GET "/members/${MEMBER_ID}"
  assert_http 200
  step "PATCH /members/${MEMBER_ID}/favorite"
  api_auth_json PATCH "/members/${MEMBER_ID}/favorite" '{"isFavorite":true}'
  assert_http 200
  pass "member CRUD chain ok memberId=${MEMBER_ID}"
else
  expect_not_implemented "$LAST_HTTP_CODE"
fi
pass "step 2.2 flow complete"
