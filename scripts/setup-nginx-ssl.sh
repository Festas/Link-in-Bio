#!/usr/bin/env bash
#
# setup-nginx-ssl.sh - Setup Nginx and SSL certificates for Link-in-Bio infrastructure
#
# This script installs and configures Nginx, deploys server blocks, and obtains SSL certificates
# for all domains using Certbot/Let's Encrypt.
#
# Usage:
#   sudo ./scripts/setup-nginx-ssl.sh
#
# Requirements:
#   - Must be run as root (via sudo)
#   - DNS records must be pointing to this server
#   - Ports 80 and 443 must be open in firewall
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

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT="$SCRIPT_DIR/.."
cd "$REPO_ROOT"

# Default email for SSL certificates (can be overridden with environment variable)
CERT_EMAIL="${CERT_EMAIL:-admin@festas-builds.com}"

log_info "=========================================="
log_info "Nginx & SSL Setup for Link-in-Bio"
log_info "=========================================="
echo ""

# ==========================================
# 1. Install Nginx if not already installed
# ==========================================
log_info "Checking Nginx installation..."

if command -v nginx &> /dev/null; then
    log_info "Nginx is already installed: $(nginx -v 2>&1)"
else
    log_info "Installing Nginx..."
    apt-get update -qq
    apt-get install -y nginx
    log_info "Nginx installed: $(nginx -v 2>&1)"
fi

# Ensure Nginx is enabled and started
systemctl enable nginx
systemctl start nginx || systemctl restart nginx

# ==========================================
# 2. Install Certbot if not already installed
# ==========================================
log_info "Checking Certbot installation..."

if command -v certbot &> /dev/null; then
    log_info "Certbot is already installed: $(certbot --version 2>&1 | head -1)"
else
    log_info "Installing Certbot..."
    apt-get update -qq
    apt-get install -y certbot python3-certbot-nginx
    log_info "Certbot installed: $(certbot --version 2>&1 | head -1)"
fi

# ==========================================
# 3. Remove default Nginx configuration
# ==========================================
log_info "Removing default Nginx configurations..."

rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-available/default
rm -f /etc/nginx/conf.d/default.conf

log_info "✓ Default configurations removed"

# ==========================================
# 4. Deploy Nginx server blocks
# ==========================================
log_info "Deploying Nginx server blocks..."

if [[ ! -d "nginx/sites-available" ]]; then
    log_error "nginx/sites-available directory not found!"
    log_error "Please run this script from the repository root."
    exit 1
fi

NGINX_CONFIGS=$(find nginx/sites-available -name "*.conf" | wc -l)

if [[ $NGINX_CONFIGS -eq 0 ]]; then
    log_error "No Nginx configuration files found in nginx/sites-available/"
    exit 1
fi

log_info "Found $NGINX_CONFIGS Nginx configuration files"

# Copy all configurations
cp nginx/sites-available/*.conf /etc/nginx/sites-available/

# Enable all sites by creating symlinks
for conf in /etc/nginx/sites-available/*.festas-builds.com.conf; do
    if [[ -f "$conf" ]]; then
        confname=$(basename "$conf")
        ln -sf "../sites-available/$confname" "/etc/nginx/sites-enabled/$confname"
        log_info "  ✓ Enabled: $confname"
    fi
done

log_info "✓ All server blocks deployed"

# ==========================================
# 5. Test Nginx configuration
# ==========================================
log_info "Testing Nginx configuration..."

if nginx -t 2>&1; then
    log_info "✓ Nginx configuration test passed"
else
    log_error "Nginx configuration test failed!"
    nginx -t || true
    exit 1
fi

# ==========================================
# 6. Reload Nginx
# ==========================================
log_info "Reloading Nginx..."

if systemctl reload nginx; then
    log_info "✓ Nginx reloaded successfully"
else
    log_error "Failed to reload Nginx"
    systemctl status nginx || true
    exit 1
fi

# ==========================================
# 7. Obtain SSL certificates
# ==========================================
log_info ""
log_info "=========================================="
log_info "SSL Certificate Setup"
log_info "=========================================="
echo ""

# List of domains to obtain certificates for
DOMAINS=(
    "festas-builds.com"
    "admin.festas-builds.com"
    "panel.festas-builds.com"
    "mc.festas-builds.com"
    "mc-map.festas-builds.com"
    "mc-stats.festas-builds.com"
    "cs.festas-builds.com"
    "rigpilot.festas-builds.com"
    "immocalc.festas-builds.com"
)

log_warn "⚠ IMPORTANT: Before obtaining SSL certificates, ensure:"
log_warn "  1. DNS records for all domains point to this server"
log_warn "  2. Ports 80 and 443 are accessible from the internet"
log_warn "  3. Docker containers for each service are running and exposed to 127.0.0.1"
echo ""

read -p "Do you want to obtain SSL certificates now? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warn "Skipping SSL certificate setup"
    log_warn "To obtain certificates later, run:"
    log_warn "  sudo certbot --nginx -d festas-builds.com -d admin.festas-builds.com [...]"
    echo ""
    log_info "Setup completed (without SSL)"
    exit 0
fi

# Option to obtain all certificates at once or individually
echo ""
log_info "SSL Certificate Options:"
echo "  1) Obtain all certificates at once (recommended)"
echo "  2) Obtain certificates individually per domain"
echo "  3) Skip SSL setup for now"
echo ""
read -p "Choose an option (1-3): " -n 1 -r CERT_OPTION
echo ""

case $CERT_OPTION in
    1)
        # Obtain all certificates at once
        log_info "Obtaining SSL certificates for all domains..."
        
        DOMAIN_ARGS=""
        for domain in "${DOMAINS[@]}"; do
            DOMAIN_ARGS="$DOMAIN_ARGS -d $domain"
        done
        
        if certbot --nginx $DOMAIN_ARGS --non-interactive --agree-tos --email "$CERT_EMAIL"; then
            log_info "✓ SSL certificates obtained successfully"
        else
            log_error "Failed to obtain SSL certificates"
            log_warn "You may need to obtain certificates individually for troubleshooting"
            exit 1
        fi
        ;;
    
    2)
        # Obtain certificates individually
        log_info "Obtaining SSL certificates individually..."
        
        for domain in "${DOMAINS[@]}"; do
            log_info "Processing $domain..."
            
            if certbot --nginx -d "$domain" --non-interactive --agree-tos --email "$CERT_EMAIL"; then
                log_info "  ✓ Certificate obtained for $domain"
            else
                log_error "  ✗ Failed to obtain certificate for $domain"
                log_warn "  Continuing with remaining domains..."
            fi
        done
        ;;
    
    3)
        log_warn "Skipping SSL certificate setup"
        log_info "To obtain certificates later, run:"
        log_info "  sudo certbot --nginx -d festas-builds.com"
        echo ""
        log_info "Setup completed (without SSL)"
        exit 0
        ;;
    
    *)
        log_error "Invalid option"
        exit 1
        ;;
esac

# ==========================================
# 8. Verify SSL certificate auto-renewal
# ==========================================
log_info ""
log_info "Verifying SSL certificate auto-renewal..."

if systemctl is-enabled certbot.timer &> /dev/null; then
    log_info "✓ Certbot auto-renewal timer is enabled"
else
    log_warn "Certbot auto-renewal timer is not enabled"
    systemctl enable certbot.timer || log_error "Failed to enable certbot.timer"
fi

if systemctl is-active certbot.timer &> /dev/null; then
    log_info "✓ Certbot auto-renewal timer is active"
else
    log_warn "Certbot auto-renewal timer is not active"
    systemctl start certbot.timer || log_error "Failed to start certbot.timer"
fi

# Test renewal (dry run)
log_info "Testing certificate renewal (dry run)..."
if certbot renew --dry-run >/dev/null 2>&1; then
    log_info "✓ Certificate renewal test passed"
else
    log_warn "Certificate renewal test had issues"
    log_warn "Running detailed test..."
    certbot renew --dry-run 2>&1 | tail -10
fi

# ==========================================
# Final status
# ==========================================
echo ""
log_info "=========================================="
log_info "Setup Completed Successfully!"
log_info "=========================================="
echo ""

log_info "Summary:"
echo "  - Nginx: $(nginx -v 2>&1)"
echo "  - Certbot: $(certbot --version 2>&1 | head -1)"
echo "  - Server blocks deployed: $NGINX_CONFIGS"
echo "  - SSL certificates obtained"
echo ""

log_info "Certificate status:"
certbot certificates | head -30 || log_warn "Could not retrieve certificate info"

echo ""
log_info "Next steps:"
echo "  1. Ensure all Docker containers are running with ports exposed to 127.0.0.1"
echo "  2. Test all domains in a web browser"
echo "  3. Monitor Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo ""

log_info "Useful commands:"
echo "  - Test Nginx config: sudo nginx -t"
echo "  - Reload Nginx: sudo systemctl reload nginx"
echo "  - View certificates: sudo certbot certificates"
echo "  - Renew certificates: sudo certbot renew"
echo ""
