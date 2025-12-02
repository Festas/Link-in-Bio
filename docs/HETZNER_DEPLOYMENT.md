# Hetzner Server Deployment Guide

This guide walks you through the complete setup process for deploying the Link-in-Bio application on a Hetzner server.

## Prerequisites

- A Hetzner Cloud account with a running Ubuntu server (22.04 or later recommended)
- A domain name pointing to your server's IP address
- GitHub repository with this codebase
- Basic knowledge of SSH and command line

## Table of Contents

1. [Server Setup](#1-server-setup)
2. [Docker Installation](#2-docker-installation)
3. [DNS Configuration](#3-dns-configuration)
4. [GitHub Secrets](#4-github-secrets)
5. [First Deployment](#5-first-deployment)
6. [Security Configuration](#6-security-configuration)
7. [Verification Steps](#7-verification-steps)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Server Setup

### Connect to your server

```bash
ssh root@YOUR_SERVER_IP
```

### Update the system

```bash
apt update && apt upgrade -y
```

### Create deployment directory

```bash
mkdir -p /lib
mkdir -p /lib/data
mkdir -p /lib/static/uploads
```

> **Note:** The application is deployed to `/lib` (lib = Link in Bio)

---

## 2. Docker Installation

### Install Docker and Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verify installation
docker --version
docker compose version
```

### Enable Docker to start on boot

```bash
systemctl enable docker
systemctl start docker
```

---

## 3. DNS Configuration

### Main domain

Add an **A record** for your main domain pointing to your server:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ (or your domain) | YOUR_SERVER_IP | 3600 |

### Admin subdomain (optional but recommended)

Add an **A record** for the admin subdomain:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | admin | YOUR_SERVER_IP | 3600 |

### Verify DNS propagation

```bash
# From your local machine or server
nslookup your-domain.com
nslookup admin.your-domain.com

# Or use online tools:
# - https://dnschecker.org
# - https://whatsmydns.net
```

---

## 4. GitHub Secrets

Go to your repository on GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add the following secrets:

### Required Secrets

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `HOST` | Your server IP (e.g., `185.207.250.174`) | Hetzner server IP address |
| `USERNAME` | `root` (or your SSH user) | SSH username |
| `SSH_PRIVATE_KEY` | Your SSH private key content | Full content of `~/.ssh/id_rsa` or `id_ed25519` |
| `ENV_FILE` | See template below | Main environment configuration |

### ENV_FILE Template

Copy and customize this template for your `ENV_FILE` secret:

```env
# Admin Credentials (IMPORTANT: Use a strong password!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password_here

# For enhanced security, use a hashed password:
# Generate with: python -c "from app.auth_unified import hash_password; print(hash_password('your-password'))"
# ADMIN_PASSWORD_HASH=

# Application Domain (without http/https)
APP_DOMAIN=your-domain.com

# Session configuration
SESSION_EXPIRY_HOURS=24

# Two-Factor Authentication (recommended for production)
REQUIRE_2FA=false

# Default Profile Settings
DEFAULT_PROFILE_NAME=Your Name
DEFAULT_PROFILE_BIO=Your bio description here

# Logging (recommended for production)
LOG_LEVEL=INFO
JSON_LOGS=false

# Redis Cache (optional, for better performance)
REDIS_ENABLED=false
```

### Optional Secrets (for social media stats)

| Secret Name | Description |
|-------------|-------------|
| `INSTAGRAM_SECRET` | Instagram API credentials for fetching stats |
| `TIKTOK_SECRET` | TikTok API credentials for fetching stats |

---

## 5. First Deployment

### Option A: Automatic Deployment (Recommended)

Push to the `main` branch to trigger automatic deployment:

```bash
git push origin main
```

The GitHub Actions workflow will:
1. Stop existing containers
2. Backup persistent data (databases, uploads, .env files)
3. Copy new files to the server
4. Create/update .env files from secrets
5. Build and start Docker containers
6. Verify containers are running

### Option B: Manual Deployment

If you prefer manual deployment:

```bash
# On your server
cd /lib

# Clone or update repository (first time only)
git clone https://github.com/YOUR_USERNAME/Link-in-Bio.git .

# Or pull latest changes
git pull

# Create .env file (copy and edit from .env.example)
cp .env.example .env
nano .env

# Create empty .env.social file (required by docker-compose)
touch .env.social

# Build and start
docker compose up -d --build
```

---

## 6. Security Configuration

### Generate a secure password hash

```bash
# On your server, enter the running container
docker exec -it linktree_app python -c "from app.auth_unified import hash_password; print(hash_password('YourSecurePassword123!'))"
```

Update your `ENV_FILE` secret with the generated hash:

```env
ADMIN_PASSWORD_HASH=$2b$12$...your-generated-hash...
```

### Enable Two-Factor Authentication

Update your `ENV_FILE` secret:

```env
REQUIRE_2FA=true
```

### Update Caddyfile with your domain

Edit `Caddyfile` in your repository before deployment:

```caddyfile
# Main domain - public-facing Link-in-Bio site
your-domain.com {
    reverse_proxy linktree:8000
}

# Admin subdomain - administrative interface
admin.your-domain.com {
    reverse_proxy linktree:8000
}
```

---

## 7. Verification Steps

### Check container status

```bash
ssh root@YOUR_SERVER_IP
docker compose -f /lib/docker-compose.yml ps
```

Expected output:
```
NAME                IMAGE               STATUS              PORTS
caddy_server        caddy:latest        Up X minutes        0.0.0.0:8080->80/tcp, 0.0.0.0:8443->443/tcp
linktree_app        lib-linktree        Up X minutes (healthy)
```

### Check health endpoint

```bash
curl -s https://your-domain.com/health
# Expected: {"status":"healthy","version":"1.1.0"}
```

### Test all major endpoints

```bash
# Main pages
curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/       # 200
curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/admin  # 200
curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/login  # 200
curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/mediakit # 200

# Special pages
curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/impressum    # 200
curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/datenschutz  # 200
curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/ueber-mich   # 200
curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/kontakt      # 200

# API endpoints
curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/api/settings # 200
curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/api/items    # 200

# Admin subdomain (if configured)
curl -s https://admin.your-domain.com/status | jq .
```

### View container logs

```bash
# All logs
docker compose -f /lib/docker-compose.yml logs -f

# Only linktree app logs
docker compose -f /lib/docker-compose.yml logs -f linktree

# Only Caddy logs
docker compose -f /lib/docker-compose.yml logs -f caddy
```

---

## 8. Troubleshooting

### Container won't start

```bash
# Check logs for errors
docker compose -f /lib/docker-compose.yml logs linktree --tail=50

# Rebuild container
docker compose -f /lib/docker-compose.yml up -d --build --force-recreate
```

### SSL certificate issues

```bash
# Check Caddy logs
docker compose -f /lib/docker-compose.yml logs caddy --tail=50

# Caddy automatically handles SSL, wait a few minutes after first deploy
```

### Database issues

```bash
# Initialize databases manually
docker exec -it linktree_app python init_databases.py

# Check database files exist
ls -la /lib/data/
```

### Permission issues

```bash
# Fix permissions on data directories
chown -R 1000:1000 /lib/data
chown -R 1000:1000 /lib/static/uploads
chmod -R 755 /lib/data
chmod -R 755 /lib/static/uploads
```

### .env file issues

```bash
# Check if .env exists and has correct content
cat /lib/.env

# Create empty .env.social if missing (required by docker-compose)
touch /lib/.env.social
chmod 600 /lib/.env.social
```

### Port conflicts

```bash
# Check what's using ports 8080 and 8443
netstat -tlnp | grep -E ':(8080|8443)'

# Note: The application uses ports 8080 (HTTP) and 8443 (HTTPS) to avoid
# conflicts with other services that may be using standard ports 80/443.
# Stop conflicting services if needed (e.g., Apache, nginx)
systemctl stop apache2 nginx || true
```

---

## Summary Checklist

Before going live, verify:

- [ ] Server is running and accessible via SSH
- [ ] Docker and Docker Compose are installed
- [ ] DNS A records point to server IP (main domain + admin subdomain)
- [ ] GitHub Secrets are configured (HOST, USERNAME, SSH_PRIVATE_KEY, ENV_FILE)
- [ ] Caddyfile has been updated with your domain
- [ ] First deployment completed successfully
- [ ] Health endpoint returns `{"status":"healthy","version":"1.1.0"}`
- [ ] All major pages load correctly (/, /admin, /login, /mediakit, etc.)
- [ ] Admin login works with your credentials
- [ ] SSL certificate is valid (green lock in browser)

---

## Useful Commands Reference

```bash
# SSH to server
ssh root@YOUR_SERVER_IP

# View running containers
docker compose -f /lib/docker-compose.yml ps

# View logs
docker compose -f /lib/docker-compose.yml logs -f

# Restart containers
docker compose -f /lib/docker-compose.yml restart

# Stop containers
docker compose -f /lib/docker-compose.yml down

# Start containers
docker compose -f /lib/docker-compose.yml up -d

# Rebuild and start
docker compose -f /lib/docker-compose.yml up -d --build --force-recreate

# Enter container shell
docker exec -it linktree_app bash

# Clean up old Docker images
docker image prune -f
docker system prune -f
```

---

## Support

If you encounter issues:

1. Check container logs: `docker compose logs -f`
2. Review the [troubleshooting section](#8-troubleshooting)
3. Consult the [Admin Subdomain Setup Guide](./ADMIN_SUBDOMAIN_SETUP.md) for subdomain issues
4. Check the [Architecture documentation](./ARCHITECTURE.md) for technical details
