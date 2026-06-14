#!/usr/bin/env bash
set -Eeuo pipefail

SITE_SLUG="${SITE_SLUG:-site}"
SERVICE_NAME="${SERVICE_NAME:-${SITE_SLUG}-leads.service}"
NGINX_SITE_NAME="${NGINX_SITE_NAME:-${SITE_SLUG}}"
APP_ROOT="${APP_ROOT:-/var/www/sites/${SITE_SLUG}}"
REPO_DIR="${REPO_DIR:-${SRC_DIR:-$HOME/app-repo}}"
BRANCH="${BRANCH:-main}"
DEPLOY_REF="${DEPLOY_REF:-origin/${BRANCH}}"
PORT="${PORT:-8080}"
DOMAIN="${DOMAIN:-example.com}"
WWW_DOMAIN="${WWW_DOMAIN:-www.example.com}"
INSTALL_WORKSPACE_DEPS="${INSTALL_WORKSPACE_DEPS:-true}"
APPLY_PERMISSIONS="${APPLY_PERMISSIONS:-true}"
USE_CLEAN_WORKTREE="${USE_CLEAN_WORKTREE:-true}"
ALLOW_DIRTY_REPO="${ALLOW_DIRTY_REPO:-false}"
EXTRA_SYSTEMD_SERVICES="${EXTRA_SYSTEMD_SERVICES:-}"
EXTRA_CHECK_URLS="${EXTRA_CHECK_URLS:-}"
HEALTHCHECK_RETRIES="${HEALTHCHECK_RETRIES:-10}"
HEALTHCHECK_DELAY="${HEALTHCHECK_DELAY:-1}"
TEMP_SOURCE_DIR=""
SOURCE_DIR=""

info() {
  printf '\n[%s] %s\n' "$(date '+%F %T')" "$*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_bool() {
  local value="$1"
  local name="$2"

  if [[ "${value}" != "true" && "${value}" != "false" ]]; then
    echo "${name} must be true or false (got: ${value})" >&2
    exit 1
  fi
}

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "${value}"
}

wait_for_healthcheck() {
  local url="$1"
  local retries="$2"
  local delay="$3"
  local attempt=1

  while (( attempt <= retries )); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi

    if (( attempt < retries )); then
      sleep "$delay"
    fi

    attempt=$((attempt + 1))
  done

  return 1
}

run_workspace_install() {
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
}

sync_frontend_dist() {
  sudo mkdir -p "${APP_ROOT}/web/dist" "${APP_ROOT}/web/dist/assets"
  sudo rsync -a --delete --exclude assets/ "${SOURCE_DIR}/apps/web/dist/" "${APP_ROOT}/web/dist/"
  sudo rsync -a "${SOURCE_DIR}/apps/web/dist/assets/" "${APP_ROOT}/web/dist/assets/"
}

run_additional_service_checks() {
  local raw_services="$1"
  local label="$2"
  local service=""
  local value=""

  [[ -z "${raw_services}" ]] && return 0

  IFS=',' read -r -a service <<<"${raw_services}"
  for value in "${service[@]}"; do
    value="$(trim "${value}")"
    [[ -z "${value}" ]] && continue
    info "${label}: checking service ${value}"
    sudo systemctl is-active "${value}" >/dev/null
  done
}

run_additional_url_checks() {
  local raw_urls="$1"
  local label="$2"
  local url=""
  local value=""

  [[ -z "${raw_urls}" ]] && return 0

  IFS=',' read -r -a url <<<"${raw_urls}"
  for value in "${url[@]}"; do
    value="$(trim "${value}")"
    [[ -z "${value}" ]] && continue
    info "${label}: checking ${value}"
    curl -fsSIL "${value}" >/dev/null
  done
}

cleanup() {
  if [[ -n "${TEMP_SOURCE_DIR}" && -d "${TEMP_SOURCE_DIR}" ]]; then
    git -C "${REPO_DIR}" worktree remove --force "${TEMP_SOURCE_DIR}" >/dev/null 2>&1 ||
      rm -rf "${TEMP_SOURCE_DIR}"
  fi
}

prepare_source_dir() {
  local current_ref=""
  local target_ref=""

  if [[ ! -d "${REPO_DIR}/.git" ]]; then
    echo "Source repository not found at ${REPO_DIR}. Clone bootstrap repository first." >&2
    exit 1
  fi

  info "Fetching source repository (${REPO_DIR})"
  git -C "${REPO_DIR}" fetch --prune origin

  if ! target_ref="$(git -C "${REPO_DIR}" rev-parse --verify --quiet "${DEPLOY_REF}")"; then
    echo "Deploy ref ${DEPLOY_REF} not found in ${REPO_DIR}" >&2
    exit 1
  fi

  if [[ "${USE_CLEAN_WORKTREE}" == "true" ]]; then
    TEMP_SOURCE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/${SITE_SLUG}-deploy-XXXXXX")"
    info "Preparing clean worktree for ${DEPLOY_REF}"
    git -C "${REPO_DIR}" worktree add --force --detach "${TEMP_SOURCE_DIR}" "${target_ref}" >/dev/null
    SOURCE_DIR="${TEMP_SOURCE_DIR}"
    return 0
  fi

  if [[ "${ALLOW_DIRTY_REPO}" != "true" ]] && [[ -n "$(git -C "${REPO_DIR}" status --short)" ]]; then
    echo "Repository ${REPO_DIR} has local changes. Set ALLOW_DIRTY_REPO=true to bypass." >&2
    exit 1
  fi

  current_ref="$(git -C "${REPO_DIR}" rev-parse HEAD)"
  if [[ "${current_ref}" != "${target_ref}" ]]; then
    echo "Repository ${REPO_DIR} is at ${current_ref}, expected ${target_ref}. Use USE_CLEAN_WORKTREE=true or check out the target ref manually." >&2
    exit 1
  fi

  SOURCE_DIR="${REPO_DIR}"
}

run_preflight_checks() {
  local healthcheck_url="http://127.0.0.1:${PORT}/api/health"

  info "Preflight checks"
  sudo systemctl is-active "${SERVICE_NAME}" >/dev/null
  run_additional_service_checks "${EXTRA_SYSTEMD_SERVICES}" "Preflight"

  if ! wait_for_healthcheck "${healthcheck_url}" "${HEALTHCHECK_RETRIES}" "${HEALTHCHECK_DELAY}"; then
    echo "Preflight healthcheck failed after ${HEALTHCHECK_RETRIES} attempts: ${healthcheck_url}" >&2
    exit 1
  fi

  curl -fsS "${healthcheck_url}" >/dev/null
  curl -fsSIL "https://${DOMAIN}" >/dev/null
  if [[ -n "${WWW_DOMAIN}" ]]; then
    curl -fsSIL "https://${WWW_DOMAIN}" >/dev/null
  fi
  run_additional_url_checks "${EXTRA_CHECK_URLS}" "Preflight"
}

run_post_deploy_checks() {
  local healthcheck_url="http://127.0.0.1:${PORT}/api/health"

  info "Post-deploy checks"
  sudo systemctl is-active "${SERVICE_NAME}" >/dev/null
  run_additional_service_checks "${EXTRA_SYSTEMD_SERVICES}" "Post-deploy"

  if sudo test -e "/etc/nginx/sites-enabled/${NGINX_SITE_NAME}"; then
    info "Nginx site is enabled: ${NGINX_SITE_NAME}"
  else
    info "Nginx site ${NGINX_SITE_NAME} is not enabled; skipping site presence check."
  fi

  if ! wait_for_healthcheck "${healthcheck_url}" "${HEALTHCHECK_RETRIES}" "${HEALTHCHECK_DELAY}"; then
    echo "Healthcheck failed after ${HEALTHCHECK_RETRIES} attempts: ${healthcheck_url}" >&2
    exit 1
  fi

  curl -fsS "${healthcheck_url}" >/dev/null
  curl -fsSIL "https://${DOMAIN}" >/dev/null
  if [[ -n "${WWW_DOMAIN}" ]]; then
    curl -fsSIL "https://${WWW_DOMAIN}" >/dev/null
  fi
  run_additional_url_checks "${EXTRA_CHECK_URLS}" "Post-deploy"
}

main() {
  require_cmd sudo
  require_cmd git
  require_cmd npm
  require_cmd rsync
  require_cmd curl
  require_cmd mktemp

  require_bool "${INSTALL_WORKSPACE_DEPS}" "INSTALL_WORKSPACE_DEPS"
  require_bool "${APPLY_PERMISSIONS}" "APPLY_PERMISSIONS"
  require_bool "${USE_CLEAN_WORKTREE}" "USE_CLEAN_WORKTREE"
  require_bool "${ALLOW_DIRTY_REPO}" "ALLOW_DIRTY_REPO"

  info "Checking sudo access"
  sudo -n true
  info "Deploy target: site=${NGINX_SITE_NAME}, service=${SERVICE_NAME}, app_root=${APP_ROOT}"
  info "Deploy source: repo=${REPO_DIR}, ref=${DEPLOY_REF}"

  trap cleanup EXIT
  run_preflight_checks

  prepare_source_dir
  cd "${SOURCE_DIR}"

  if [[ "${INSTALL_WORKSPACE_DEPS}" == "true" ]]; then
    info "Installing workspace dependencies"
    run_workspace_install
  else
    info "Skipping workspace dependency install (INSTALL_WORKSPACE_DEPS=false)"
  fi

  info "Building frontend"
  npm run build:web

  info "Preparing deploy directories"
  sudo mkdir -p "${APP_ROOT}/web/dist" "${APP_ROOT}/server"

  info "Syncing frontend and backend files"
  sync_frontend_dist
  # Keep server-side secrets that are not stored in git.
  sudo rsync -a --delete --exclude node_modules --exclude .env "${SOURCE_DIR}/apps/server/" "${APP_ROOT}/server/"

  if ! sudo test -f "${APP_ROOT}/server/.env"; then
    echo "Missing ${APP_ROOT}/server/.env. Restore environment file before restarting service." >&2
    exit 1
  fi

  info "Installing backend production dependencies"
  sudo npm install --omit=dev --prefix "${APP_ROOT}/server"

  if [[ "${APPLY_PERMISSIONS}" == "true" ]]; then
    info "Applying ownership and permissions"
    sudo chown -R root:www-data "${APP_ROOT}"
    sudo find "${APP_ROOT}" -type d -exec chmod 750 {} \;
    sudo find "${APP_ROOT}" -type f -exec chmod 640 {} \;
    if [[ -f "${APP_ROOT}/server/.env" ]]; then
      sudo chmod 640 "${APP_ROOT}/server/.env"
    fi
  else
    info "Skipping ownership/permissions step (APPLY_PERMISSIONS=false)"
  fi

  info "Restarting backend service"
  sudo systemctl daemon-reload
  sudo systemctl restart "${SERVICE_NAME}"

  run_post_deploy_checks

  info "App-only deployment complete"
}

main "$@"
