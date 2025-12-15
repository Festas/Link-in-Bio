# Nginx Migration Guide

This document describes the migration from Caddy to Nginx for the Link-in-Bio infrastructure.

## Overview

The infrastructure has been migrated from a Dockerized Caddy reverse proxy to Nginx running on the host server. This change provides:

- **Direct control**: Nginx runs on the host with full system access
- **Standard tooling**: Industry-standard Nginx configuration
- **Flexibility**: Easier to customize and troubleshoot
- **SSL management**: Certbot/Let's Encrypt integration

## Architecture Changes

### Before (Caddy)
```
Internet → Caddy Container (ports 80/443) → Docker containers (internal network)
```

### After (Nginx)
```
Internet → Nginx (host, ports 80/443) → Docker containers (127.0.0.1:xxxx)
```

## Port Mappings

Docker containers now expose ports to `127.0.0.1` instead of using an internal network:

| Service | Container Port | Host Port | Domain |
|---------|---------------|-----------|---------|
| Link-in-Bio Web | 8000 | 127.0.0.1:8000 | festas-builds.com, admin.festas-builds.com |
| Pterodactyl Panel | - | 127.0.0.1:8081 | panel.festas-builds.com |
| Minecraft Web | 80 | 127.0.0.1:8100 | mc.festas-builds.com |
| Minecraft Console | 3001 | 127.0.0.1:3001 | mc.festas-builds.com (/console, /api) |
| BlueMap | 8100 | 127.0.0.1:8101 | mc-map.festas-builds.com |
| Plan Analytics | 8804 | 127.0.0.1:8804 | mc-stats.festas-builds.com |
| Cosmic Survivor | 80 | 127.0.0.1:8200 | cs.festas-builds.com |
| RigPilot | 3000 | 127.0.0.1:3000 | rigpilot.festas-builds.com |
| ImmoCalc | 3000 | 127.0.0.1:3100 | immocalc.festas-builds.com |

## Migration Steps

### 1. Install Nginx and Certbot

```bash
# Run the automated setup script
sudo ./scripts/setup-nginx-ssl.sh

# Or manually:
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Deploy Nginx Configurations

Nginx server blocks are in `nginx/sites-available/`:

```bash
# Copy configurations
sudo cp nginx/sites-available/*.conf /etc/nginx/sites-available/

# Enable all sites
cd /etc/nginx/sites-enabled
for conf in /etc/nginx/sites-available/*.festas-builds.com.conf; do
    sudo ln -sf "$conf" .
done

# Remove default config
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 3. Obtain SSL Certificates

```bash
# Option 1: All domains at once
sudo certbot --nginx \
  -d festas-builds.com \
  -d admin.festas-builds.com \
  -d panel.festas-builds.com \
  -d mc.festas-builds.com \
  -d mc-map.festas-builds.com \
  -d mc-stats.festas-builds.com \
  -d cs.festas-builds.com \
  -d rigpilot.festas-builds.com \
  -d immocalc.festas-builds.com

# Option 2: Individual domains
sudo certbot --nginx -d festas-builds.com
sudo certbot --nginx -d admin.festas-builds.com
# ... repeat for each domain
```

### 4. Update Docker Compose

The main Link-in-Bio `docker-compose.yml` has been updated to:
- Remove the Caddy service
- Expose web container port to `127.0.0.1:8000`
- Remove Caddy-specific networks and volumes

For external services (Minecraft, RigPilot, ImmoCalc, etc.), update their docker-compose files:

```yaml
services:
  your-service:
    # ... existing config ...
    ports:
      - "127.0.0.1:<host-port>:<container-port>"
```

### 5. Stop and Remove Caddy

```bash
# Stop the Caddy container
docker stop caddy_server
docker rm caddy_server

# Remove Caddy volumes (optional, after verifying SSL works)
docker volume rm linkinbio_caddy_data linkinbio_caddy_config
```

### 6. Restart Services

```bash
# Restart Link-in-Bio
cd /srv/link-in-bio
docker compose down
docker compose up -d

# Verify containers are running
docker compose ps

# Check Nginx is serving correctly
curl -I http://127.0.0.1:8000/health
curl -I https://festas-builds.com
```

## Configuration Reference

### Security Headers

All Nginx configurations include security headers equivalent to Caddy:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

Pterodactyl Panel has stricter headers:
```nginx
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "same-origin" always;
```

### Cache Headers

Equivalent caching strategies have been implemented:

- **Static assets**: `max-age=31536000, immutable` (images, fonts, etc.)
- **Next.js static**: `max-age=31536000, immutable` (`/_next/static/`)
- **Console assets**: `max-age=0, must-revalidate` (CSS/JS in /console/)
- **Console HTML**: `no-cache, no-store, must-revalidate`
- **BlueMap tiles**: `max-age=3600`

### WebSocket Support

WebSocket support is configured for real-time features (Minecraft console):

```nginx
location /socket.io {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    # ... other headers
}
```

## SSL Certificate Management

### Auto-Renewal

Certbot automatically sets up a systemd timer for certificate renewal:

```bash
# Check timer status
sudo systemctl status certbot.timer

# Test renewal (dry run)
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
```

### Adding a New Domain

1. Create Nginx configuration in `nginx/sites-available/`
2. Copy to `/etc/nginx/sites-available/`
3. Enable: `sudo ln -s /etc/nginx/sites-available/newdomain.conf /etc/nginx/sites-enabled/`
4. Test: `sudo nginx -t`
5. Reload: `sudo systemctl reload nginx`
6. Obtain certificate: `sudo certbot --nginx -d newdomain.festas-builds.com`

## Troubleshooting

### 502 Bad Gateway

The upstream service isn't running or accessible:

```bash
# Check if Docker container is running
docker ps

# Check if service is listening on expected port
netstat -tlnp | grep <port>

# Test connectivity
curl -I http://127.0.0.1:<port>

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# View certificate details
sudo certbot certificates | grep -A 10 "festas-builds.com"

# Renew specific certificate
sudo certbot renew --cert-name festas-builds.com

# Force renewal
sudo certbot renew --force-renewal
```

### Nginx Configuration Errors

```bash
# Test configuration
sudo nginx -t

# View detailed error
sudo nginx -t 2>&1 | less

# Check syntax of specific file
sudo nginx -t -c /etc/nginx/sites-available/festas-builds.com.conf
```

### Port Conflicts

```bash
# Check what's using port 80/443
sudo netstat -tlnp | grep ':80\|:443'

# Check if another web server is running
sudo systemctl status apache2
sudo systemctl status lighttpd

# Stop conflicting services
sudo systemctl stop apache2
```

## Deployment Workflow

The GitHub Actions workflow (`.github/workflows/deploy.yml`) has been updated to:

1. Copy Nginx configurations to server
2. Deploy configs to `/etc/nginx/sites-available/`
3. Enable sites by creating symlinks
4. Test Nginx configuration (`nginx -t`)
5. Reload Nginx (`systemctl reload nginx`)
6. Update docker-compose.yml without Caddy
7. Start/restart Docker containers with exposed ports

## Rollback Procedure

If you need to rollback to Caddy:

1. Restore `Caddyfile` from git history
2. Restore original `docker-compose.yml` with Caddy service
3. Stop Nginx: `sudo systemctl stop nginx`
4. Start Caddy: `docker compose up -d caddy`
5. Verify services are accessible

## Monitoring

### Nginx Status

```bash
# Service status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# View error log
sudo tail -f /var/log/nginx/error.log

# View access logs for specific domain
sudo tail -f /var/log/nginx/festas-builds.com.access.log
```

### SSL Certificate Status

```bash
# List all certificates
sudo certbot certificates

# Check expiration
sudo certbot certificates | grep "Expiry Date"

# View renewal timer
sudo systemctl status certbot.timer
```

### Container Connectivity

```bash
# Test each exposed port
curl -I http://127.0.0.1:8000/health  # Link-in-Bio
curl -I http://127.0.0.1:8081         # Pterodactyl
curl -I http://127.0.0.1:8100         # Minecraft Web
curl -I http://127.0.0.1:3001         # Minecraft Console
```

## Resources

- Nginx configuration files: `nginx/sites-available/*.conf`
- Setup script: `scripts/setup-nginx-ssl.sh`
- Nginx documentation: https://nginx.org/en/docs/
- Certbot documentation: https://certbot.eff.org/docs/
- Let's Encrypt rate limits: https://letsencrypt.org/docs/rate-limits/
