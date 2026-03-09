#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# ClawStaff — Backup an Agent
#
# Creates a timestamped backup of an agent's memory and config.
# Backups are stored at /opt/clawstaff/backups/{agent_name}/
#
# Usage:
#   ./backup-agent.sh <agent_name>
#
# Example:
#   ./backup-agent.sh maya
#   # Creates: /opt/clawstaff/backups/maya/maya-2026-03-05T14-30-00Z.tar.gz
# ─────────────────────────────────────────────────────────────

BASE_DIR="/opt/clawstaff"
AGENTS_DIR="${BASE_DIR}/agents"
BACKUP_DIR="${BASE_DIR}/backups"
LOG_DIR="${BASE_DIR}/logs"
LOG_FILE="${LOG_DIR}/provisioning.log"

# ─── Argument validation ────────────────────────────────────

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <agent_name>"
  exit 1
fi

AGENT_NAME="$1"
AGENT_DIR="${AGENTS_DIR}/${AGENT_NAME}"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H-%M-%SZ")"
AGENT_BACKUP_DIR="${BACKUP_DIR}/${AGENT_NAME}"
ARCHIVE_NAME="${AGENT_NAME}-${TIMESTAMP}.tar.gz"

log() {
  local msg="[${TIMESTAMP}] [backup] ${AGENT_NAME}: $1"
  echo "$msg"
  mkdir -p "${LOG_DIR}"
  echo "$msg" >> "${LOG_FILE}"
}

# ─── Pre-flight checks ─────────────────────────────────────

[[ -d "${AGENT_DIR}" ]] || { echo "ERROR: Agent directory '${AGENT_DIR}' not found"; exit 1; }

log "Starting backup"

# ─── Create backup directory ────────────────────────────────

mkdir -p "${AGENT_BACKUP_DIR}"

# ─── Create a compressed archive of the entire agent directory ─

# This captures everything: SOUL.md, USER.md, HEARTBEAT.md, memory/,
# openclaw.json, installed skills, onboard config, and session state.
log "Archiving ${AGENT_DIR} → ${AGENT_BACKUP_DIR}/${ARCHIVE_NAME}"

tar -czf "${AGENT_BACKUP_DIR}/${ARCHIVE_NAME}" \
  -C "${AGENTS_DIR}" \
  "${AGENT_NAME}"

# Verify the archive was created and has content
ARCHIVE_PATH="${AGENT_BACKUP_DIR}/${ARCHIVE_NAME}"
if [[ -f "${ARCHIVE_PATH}" ]] && [[ -s "${ARCHIVE_PATH}" ]]; then
  ARCHIVE_SIZE=$(du -h "${ARCHIVE_PATH}" | cut -f1)
  log "Backup created: ${ARCHIVE_PATH} (${ARCHIVE_SIZE})"
else
  log "ERROR: Backup archive is empty or missing"
  exit 1
fi

# ─── Prune old backups (keep last 10) ──────────────────────

# Prevent backup directory from growing unbounded.
# Keeps the 10 most recent backups per agent.
BACKUP_COUNT=$(ls -1 "${AGENT_BACKUP_DIR}"/*.tar.gz 2>/dev/null | wc -l)

if [[ ${BACKUP_COUNT} -gt 10 ]]; then
  PRUNE_COUNT=$((BACKUP_COUNT - 10))
  log "Pruning ${PRUNE_COUNT} old backup(s) (keeping latest 10)"

  ls -1t "${AGENT_BACKUP_DIR}"/*.tar.gz | tail -n "${PRUNE_COUNT}" | while read -r old_backup; do
    rm -f "${old_backup}"
    log "  Removed: $(basename "${old_backup}")"
  done
fi

# ─── Done ───────────────────────────────────────────────────

log "Backup complete"
echo ""
echo "  Agent:    ${AGENT_NAME}"
echo "  Archive:  ${ARCHIVE_PATH}"
echo "  Size:     ${ARCHIVE_SIZE}"
echo ""
