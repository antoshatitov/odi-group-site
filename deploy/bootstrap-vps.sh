#!/usr/bin/env bash
set -Eeuo pipefail

SITE_SLUG="${SITE_SLUG:-site}"
SERVICE_NAME="${SERVICE_NAME:-${SITE_SLUG}-leads.service}"
NGINX_SITE_NAME="${NGINX_SITE_NAME:-${SITE_SLUG}}"
DOMAIN="${DOMAIN:-example.com}"
WWW_DOMAIN="${WWW_DOMAIN:-www.example.com}"
APP_ROOT="${APP_ROOT:-/var/www/sites/${SITE_SLUG}}"
SRC_DIR="${SRC_DIR:-$HOME/app-repo}"
BRANCH="${BRANCH:-main}"
PORT="${PORT:-8080}"
ENABLE_UFW="${ENABLE_UFW:-true}"
DISABLE_NGINX_DEFAULT="${DISABLE_NGINX_DEFAULT:-false}"
TRUST_PROXY="${TRUST_PROXY:-true}"

default_allowed_origins="https://${DOMAIN}"
if [[ -n "${WWW_DOMAIN}" ]]; then
  default_allowed_origins="${default_allowed_origins},https://${WWW_DOMAIN}"
fi
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-${default_allowed_origins}}"

REPO_URL="${REPO_URL:?Set REPO_URL to the Git repository URL}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:?Set CERTBOT_EMAIL for Lets Encrypt}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:?Set TELEGRAM_BOT_TOKEN}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:?Set TELEGRAM_CHAT_ID}"

TELEGRAM_CALC_BOT_TOKEN="${TELEGRAM_CALC_BOT_TOKEN:-}"
TELEGRAM_CALC_CHAT_ID="${TELEGRAM_CALC_CHAT_ID:-}"
TELEGRAM_QUARANTINE_CHAT_ID="${TELEGRAM_QUARANTINE_CHAT_ID:-}"
LOG_HASH_SALT="${LOG_HASH_SALT:-}"
CAPTCHA_ENABLED="${CAPTCHA_ENABLED:-false}"

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

install_node20() {
  local node_major
  node_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"
  if [[ -n "$node_major" && "$node_major" -ge 20 ]]; then
    info "Node.js ${node_major} already installed"
    return
  fi

  info "Installing Node.js 20.x"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
}

write_server_env() {
  local tmp_env
  tmp_env="$(mktemp)"

  cat >"$tmp_env" <<EOF
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}
TELEGRAM_CALC_BOT_TOKEN=${TELEGRAM_CALC_BOT_TOKEN}
TELEGRAM_CALC_CHAT_ID=${TELEGRAM_CALC_CHAT_ID}
TELEGRAM_QUARANTINE_CHAT_ID=${TELEGRAM_QUARANTINE_CHAT_ID}
LOG_HASH_SALT=${LOG_HASH_SALT}
CAPTCHA_ENABLED=${CAPTCHA_ENABLED}
PORT=${PORT}
ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
TRUST_PROXY=${TRUST_PROXY}
EOF

  sudo install -o root -g www-data -m 640 "$tmp_env" "${APP_ROOT}/server/.env"
  rm -f "$tmp_env"
}

write_systemd_service() {
  sudo tee "/etc/systemd/system/${SERVICE_NAME}" >/dev/null <<EOF
[Unit]
Description=${SITE_SLUG} Lead API
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_ROOT}/server
EnvironmentFile=${APP_ROOT}/server/.env
ExecStart=/usr/bin/node ${APP_ROOT}/server/src/index.js
Restart=on-failure
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
EOF
}

write_nginx_config() {
  sudo tee "/etc/nginx/sites-available/${NGINX_SITE_NAME}" >/dev/null <<EOF
server {
  listen 80;
  server_name ${DOMAIN} ${WWW_DOMAIN};

  root ${APP_ROOT}/web/dist;
  index index.html;

  location / {
    try_files \$uri /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:${PORT};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
EOF
}

main() {
  require_cmd sudo
  require_cmd curl
  require_cmd git
  require_cmd npm
  require_cmd rsync

  require_bool "${ENABLE_UFW}" "ENABLE_UFW"
  require_bool "${DISABLE_NGINX_DEFAULT}" "DISABLE_NGINX_DEFAULT"
  require_bool "${TRUST_PROXY}" "TRUST_PROXY"

  info "Checking sudo access"
  sudo -v
  info "Deploy target: site=${NGINX_SITE_NAME}, service=${SERVICE_NAME}, app_root=${APP_ROOT}"

  info "Updating apt repositories and base packages"
  sudo apt update
  sudo DEBIAN_FRONTEND=noninteractive apt upgrade -y
  sudo apt install -y curl git ca-certificates ufw nginx certbot python3-certbot-nginx rsync

  install_node20

  info "Node and npm versions"
  node -v
  npm -v

  info "Ensuring nginx is enabled"
  sudo systemctl enable --now nginx

  if [[ "${ENABLE_UFW}" == "true" ]]; then
    info "Configuring UFW (OpenSSH and Nginx Full)"
    sudo ufw allow OpenSSH
    sudo ufw allow 'Nginx Full'
    if sudo ufw status | grep -q "Status: inactive"; then
      sudo ufw --force enable
    fi
  fi

  info "Preparing source code in ${SRC_DIR}"
  if [[ -d "${SRC_DIR}/.git" ]]; then
    git -C "${SRC_DIR}" fetch --prune origin
    git -C "${SRC_DIR}" checkout "${BRANCH}"
    git -C "${SRC_DIR}" pull --ff-only origin "${BRANCH}"
  else
    git clone --branch "${BRANCH}" "${REPO_URL}" "${SRC_DIR}"
  fi

  cd "${SRC_DIR}"
  info "Installing workspace dependencies"
  npm install

  info "Building frontend"
  npm run build:web

  info "Preparing deploy directories"
  sudo mkdir -p "${APP_ROOT}/web/dist" "${APP_ROOT}/server"
  sudo chown -R "$USER:$USER" "${APP_ROOT}"

  info "Syncing frontend and backend files"
  rsync -a --delete "${SRC_DIR}/apps/web/dist/" "${APP_ROOT}/web/dist/"
  rsync -a --delete --exclude node_modules "${SRC_DIR}/apps/server/" "${APP_ROOT}/server/"

  info "Writing backend environment"
  write_server_env

  info "Installing backend production dependencies"
  cd "${APP_ROOT}/server"
  npm install --omit=dev

  info "Writing systemd and nginx configuration"
  write_systemd_service
  write_nginx_config

  if [[ "${DISABLE_NGINX_DEFAULT}" == "true" ]]; then
    sudo rm -f /etc/nginx/sites-enabled/default
  fi
  sudo ln -sfn "/etc/nginx/sites-available/${NGINX_SITE_NAME}" \
    "/etc/nginx/sites-enabled/${NGINX_SITE_NAME}"

  info "Reloading systemd and restarting services"
  sudo systemctl daemon-reload
  sudo systemctl enable --now "${SERVICE_NAME}"
  sudo nginx -t
  sudo systemctl reload nginx

  info "Requesting SSL certificates via certbot"
  if [[ -n "${WWW_DOMAIN}" ]]; then
    sudo certbot --nginx -d "${DOMAIN}" -d "${WWW_DOMAIN}" -m "${CERTBOT_EMAIL}" \
      --agree-tos --no-eff-email --redirect -n
  else
    sudo certbot --nginx -d "${DOMAIN}" -m "${CERTBOT_EMAIL}" \
      --agree-tos --no-eff-email --redirect -n
  fi

  info "Verifying certbot renewal"
  sudo certbot renew --dry-run

  info "Post-deploy checks"
  sudo systemctl --no-pager --full status "${SERVICE_NAME}" | sed -n '1,20p'
  curl -fsS "http://127.0.0.1:${PORT}/api/health"
  curl -I "https://${DOMAIN}"
  if [[ -n "${WWW_DOMAIN}" ]]; then
    curl -I "https://${WWW_DOMAIN}"
  fi

  info "Deployment complete"
}

main "$@"
