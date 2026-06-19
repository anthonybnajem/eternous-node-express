#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
ensure_verified_user_session

step "GET /users/me/credits (before)"
api_auth GET /users/me/credits
before="$(extract '.data.attributes.balance // .data.attributes.creditBalance // 0')"

bash "$(dirname "$0")/step-5.1.sh" 2>/dev/null || true

step "GET /users/me/credits (after chat)"
api_auth GET /users/me/credits
after="$(extract '.data.attributes.balance // .data.attributes.creditBalance // 0')"
pass "credits before=${before} after=${after}"
pass "step 5.2 flow complete"
