#!/usr/bin/env bash
#
# bootstrap.sh - Bootstrap script for Hetzner server setup
#
# This script is IDEMPOTENT - safe to run multiple times.
# It installs Docker and docker-compose plugin, creates a deploy user (if missing),
# adds it to the docker group, and creates /srv/link-in-bio with correct ownership.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Festas/Link-in-Bio/main/deploy/bootstrap.sh | sudo bash
#
# Or after cloning:
#   sudo bash deploy/bootstrap.sh
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root (use sudo)"
    exit 1
fi

log_info "=========================================="
log_info "Link-in-Bio Hetzner Server Bootstrap"
log_info "=========================================="

# ==========================================
# 1. Update system packages
# ==========================================
log_info "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq

# ==========================================
# 2. Install Docker if not already installed
# ==========================================
if command -v docker &> /dev/null; then
    log_info "Docker is already installed: $(docker --version)"
else
    log_info "Installing Docker..."
    
    # Install prerequisites
    apt-get install -y -qq \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release

    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg
    fi

    # Set up the repository
    if [[ ! -f /etc/apt/sources.list.d/docker.list ]]; then
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
          $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
          tee /etc/apt/sources.list.d/docker.list > /dev/null
    fi

    # Install Docker Engine
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    log_info "Docker installed successfully: $(docker --version)"
fi

# Verify docker-compose plugin is available
if docker compose version &> /dev/null; then
    log_info "Docker Compose plugin is available: $(docker compose version)"
else
    log_error "Docker Compose plugin is not available. Please check your Docker installation."
    exit 1
fi

# ==========================================
# 3. Enable and start Docker service
# ==========================================
log_info "Ensuring Docker service is enabled and running..."
systemctl enable docker
systemctl start docker

# ==========================================
# 4. Create deploy user if not exists
# ==========================================
DEPLOY_USER="deploy"
DEPLOY_HOME="/home/${DEPLOY_USER}"

if id "${DEPLOY_USER}" &>/dev/null; then
    log_info "User '${DEPLOY_USER}' already exists"
else
    log_info "Creating user '${DEPLOY_USER}'..."
    useradd -m -s /bin/bash "${DEPLOY_USER}"
    log_info "User '${DEPLOY_USER}' created"
fi

# ==========================================
# 5. Add deploy user to docker group
# ==========================================
if groups "${DEPLOY_USER}" | grep -q '\bdocker\b'; then
    log_info "User '${DEPLOY_USER}' is already in docker group"
else
    log_info "Adding user '${DEPLOY_USER}' to docker group..."
    usermod -aG docker "${DEPLOY_USER}"
    log_info "User '${DEPLOY_USER}' added to docker group"
fi

# ==========================================
# 6. Create application directory
# ==========================================
APP_DIR="/srv/link-in-bio"

if [[ -d "${APP_DIR}" ]]; then
    log_info "Directory ${APP_DIR} already exists"
else
    log_info "Creating directory ${APP_DIR}..."
    mkdir -p "${APP_DIR}"
fi

# Create subdirectories for persistent data
mkdir -p "${APP_DIR}/data"
mkdir -p "${APP_DIR}/static/uploads"
mkdir -p "${APP_DIR}/caddy_data"
mkdir -p "${APP_DIR}/caddy_config"

# ==========================================
# 7. Set correct ownership
# ==========================================
log_info "Setting ownership of ${APP_DIR} to ${DEPLOY_USER}:${DEPLOY_USER}..."
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}"

# Set permissions
chmod -R 755 "${APP_DIR}"
chmod 700 "${APP_DIR}/data"

# ==========================================
# 8. Configure firewall (if ufw is available)
# ==========================================
if command -v ufw &> /dev/null; then
    log_info "Configuring firewall rules..."
    ufw allow 22/tcp comment 'SSH' || true
    ufw allow 80/tcp comment 'HTTP' || true
    ufw allow 443/tcp comment 'HTTPS' || true
    
    # Check ufw status safely (may fail if ufw not properly configured)
    UFW_STATUS=$(ufw status 2>/dev/null || echo "unknown")
    if echo "${UFW_STATUS}" | grep -q "Status: inactive"; then
        log_warn "UFW is not enabled. Enable it manually with: ufw --force enable"
    elif echo "${UFW_STATUS}" | grep -q "Status: active"; then
        log_info "UFW is already enabled"
    else
        log_warn "Could not determine UFW status. Check manually with: ufw status"
    fi
else
    log_warn "UFW not found. Please configure firewall manually to allow ports 22, 80, 443"
fi

# ==========================================
# 9. Setup SSH key for deploy user (optional)
# ==========================================
SSH_DIR="${DEPLOY_HOME}/.ssh"
if [[ ! -d "${SSH_DIR}" ]]; then
    log_info "Creating SSH directory for ${DEPLOY_USER}..."
    mkdir -p "${SSH_DIR}"
    chmod 700 "${SSH_DIR}"
    touch "${SSH_DIR}/authorized_keys"
    chmod 600 "${SSH_DIR}/authorized_keys"
    chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${SSH_DIR}"
    log_info "SSH directory created. Add your public key to ${SSH_DIR}/authorized_keys"
else
    log_info "SSH directory for ${DEPLOY_USER} already exists"
fi

# ==========================================
# Summary
# ==========================================
echo ""
log_info "=========================================="
log_info "Bootstrap completed successfully!"
log_info "=========================================="
echo ""
log_info "Summary:"
echo "  - Docker version: $(docker --version)"
echo "  - Docker Compose: $(docker compose version)"
echo "  - Deploy user: ${DEPLOY_USER}"
echo "  - Application directory: ${APP_DIR}"
echo ""
log_info "Next steps:"
echo "  1. Add your SSH public key to ${SSH_DIR}/authorized_keys"
echo "  2. Configure GitHub Secrets (see DEPLOY.md)"
echo "  3. Push to main branch to trigger deployment"
echo ""
log_info "To deploy as the '${DEPLOY_USER}' user, SSH with:"
echo "  ssh ${DEPLOY_USER}@YOUR_SERVER_IP"
echo ""
