#!/usr/bin/env bash
set -Eeuo pipefail

SITE_SLUG="${SITE_SLUG:-odi}"
SERVICE_NAME="${SERVICE_NAME:-${SITE_SLUG}-leads.service}"
NGINX_SITE_NAME="${NGINX_SITE_NAME:-${SITE_SLUG}}"
APP_ROOT="${APP_ROOT:-/var/www/sites/${SITE_SLUG}}"
SRC_DIR="${SRC_DIR:-$HOME/odi-group}"
BRANCH="${BRANCH:-main}"
PORT="${PORT:-8080}"
DOMAIN="${DOMAIN:-odi-group.ru}"
WWW_DOMAIN="${WWW_DOMAIN:-www.odi-group.ru}"
INSTALL_WORKSPACE_DEPS="${INSTALL_WORKSPACE_DEPS:-true}"
APPLY_PERMISSIONS="${APPLY_PERMISSIONS:-true}"
HEALTHCHECK_RETRIES="${HEALTHCHECK_RETRIES:-10}"
HEALTHCHECK_DELAY="${HEALTHCHECK_DELAY:-1}"

info() {
  printf '\n[%s] %s\n' "$(date '+%F %T')" "$*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
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

main() {
  require_cmd sudo
  require_cmd git
  require_cmd npm
  require_cmd rsync
  require_cmd curl

  info "Checking sudo access"
  sudo -v
  info "Deploy target: site=${NGINX_SITE_NAME}, service=${SERVICE_NAME}, app_root=${APP_ROOT}"

  if [[ ! -d "${SRC_DIR}/.git" ]]; then
    echo "Source repository not found at ${SRC_DIR}. Clone bootstrap repository first." >&2
    exit 1
  fi

  info "Updating source repository (${SRC_DIR})"
  git -C "${SRC_DIR}" fetch --prune origin
  if git -C "${SRC_DIR}" show-ref --verify --quiet "refs/remotes/origin/${BRANCH}"; then
    git -C "${SRC_DIR}" checkout -B "${BRANCH}" "origin/${BRANCH}"
  else
    echo "Branch origin/${BRANCH} not found in ${SRC_DIR}" >&2
    exit 1
  fi

  cd "${SRC_DIR}"

  if [[ "${INSTALL_WORKSPACE_DEPS}" == "true" ]]; then
    info "Installing workspace dependencies"
    npm install
  else
    info "Skipping workspace dependency install (INSTALL_WORKSPACE_DEPS=false)"
  fi

  info "Building frontend"
  npm run build:web

  info "Preparing deploy directories"
  sudo mkdir -p "${APP_ROOT}/web/dist" "${APP_ROOT}/server"

  info "Syncing frontend and backend files"
  sudo rsync -a --delete "${SRC_DIR}/apps/web/dist/" "${APP_ROOT}/web/dist/"
  # Keep server-side secrets that are not stored in git.
  sudo rsync -a --delete --exclude node_modules --exclude .env "${SRC_DIR}/apps/server/" "${APP_ROOT}/server/"

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

  info "Post-deploy checks"
  sudo systemctl is-active "${SERVICE_NAME}"
  if sudo test -e "/etc/nginx/sites-enabled/${NGINX_SITE_NAME}"; then
    info "Nginx site is enabled: ${NGINX_SITE_NAME}"
  else
    info "Nginx site ${NGINX_SITE_NAME} is not enabled; skipping site presence check."
  fi
  local healthcheck_url="http://127.0.0.1:${PORT}/api/health"
  if ! wait_for_healthcheck "${healthcheck_url}" "${HEALTHCHECK_RETRIES}" "${HEALTHCHECK_DELAY}"; then
    echo "Healthcheck failed after ${HEALTHCHECK_RETRIES} attempts: ${healthcheck_url}" >&2
    exit 1
  fi
  curl -fsS "${healthcheck_url}"
  curl -I "https://${DOMAIN}"
  if [[ -n "${WWW_DOMAIN}" ]]; then
    curl -I "https://${WWW_DOMAIN}"
  fi

  info "App-only deployment complete"
}

main "$@"
