#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
ensure_verified_user_session

MEMBER_ID="${MEMBER_ID:-}"
if [[ -z "$MEMBER_ID" ]]; then
  bash "$(dirname "$0")/step-2.2.sh" >/dev/null 2>&1 || true
  # Re-run minimal chain or require env
  step "need MEMBER_ID — run step-2.2 first or set MEMBER_ID"
  api_auth GET /trees
  [[ "$LAST_HTTP_CODE" == "200" ]] || expect_not_implemented "$LAST_HTTP_CODE"
  TREE_ID="$(extract '.data.attributes.results[0].id // .data.attributes.trees[0].id // empty')"
  [[ -n "$TREE_ID" ]] || { expect_not_implemented 404; exit 0; }
  api_auth GET "/trees/${TREE_ID}/members"
  MEMBER_ID="$(extract '.data.attributes.results[0].id // .data.attributes.members[0].id')"
fi

step "GET /members/${MEMBER_ID}/voices"
api_auth GET "/members/${MEMBER_ID}/voices"
if [[ "$LAST_HTTP_CODE" != "200" ]]; then expect_not_implemented "$LAST_HTTP_CODE"; fi

if [[ -f "${VOICE_SAMPLE_FILE:-}" ]]; then
  step "POST /members/${MEMBER_ID}/voices (upload)"
  api_auth POST "/members/${MEMBER_ID}/voices" -F "file=@${VOICE_SAMPLE_FILE}" -F "name=Version 1.0"
  assert_http 201
  VOICE_ID="$(extract '.data.attributes.voice.id // .data.attributes.id')"
  step "PATCH default voice"
  api_auth_json PATCH "/members/${MEMBER_ID}/voices/${VOICE_ID}/default" '{}'
  assert_http 200
else
  echo "SKIP: set VOICE_SAMPLE_FILE=/path/to/sample.wav to test upload"
fi
pass "step 2.3 flow complete"
