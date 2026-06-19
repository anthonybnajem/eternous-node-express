#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
ensure_verified_user_session

if [[ -z "${MEMBER_ID:-}" ]]; then
  step "setup member for chat"
  api GET /member-relation-types
  TYPE_ID="$(extract '.data.attributes[0].id // .data[0].id // .[0].id')"
  api_auth_json POST /trees '{"name":"Chat Flow Tree"}'
  TREE_ID="$(extract '.data.attributes.tree.id // .data.attributes.id')"
  api_auth_json POST "/trees/${TREE_ID}/members" "{\"name\":\"Grandma\",\"memberRelationTypeId\":\"${TYPE_ID}\"}"
  MEMBER_ID="$(extract '.data.attributes.member.id // .data.attributes.id')"
fi

step "POST /chat"
api_auth_json POST /chat "{\"memberId\":\"${MEMBER_ID}\",\"message\":\"Hello flow test\"}"
if [[ "$LAST_HTTP_CODE" == "200" ]]; then
  text="$(extract '.data.attributes.text')"
  audio="$(extract '.data.attributes.audioUrl')"
  pass "chat text=${text:0:40} audioUrl=${audio:0:40}"
else
  expect_not_implemented "$LAST_HTTP_CODE"
fi
pass "step 5.1 flow complete"
