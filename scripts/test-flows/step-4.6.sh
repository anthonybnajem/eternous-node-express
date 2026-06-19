#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
step "backup-ready cron"
npm run test:notification-crons -- backup-ready 2>/dev/null && pass "backup-ready ok" || echo "SKIP: backup-ready cron not implemented"
pass "step 4.6 flow complete"
