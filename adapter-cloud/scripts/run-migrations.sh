#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# run-migrations.sh — Run all SQL migration files in order against the
# staging PostgreSQL database.
###############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
MIGRATIONS_DIR="${ROOT_DIR}/migrations"

# ---------------------------------------------------------------------------
# Configuration (override via environment or .env.staging)
# ---------------------------------------------------------------------------
ENV_FILE="${ROOT_DIR}/.env.staging"
if [[ -f "${ENV_FILE}" ]]; then
  echo "Loading environment from ${ENV_FILE}"
  set -a
  # shellcheck source=/dev/null
  source "${ENV_FILE}"
  set +a
fi

DB_HOST="${DB_HOST:?DB_HOST is required}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:?DB_NAME is required}"
DB_USER="${DB_USER:?DB_USER is required}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD is required}"
DB_SSL_MODE="${DB_SSL_MODE:-require}"

export PGPASSWORD="${DB_PASSWORD}"

echo "============================================="
echo " Running Migrations"
echo "============================================="
echo ""
echo "  Host:     ${DB_HOST}:${DB_PORT}"
echo "  Database: ${DB_NAME}"
echo "  User:     ${DB_USER}"
echo "  SSL:      ${DB_SSL_MODE}"
echo ""

# ---------------------------------------------------------------------------
# Ensure migrations tracking table exists
# ---------------------------------------------------------------------------
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
  --set=sslmode="${DB_SSL_MODE}" -q <<'SQL'
CREATE TABLE IF NOT EXISTS _migrations (
  filename  TEXT PRIMARY KEY,
  applied   TIMESTAMPTZ NOT NULL DEFAULT now()
);
SQL

# ---------------------------------------------------------------------------
# Apply each migration file in lexicographic order
# ---------------------------------------------------------------------------
APPLIED=0
SKIPPED=0

for migration_file in "${MIGRATIONS_DIR}"/*.sql; do
  [[ -f "${migration_file}" ]] || continue

  filename="$(basename "${migration_file}")"

  already_applied=$(
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
      --set=sslmode="${DB_SSL_MODE}" -tAq \
      -c "SELECT 1 FROM _migrations WHERE filename = '${filename}' LIMIT 1;"
  )

  if [[ "${already_applied}" == "1" ]]; then
    echo "  SKIP  ${filename} (already applied)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo "  APPLY ${filename}..."
  psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    --set=sslmode="${DB_SSL_MODE}" -q \
    --single-transaction \
    -f "${migration_file}"

  psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    --set=sslmode="${DB_SSL_MODE}" -q \
    -c "INSERT INTO _migrations (filename) VALUES ('${filename}');"

  APPLIED=$((APPLIED + 1))
done

echo ""
echo "  Done: ${APPLIED} applied, ${SKIPPED} skipped."
echo ""
