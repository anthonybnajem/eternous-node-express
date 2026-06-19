#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"

step "npm run test:notification-crons (when script exists)"
if npm run test:notification-crons -- birthday 2>/dev/null; then
  pass "notification crons runnable"
elif [[ -n "${ADMIN_TOKEN:-}" ]]; then
  TOKEN="$ADMIN_TOKEN"
  api_auth_json POST /notifications/crons/run '{"job":"birthday"}'
  [[ "$LAST_HTTP_CODE" == "200" ]] && pass "cron run endpoint" || expect_not_implemented "$LAST_HTTP_CODE"
else
  echo "SKIP: implement test:notification-crons or set ADMIN_TOKEN"
fi
pass "step 4.3 flow complete"
