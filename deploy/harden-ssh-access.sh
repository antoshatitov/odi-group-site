#!/usr/bin/env bash
set -Eeuo pipefail

NEW_USER="${NEW_USER:-anton}"
PUBKEY_FILE="${PUBKEY_FILE:-}"
SSH_HARDENING_FILE="${SSH_HARDENING_FILE:-/etc/ssh/sshd_config.d/99-odi-hardening.conf}"

info() {
  printf '\n[%s] %s\n' "$(date '+%F %T')" "$*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

reload_ssh_service() {
  if sudo systemctl list-unit-files ssh.service >/dev/null 2>&1; then
    sudo systemctl reload ssh
    return
  fi

  if sudo systemctl list-unit-files sshd.service >/dev/null 2>&1; then
    sudo systemctl reload sshd
    return
  fi

  echo "Unable to find ssh/sshd service unit for reload." >&2
  exit 1
}

ensure_user() {
  if id -u "${NEW_USER}" >/dev/null 2>&1; then
    info "User ${NEW_USER} already exists"
  else
    info "Creating user ${NEW_USER}"
    sudo adduser --disabled-password --gecos '' "${NEW_USER}"
  fi

  info "Ensuring user ${NEW_USER} is in sudo group"
  sudo usermod -aG sudo "${NEW_USER}"
}

install_authorized_keys() {
  local user_home
  local ssh_dir
  local auth_keys

  user_home="$(getent passwd "${NEW_USER}" | cut -d: -f6)"
  if [[ -z "${user_home}" ]]; then
    echo "Unable to resolve home directory for ${NEW_USER}." >&2
    exit 1
  fi

  ssh_dir="${user_home}/.ssh"
  auth_keys="${ssh_dir}/authorized_keys"

  info "Installing SSH keys for ${NEW_USER}"
  sudo install -d -m 700 -o "${NEW_USER}" -g "${NEW_USER}" "${ssh_dir}"
  sudo touch "${auth_keys}"
  sudo chown "${NEW_USER}:${NEW_USER}" "${auth_keys}"
  sudo chmod 600 "${auth_keys}"

  while IFS= read -r key_line || [[ -n "${key_line}" ]]; do
    if [[ -z "${key_line//[[:space:]]/}" || "${key_line}" =~ ^[[:space:]]*# ]]; then
      continue
    fi

    if sudo grep -Fqx "${key_line}" "${auth_keys}"; then
      continue
    fi

    printf '%s\n' "${key_line}" | sudo tee -a "${auth_keys}" >/dev/null
  done <"${PUBKEY_FILE}"

  sudo chown "${NEW_USER}:${NEW_USER}" "${auth_keys}"
  sudo chmod 600 "${auth_keys}"
}

write_sshd_drop_in() {
  local tmp_conf
  tmp_conf="$(mktemp)"

  cat >"${tmp_conf}" <<'EOF'
# Managed by deploy/harden-ssh-access.sh
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PubkeyAuthentication yes
PermitRootLogin no
UsePAM yes
EOF

  info "Writing SSH hardening config to ${SSH_HARDENING_FILE}"
  sudo install -d -m 755 /etc/ssh/sshd_config.d
  sudo install -o root -g root -m 644 "${tmp_conf}" "${SSH_HARDENING_FILE}"
  rm -f "${tmp_conf}"
}

main() {
  require_cmd sudo
  require_cmd adduser
  require_cmd usermod
  require_cmd getent
  require_cmd sshd
  require_cmd systemctl
  require_cmd grep
  require_cmd install
  require_cmd tee

  if [[ -z "${PUBKEY_FILE}" ]]; then
    echo "PUBKEY_FILE is required. Example: PUBKEY_FILE=/tmp/anton.pub bash deploy/harden-ssh-access.sh" >&2
    exit 1
  fi

  if [[ ! -r "${PUBKEY_FILE}" ]]; then
    echo "PUBKEY_FILE is not readable: ${PUBKEY_FILE}" >&2
    exit 1
  fi

  info "Checking sudo access"
  sudo -v

  ensure_user
  install_authorized_keys
  write_sshd_drop_in

  info "Validating SSH daemon configuration"
  sudo sshd -t

  info "Reloading SSH service"
  reload_ssh_service

  cat <<EOF

SSH hardening applied successfully.

Run these checks from your Mac before closing the current root session:
1) Verify key-based access works:
   ssh ${NEW_USER}@<server-ip>
2) Verify password login is disabled:
   ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no ${NEW_USER}@<server-ip>
3) Verify root login is blocked:
   ssh root@<server-ip>

Expected result for checks 2 and 3: Permission denied (publickey).
EOF
}

main "$@"
