#!/usr/bin/env bash
# Full product smoke: auth → trees → members → home (run when Phase 2 built)
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for s in 1.3 2.1 2.2 2.4; do
  bash "${DIR}/step-${s}.sh"
done
echo "PASS: full-core smoke complete"
