#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
ensure_verified_user_session

step "GET /member-relation-types"
api GET /member-relation-types
TYPE_ID="$(extract '.data.attributes[0].id // .data[0].id')"

step "POST /trees (for voice test)"
api_auth_json POST /trees '{"name":"Voice Flow Tree"}'
[[ "$LAST_HTTP_CODE" == "201" ]] || fail "create tree failed (HTTP $LAST_HTTP_CODE)"
TREE_ID="$(extract '.data.attributes.tree.id // .data.attributes.id')"

step "POST /trees/${TREE_ID}/members"
api_auth_json POST "/trees/${TREE_ID}/members" "{\"name\":\"Grandma\",\"memberRelationTypeId\":\"${TYPE_ID}\",\"biography\":\"Voice test\"}"
[[ "$LAST_HTTP_CODE" == "201" ]] || fail "create member failed (HTTP $LAST_HTTP_CODE)"
MEMBER_ID="$(extract '.data.attributes.member.id // .data.attributes.id')"

step "GET /members/${MEMBER_ID}/voices"
api_auth GET "/members/${MEMBER_ID}/voices"
[[ "$LAST_HTTP_CODE" == "200" ]] && pass "list voices ok" || fail "GET voices failed (HTTP $LAST_HTTP_CODE)"

if [[ -f "${VOICE_SAMPLE_FILE:-}" ]]; then
  step "POST /members/${MEMBER_ID}/voices (upload)"
  api_auth POST "/members/${MEMBER_ID}/voices" -F "file=@${VOICE_SAMPLE_FILE}" -F "name=Version 1.0"
  assert_http 201
  VOICE_ID="$(extract '.data.attributes.voice.id // .data.attributes.id')"
  step "PATCH default voice"
  api_auth_json PATCH "/members/${MEMBER_ID}/voices/${VOICE_ID}/default" '{}'
  assert_http 200
  pass "voice upload + default ok"
else
  echo "SKIP: set VOICE_SAMPLE_FILE=/path/to/sample.wav to test upload"
fi

pass "step 2.3 flow complete"
