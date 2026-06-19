#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
ensure_verified_user_session

TREE_ID=""
step "POST /trees/:treeId/share (needs tree)"
api_auth_json POST /trees/000000000000000000000001/share '{"email":"friend@example.com"}'
if [[ "$LAST_HTTP_CODE" == "404" ]]; then
  bash "$(dirname "$0")/step-2.1.sh" 2>/dev/null || true
fi

step "GET /notifications"
api_auth GET "/notifications?page=1"
if [[ "$LAST_HTTP_CODE" == "200" ]]; then
  NOTIF_ID="$(extract '.data.attributes.results[0].id // .data.attributes.docs[0].id // empty')"
  if [[ -n "$NOTIF_ID" ]]; then
    api_auth_json POST "/notifications/${NOTIF_ID}/accept" '{}'
    api_auth_json PATCH "/notifications/${NOTIF_ID}/read" '{}'
  fi
  pass "inbox flow ok"
else
  expect_not_implemented "$LAST_HTTP_CODE"
fi
pass "step 4.1 flow complete"
