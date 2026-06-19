#!/usr/bin/env bash
# Run one or all flow test scripts.
# Usage:
#   bash scripts/test-flows/run.sh          # all steps
#   bash scripts/test-flows/run.sh 1.3      # single step
#   npm run test:flow -- 1.3

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STEP="${1:-all}"

run_step() {
  local id="$1"
  local script="${DIR}/step-${id}.sh"
  if [[ ! -f "$script" ]]; then
    echo "WARN: no script for step ${id} (${script})"
    return 0
  fi
  echo ""
  echo "########################################"
  echo "# Flow test step ${id}"
  echo "########################################"
  bash "$script"
}

if [[ "$STEP" == "all" ]]; then
  for script in "${DIR}"/step-*.sh; do
    id="$(basename "$script" .sh | sed 's/^step-//')"
    run_step "$id" || exit 1
  done
else
  run_step "$STEP"
fi

echo ""
echo "All requested flow tests finished."
