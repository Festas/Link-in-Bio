# Registry-Based Deployment Guide

This guide explains how to deploy the Link-in-Bio application to a Hetzner server using GitHub Container Registry (GHCR) and GitHub Actions.

## Overview

The deployment workflow:
1. Builds a Docker image from the repository
2. Pushes the image to GitHub Container Registry (ghcr.io)
3. SSHs into your Hetzner server
4. Pulls the image and starts the services
5. Runs database migrations

## Prerequisites

### Hetzner Server Requirements

- **OS**: Ubuntu 22.04 LTS or later recommended
- **Open Ports**: 22 (SSH), 80 (HTTP), 443 (HTTPS)
- **Docker**: Installed (or run bootstrap script once)
- **Minimum Specs**: 2GB RAM, 20GB disk recommended

### DNS Configuration

Configure your DNS provider with A records pointing to your Hetzner server IP:

| Type | Name | Value |
|------|------|-------|
| A | @ (root domain) | YOUR_SERVER_IP |
| A | admin | YOUR_SERVER_IP |

Allow 5-30 minutes for DNS propagation.

---

## Quick Start

### 1. Bootstrap Server (One-Time Setup)

SSH into your Hetzner server and run:

```bash
# Download and run bootstrap script
curl -fsSL https://raw.githubusercontent.com/Festas/Link-in-Bio/main/deploy/bootstrap.sh | sudo bash

# Or if you've cloned the repository:
sudo bash deploy/bootstrap.sh
```

This script will:
- Install Docker and docker-compose plugin
- Create a `deploy` user and add it to docker group
- Create `/srv/link-in-bio` directory with correct permissions
- Configure firewall rules (if UFW is available)

### 2. Configure SSH Access

Add your SSH public key to the deploy user:

```bash
# On your server
sudo -u deploy mkdir -p /home/deploy/.ssh
sudo nano /home/deploy/.ssh/authorized_keys
# Paste your public key and save
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

### 3. Configure GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add the following secrets:

#### Required Secrets

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `HETZNER_HOST` | Your Hetzner server IP address | `185.207.250.174` |
| `HETZNER_USER` | SSH username | `deploy` or `root` |
| `HETZNER_SSH_PRIVATE_KEY` | Full SSH private key content | (see below) |
| `DOMAIN` | Your domain name (without https://) | `festas-builds.com` |
| `ENV_FILE` | Main .env file contents | (see template below) |

#### Optional Secrets

| Secret Name | Description |
|-------------|-------------|
| `INSTAGRAM_SECRET` | Instagram API credentials |
| `TIKTOK_SECRET` | TikTok API credentials |

### SSH Private Key

To get your SSH private key:

```bash
# On your local machine
cat ~/.ssh/id_ed25519
# or
cat ~/.ssh/id_rsa
```

Copy the **entire content** including `-----BEGIN ... KEY-----` and `-----END ... KEY-----` lines.

### ENV_FILE Template

Create this as the `ENV_FILE` secret:

```env
# Admin Credentials (IMPORTANT: Use a strong password!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password_here

# Application Domain (without http/https)
APP_DOMAIN=your-domain.com

# Session configuration
SESSION_EXPIRY_HOURS=24

# Two-Factor Authentication
REQUIRE_2FA=false

# Default Profile Settings
DEFAULT_PROFILE_NAME=Your Name
DEFAULT_PROFILE_BIO=Your bio description

# Logging
LOG_LEVEL=INFO
JSON_LOGS=false
```

### 4. Trigger Deployment

Push to the `main` branch or manually trigger the workflow:

```bash
git push origin main
```

Or go to **Actions** → **Deploy to Hetzner via GHCR** → **Run workflow**

---

## What Gets Deployed

The deployment creates these files on the server at `/srv/link-in-bio/`:

```
/srv/link-in-bio/
├── docker-compose.yml    # Generated from workflow
├── Caddyfile             # Generated from DOMAIN secret
├── .env                  # From ENV_FILE secret
├── .env.social           # From INSTAGRAM_SECRET + TIKTOK_SECRET
├── data/                 # Persistent database storage
├── static/uploads/       # User uploads
├── caddy_data/          # Caddy certificates
└── caddy_config/        # Caddy configuration
```

---

## Verification Steps

After deployment, verify everything is working:

### Check Container Status

```bash
ssh deploy@YOUR_SERVER_IP
cd /srv/link-in-bio
docker compose ps
```

Expected output:
```
NAME            IMAGE                                    STATUS                  PORTS
caddy_server    caddy:latest                            Up X minutes            0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
linktree_app    ghcr.io/festas/link-in-bio:abc1234     Up X minutes (healthy)
```

### Check Logs

```bash
# All logs
docker compose logs -f

# Web container only
docker compose logs -f web

# Caddy only
docker compose logs -f caddy
```

### Test Endpoints

```bash
# Health check
curl -s https://your-domain.com/health
# Expected: {"status":"healthy","version":"..."}

# Main page
curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/
# Expected: 200

# Admin page
curl -s -o /dev/null -w "%{http_code}" https://admin.your-domain.com/
# Expected: 200
```

### Check Files

```bash
cd /srv/link-in-bio

# Check .env exists
cat .env

# Check databases
ls -la data/
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs web --tail=100

# Rebuild and restart
docker compose up -d --force-recreate
```

### SSL Certificate Issues

Caddy automatically provisions SSL certificates. If you see certificate errors:

1. Verify DNS is pointing to your server: `nslookup your-domain.com`
2. Check Caddy logs: `docker compose logs caddy`
3. Wait a few minutes for certificate provisioning

### Database Issues

```bash
# Initialize databases manually
docker compose exec web python init_databases.py

# Check database files
ls -la /srv/link-in-bio/data/
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R deploy:deploy /srv/link-in-bio
chmod 700 /srv/link-in-bio/data
chmod 600 /srv/link-in-bio/.env
```

### Docker Login Issues

If you see "unauthorized" errors when pulling images:

1. Ensure the repository packages are set to public, or
2. The `GITHUB_TOKEN` has `packages:read` permission

### DNS Not Resolving

1. Wait for DNS propagation (can take up to 48 hours)
2. Check DNS with: `dig your-domain.com`
3. Verify A records in your DNS provider

### Workflow Fails at SSH Step

1. Verify `HETZNER_HOST` is the correct IP
2. Verify `HETZNER_USER` can SSH into the server
3. Test SSH connection manually: `ssh -i private_key user@host`

---

## Secrets Reference

| Secret | Required | Description |
|--------|----------|-------------|
| `HETZNER_HOST` | Yes | Server IP address |
| `HETZNER_USER` | Yes | SSH username (`deploy` or `root`) |
| `HETZNER_SSH_PRIVATE_KEY` | Yes | Full SSH private key |
| `DOMAIN` | Yes | Your domain (e.g., `festas-builds.com`) |
| `ENV_FILE` | Yes | Complete .env file contents |
| `INSTAGRAM_SECRET` | No | Instagram API credentials |
| `TIKTOK_SECRET` | No | TikTok API credentials |

---

## Security Notes

- **Never commit secrets** to the repository
- All secrets are passed via GitHub Secrets → SSH environment variables
- `.env` files on the server have `chmod 600` permissions
- The workflow uses `GITHUB_TOKEN` for GHCR authentication (no PAT required)
- Consider using a dedicated `deploy` user instead of `root`

---

## Manual Deployment (Alternative)

If you need to deploy manually without GitHub Actions:

```bash
# SSH into server
ssh deploy@YOUR_SERVER_IP
cd /srv/link-in-bio

# Login to GHCR (use a GitHub PAT with packages:read scope)
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Pull latest image
docker pull ghcr.io/festas/link-in-bio:latest

# Update docker-compose.yml to use the image
# Then restart
docker compose up -d --remove-orphans
```

---

## Useful Commands

```bash
# SSH to server
ssh deploy@YOUR_SERVER_IP

# Navigate to app directory
cd /srv/link-in-bio

# View running containers
docker compose ps

# View logs
docker compose logs -f

# Restart containers
docker compose restart

# Stop containers
docker compose down

# Start containers
docker compose up -d

# Enter web container
docker compose exec web bash

# Run migrations
docker compose exec web python init_databases.py

# Clean up old images
docker image prune -f
```

---

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review GitHub Actions workflow logs
3. Check container logs on the server
4. Consult the [Architecture documentation](./docs/ARCHITECTURE.md)
