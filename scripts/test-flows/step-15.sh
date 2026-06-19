#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
ensure_verified_user_session
bash "$(dirname "$0")/step-2.1.sh" 2>/dev/null || true
step "GET /archive/storage (quota check)"
api_auth GET /archive/storage
[[ "$LAST_HTTP_CODE" == "200" ]] && pass "storage usage returned" || expect_not_implemented "$LAST_HTTP_CODE"
pass "step 15 flow complete"
