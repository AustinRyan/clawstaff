#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# ClawStaff — Agent Health Check
#
# Checks if a specific agent's Gateway route is responding.
# Queries the Gateway's WebSocket API for agent status.
#
# Usage:
#   ./health-check.sh <agent_name>
#   ./health-check.sh              # check ALL agents
#
# Exit codes:
#   0 — agent is healthy
#   1 — agent is unhealthy or not found
# ─────────────────────────────────────────────────────────────

BASE_DIR="/opt/clawstaff"
AGENTS_DIR="${BASE_DIR}/agents"
GATEWAY_HOST="127.0.0.1"
GATEWAY_PORT="18789"
GATEWAY_API="http://${GATEWAY_HOST}:${GATEWAY_PORT}"

AGENT_NAME="${1:-}"

# ─── Colors ─────────────────────────────────────────────────

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

# ─── Check a single agent ──────────────────────────────────

check_agent() {
  local name="$1"
  local agent_dir="${AGENTS_DIR}/${name}"
  local status="UNKNOWN"
  local checks_passed=0
  local checks_total=4

  # Check 1: Agent directory exists
  if [[ -d "${agent_dir}" ]]; then
    ((checks_passed++))
  else
    printf "  ${RED}FAIL${NC}  %-15s  Directory missing: %s\n" "${name}" "${agent_dir}"
    return 1
  fi

  # Check 2: SOUL.md exists (agent is properly configured)
  if [[ -f "${agent_dir}/SOUL.md" ]]; then
    ((checks_passed++))
  else
    printf "  ${RED}FAIL${NC}  %-15s  SOUL.md missing\n" "${name}"
    return 1
  fi

  # Check 3: openclaw.json exists
  if [[ -f "${agent_dir}/openclaw.json" ]]; then
    ((checks_passed++))
  else
    printf "  ${RED}FAIL${NC}  %-15s  openclaw.json missing\n" "${name}"
    return 1
  fi

  # Check 4: Gateway route is responding
  # Query the Gateway's HTTP status endpoint for this agent.
  # The Gateway exposes agent health at /api/agents/{name}/status
  if curl -sf --max-time 5 "${GATEWAY_API}/api/agents/${name}/status" > /dev/null 2>&1; then
    ((checks_passed++))
    status="HEALTHY"
  else
    # Gateway might not be running or the route isn't registered yet.
    # Still pass if the files are in place — the agent is provisioned but
    # the Gateway may need a restart.
    status="DEGRADED"
  fi

  # Report
  if [[ "${status}" == "HEALTHY" ]]; then
    printf "  ${GREEN}OK${NC}    %-15s  %d/%d checks passed  (Gateway: responding)\n" \
      "${name}" "${checks_passed}" "${checks_total}"
    return 0
  elif [[ ${checks_passed} -ge 3 ]]; then
    printf "  ${YELLOW}WARN${NC}  %-15s  %d/%d checks passed  (Gateway: not responding)\n" \
      "${name}" "${checks_passed}" "${checks_total}"
    return 1
  else
    printf "  ${RED}FAIL${NC}  %-15s  %d/%d checks passed\n" \
      "${name}" "${checks_passed}" "${checks_total}"
    return 1
  fi
}

# ─── Main ───────────────────────────────────────────────────

echo ""
echo "ClawStaff Agent Health Check"
echo "Gateway: ${GATEWAY_API}"
echo "─────────────────────────────────────────────"

if [[ -n "${AGENT_NAME}" ]]; then
  # Check a single agent
  check_agent "${AGENT_NAME}"
  exit $?
else
  # Check all agents
  if [[ ! -d "${AGENTS_DIR}" ]]; then
    echo "  No agents directory found at ${AGENTS_DIR}"
    exit 1
  fi

  TOTAL=0
  HEALTHY=0
  FAILED=0

  for agent_dir in "${AGENTS_DIR}"/*/; do
    # Skip if no directories found (glob didn't match)
    [[ -d "${agent_dir}" ]] || continue

    name="$(basename "${agent_dir}")"
    ((TOTAL++))

    if check_agent "${name}"; then
      ((HEALTHY++))
    else
      ((FAILED++))
    fi
  done

  echo "─────────────────────────────────────────────"

  if [[ ${TOTAL} -eq 0 ]]; then
    echo "  No agents found."
  else
    printf "  Total: %d  |  Healthy: ${GREEN}%d${NC}  |  Issues: ${RED}%d${NC}\n" \
      "${TOTAL}" "${HEALTHY}" "${FAILED}"
  fi

  echo ""

  [[ ${FAILED} -eq 0 ]]
fi
