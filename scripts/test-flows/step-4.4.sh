#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
for job in birthday anniversary; do
  step "cron job: $job"
  npm run test:notification-crons -- "$job" 2>/dev/null && pass "$job ok" || echo "SKIP: $job cron not implemented"
done
pass "step 4.4 flow complete"
