#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
ensure_verified_user_session

step "POST /trees"
api_auth_json POST /trees '{"name":"My Family Flow"}'
if [[ "$LAST_HTTP_CODE" == "201" ]]; then
  TREE_ID="$(extract '.data.attributes.tree.id // .data.attributes.tree._id // .data.attributes.id')"
  pass "created tree ${TREE_ID}"
  step "GET /trees"
  api_auth GET /trees
  assert_http 200
  step "GET /trees/${TREE_ID}"
  api_auth GET "/trees/${TREE_ID}"
  assert_http 200
  step "PATCH /trees/${TREE_ID}/default"
  api_auth_json PATCH "/trees/${TREE_ID}/default" '{}'
  assert_http 200
  step "POST /trees/${TREE_ID}/duplicate"
  api_auth_json POST "/trees/${TREE_ID}/duplicate" '{"copyMembers":false}'
  assert_http 201
  DUP_ID="$(extract '.data.attributes.tree.id // .data.attributes.id')"
  step "DELETE /trees/${DUP_ID}"
  api_auth DELETE "/trees/${DUP_ID}"
  assert_http 200
else
  expect_not_implemented "$LAST_HTTP_CODE"
fi
pass "step 2.1 flow complete"
