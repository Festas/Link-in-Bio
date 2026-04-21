#!/usr/bin/env bash
set -euo pipefail

log() { echo "[ssl-setup] $*"; }
fail() { echo "[ssl-setup][ERROR] $*" >&2; exit 1; }

first_line_trimmed() {
  awk 'NF{line=$0; gsub(/^[[:space:]]+|[[:space:]]+$/, "", line); print line; exit}' "$1"
}

first_line_trimmed_sudo() {
  sudo awk 'NF{line=$0; gsub(/^[[:space:]]+|[[:space:]]+$/, "", line); print line; exit}' "$1"
}

print_sanitized_preview() {
  local file_path="$1"
  local max_lines="${2:-8}"
  local line_no=0

  echo "[ssl-setup] Preview of ${file_path} (first ${max_lines} lines, sanitized):" >&2
  while IFS= read -r line && [ "$line_no" -lt "$max_lines" ]; do
    line_no=$((line_no + 1))
    printf '[ssl-setup]   L%02d: %s\n' "$line_no" "$(printf '%s' "$line" | sed 's/[^[:print:]\t]/?/g')" >&2
  done <"$file_path"
}

print_sanitized_preview_sudo() {
  local file_path="$1"
  local max_lines="${2:-8}"

  echo "[ssl-setup] Preview of ${file_path} (first ${max_lines} lines, sanitized):" >&2
  sudo awk -v max_lines="${max_lines}" '
    NR <= max_lines {
      line = $0
      gsub(/[^[:print:]\t]/, "?", line)
      printf("[ssl-setup]   L%02d: %s\n", NR, line)
    }
  ' "$file_path" >&2
}

require_first_non_empty_line_is_server_block() {
  local file_path="$1"
  local context="$2"
  local first_line
  first_line="$(first_line_trimmed "$file_path" || true)"

  if [ "$first_line" != "server {" ]; then
    print_sanitized_preview "$file_path" 10
    fail "${context} sanity check failed (first non-empty line was '${first_line:-<empty>}' instead of 'server {')."
  fi
}

umask 077

log "Installing certbot package..."
sudo apt-get update
sudo apt-get install -y certbot

ACME_WEBROOT="/var/www/certbot"
ACME_SNIPPET_FILE="/etc/nginx/snippets/acme-challenge.conf"
ACME_SITE_FILE="/etc/nginx/sites-available/certbot-acme-challenge.conf"
ACME_SITE_LINK="/etc/nginx/sites-enabled/certbot-acme-challenge.conf"
ACME_SITE_TMP="${ACME_SITE_FILE}.tmp"
BACKUP_DIR="$(mktemp -d)"
BACKUP_FILE="${BACKUP_DIR}/certbot-acme-challenge.conf.bak"
BACKUP_LINK="${BACKUP_DIR}/certbot-acme-challenge.conf.link.bak"
LOCAL_TMP_CONFIG="$(mktemp)"
LOCAL_TMP_SNIPPET="$(mktemp)"

cleanup() {
  rm -f "${LOCAL_TMP_CONFIG}" || true
  rm -f "${LOCAL_TMP_SNIPPET}" || true
  sudo rm -rf "${BACKUP_DIR}" || true
  sudo rm -f "${ACME_SITE_TMP}" || true
}
trap cleanup EXIT

log "Preparing ACME webroot with stable ownership/permissions..."
sudo install -d -o www-data -g www-data -m 0755 "${ACME_WEBROOT}"
sudo install -d -o root -g root -m 0755 /etc/nginx/snippets

cat >"${LOCAL_TMP_SNIPPET}" <<'EOF'
location /.well-known/acme-challenge/ {
  root __ACME_WEBROOT__;
  default_type "text/plain";
  try_files $uri =404;
}
EOF
sed -i "s|__ACME_WEBROOT__|${ACME_WEBROOT}|g" "${LOCAL_TMP_SNIPPET}"

log "Installing ACME snippet..."
sudo install -o root -g root -m 0644 "${LOCAL_TMP_SNIPPET}" "${ACME_SNIPPET_FILE}"

log "Backing up any existing ACME site artifacts for rollback..."
if sudo test -f "${ACME_SITE_FILE}"; then
  sudo cp -a "${ACME_SITE_FILE}" "${BACKUP_FILE}"
fi
if sudo test -L "${ACME_SITE_LINK}" || sudo test -e "${ACME_SITE_LINK}"; then
  sudo cp -a "${ACME_SITE_LINK}" "${BACKUP_LINK}"
fi

# Always remove stale entries first so repeated runs cannot keep corrupted content.
log "Removing stale ACME enabled/available config entries before rewrite..."
sudo rm -f "${ACME_SITE_LINK}" "${ACME_SITE_FILE}" "${ACME_SITE_TMP}"

cat >"${LOCAL_TMP_CONFIG}" <<'EOF'
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name _;

  # Keep ACME handling here as a fallback even though vhosts include
  # /etc/nginx/snippets/acme-challenge.conf. This avoids failed HTTP-01
  # challenges if a vhost include is temporarily missing.
  location /.well-known/acme-challenge/ {
    root __ACME_WEBROOT__;
    default_type "text/plain";
    try_files $uri =404;
  }

  location / {
    return 404;
  }
}
EOF
sed -i "s|__ACME_WEBROOT__|${ACME_WEBROOT}|g" "${LOCAL_TMP_CONFIG}"

require_first_non_empty_line_is_server_block "${LOCAL_TMP_CONFIG}" "Generated ACME config"

log "Installing ACME Nginx config atomically..."
sudo install -o root -g root -m 0644 "${LOCAL_TMP_CONFIG}" "${ACME_SITE_TMP}"
sudo mv -f "${ACME_SITE_TMP}" "${ACME_SITE_FILE}"

if ! sudo test -f "${ACME_SITE_FILE}"; then
  fail "ACME site file was not written to ${ACME_SITE_FILE}."
fi
sudo_first_line="$(first_line_trimmed_sudo "${ACME_SITE_FILE}" || true)"
if [ "${sudo_first_line}" != "server {" ]; then
  print_sanitized_preview_sudo "${ACME_SITE_FILE}" 10
  fail "Written ACME config failed sanity check after install (first non-empty line was '${sudo_first_line:-<empty>}' instead of 'server {')."
fi

log "Enabling ACME site using a fresh symlink..."
sudo ln -sfn "${ACME_SITE_FILE}" "${ACME_SITE_LINK}"
if [ ! -L "${ACME_SITE_LINK}" ]; then
  fail "Enabled ACME site entry is not a symlink."
fi
if [ "$(sudo readlink -f "${ACME_SITE_LINK}")" != "$(sudo readlink -f "${ACME_SITE_FILE}")" ]; then
  fail "Enabled ACME site symlink does not point to expected available config."
fi

log "Validating Nginx configuration..."
if ! sudo nginx -t; then
  fail "Nginx config test failed after ACME config deployment."
fi

log "Reloading Nginx..."
if ! sudo systemctl reload nginx; then
  echo "[ssl-setup][ERROR] Nginx reload failed. Attempting rollback..." >&2
  sudo rm -f "${ACME_SITE_LINK}" "${ACME_SITE_FILE}" "${ACME_SITE_TMP}"
  if [ -f "${BACKUP_FILE}" ]; then
    sudo mv -f "${BACKUP_FILE}" "${ACME_SITE_FILE}"
  fi
  if [ -e "${BACKUP_LINK}" ] || [ -L "${BACKUP_LINK}" ]; then
    sudo mv -f "${BACKUP_LINK}" "${ACME_SITE_LINK}"
  fi
  echo "[ssl-setup] Re-testing Nginx after rollback attempt..." >&2
  if sudo nginx -t; then
    echo "[ssl-setup] Rollback restored a valid Nginx config." >&2
  else
    echo "[ssl-setup][ERROR] Nginx config is still invalid after rollback." >&2
  fi
  exit 1
fi

log "Requesting/renewing unified certificate via certbot webroot challenge..."
sudo certbot certonly --webroot -w "${ACME_WEBROOT}" --cert-name festas-builds.com \
  -d festas-builds.com \
  -d admin.festas-builds.com \
  -d panel.festas-builds.com \
  -d mc.festas-builds.com \
  -d mc-map.festas-builds.com \
  -d mc-stats.festas-builds.com \
  -d cs.festas-builds.com \
  -d rigpilot.festas-builds.com \
  -d immocalc.festas-builds.com \
  -d fire.festas-builds.com \
  --non-interactive --agree-tos --register-unsafely-without-email --keep-until-expiring

log "Installing certbot deploy hook for safe Nginx reload..."
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat <<'EOF' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh >/dev/null
#!/usr/bin/env bash
nginx -t && systemctl reload nginx
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

log "Enabling certbot timer and validating renew flow..."
sudo systemctl enable --now certbot.timer
sudo certbot renew --dry-run
log "Final Nginx reload after dry-run renewal..."
sudo systemctl reload nginx
