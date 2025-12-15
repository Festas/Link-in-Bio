# Nginx Configuration for Link-in-Bio Infrastructure

This directory contains Nginx server block configurations for all domains in the Link-in-Bio infrastructure. Nginx runs on the host server and proxies to Dockerized applications.

## Subdomain to Port Mapping

| Subdomain | Service | Container/Port | Local Port |
|-----------|---------|----------------|------------|
| festas-builds.com | Main Link-in-Bio site | `web:8000` | `127.0.0.1:8000` |
| admin.festas-builds.com | Admin interface | `web:8000` | `127.0.0.1:8000` |
| panel.festas-builds.com | Pterodactyl Panel | PHP-FPM (FastCGI) | - |
| mc.festas-builds.com | Minecraft Website + Console | `minecraft-web:80`, `minecraft-console:3001` | `127.0.0.1:8100`, `127.0.0.1:3001` |
| mc-map.festas-builds.com | BlueMap (3D Map) | `minecraft-server:8100` | `127.0.0.1:8101` |
| mc-stats.festas-builds.com | Plan Analytics | `minecraft-server:8804` | `127.0.0.1:8804` |
| cs.festas-builds.com | Cosmic Survivor Game | `cosmic-survivor:80` | `127.0.0.1:8200` |
| rigpilot.festas-builds.com | RigPilot PC Builder | `rigpilot:3000` | `127.0.0.1:3000` |
| immocalc.festas-builds.com | ImmoCalc Calculator | `immocalc:3000` | `127.0.0.1:3100` |

## Installation

### 1. Copy Configuration Files

```bash
# Copy all server blocks to sites-available
sudo cp nginx/sites-available/*.conf /etc/nginx/sites-available/

# Enable all sites by creating symlinks
cd /etc/nginx/sites-enabled
sudo ln -sf ../sites-available/festas-builds.com.conf .
sudo ln -sf ../sites-available/admin.festas-builds.com.conf .
sudo ln -sf ../sites-available/panel.festas-builds.com.conf .
sudo ln -sf ../sites-available/mc.festas-builds.com.conf .
sudo ln -sf ../sites-available/mc-map.festas-builds.com.conf .
sudo ln -sf ../sites-available/mc-stats.festas-builds.com.conf .
sudo ln -sf ../sites-available/cs.festas-builds.com.conf .
sudo ln -sf ../sites-available/rigpilot.festas-builds.com.conf .
sudo ln -sf ../sites-available/immocalc.festas-builds.com.conf .

# Remove default Nginx config to prevent conflicts
sudo rm -f /etc/nginx/sites-enabled/default
```

### 2. Test Configuration

```bash
# Test Nginx configuration syntax
sudo nginx -t

# If successful, reload Nginx
sudo systemctl reload nginx
```

## SSL Certificate Setup with Certbot

### Initial Setup

```bash
# Install Certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificates for all domains
sudo certbot --nginx -d festas-builds.com
sudo certbot --nginx -d admin.festas-builds.com
sudo certbot --nginx -d panel.festas-builds.com
sudo certbot --nginx -d mc.festas-builds.com
sudo certbot --nginx -d mc-map.festas-builds.com
sudo certbot --nginx -d mc-stats.festas-builds.com
sudo certbot --nginx -d cs.festas-builds.com
sudo certbot --nginx -d rigpilot.festas-builds.com
sudo certbot --nginx -d immocalc.festas-builds.com

# Or obtain all certificates at once
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
```

### Auto-Renewal

Certbot automatically sets up a systemd timer for certificate renewal. Verify it's enabled:

```bash
# Check renewal timer status
sudo systemctl status certbot.timer

# Test renewal (dry run)
sudo certbot renew --dry-run

# Force renewal if needed
sudo certbot renew --force-renewal
```

## Docker Compose Port Exposure

Update your `docker-compose.yml` to expose container ports to `127.0.0.1`:

```yaml
services:
  web:
    # ... existing config ...
    ports:
      - "127.0.0.1:8000:8000"

  # For external services that need to join the network:
  # minecraft-web, minecraft-console, cosmic-survivor, rigpilot, immocalc
  # These should expose their ports similarly:
  # ports:
  #   - "127.0.0.1:<host-port>:<container-port>"
```

## Adding a New Domain

1. **Create Nginx configuration**: Copy an existing config in `nginx/sites-available/` and modify it for your new domain
2. **Enable the site**: Create symlink in `/etc/nginx/sites-enabled/`
3. **Test configuration**: Run `sudo nginx -t`
4. **Obtain SSL certificate**: Run `sudo certbot --nginx -d newdomain.festas-builds.com`
5. **Reload Nginx**: Run `sudo systemctl reload nginx`
6. **Update Docker Compose**: Expose the container port to `127.0.0.1` if needed

## Troubleshooting

### Check Nginx Status
```bash
sudo systemctl status nginx
sudo nginx -t
```

### View Nginx Logs
```bash
# Error logs
sudo tail -f /var/log/nginx/error.log

# Access logs for specific domain
sudo tail -f /var/log/nginx/festas-builds.com.access.log
```

### Check SSL Certificate Status
```bash
sudo certbot certificates
```

### Test Port Connectivity
```bash
# Test if service is listening on localhost port
curl -I http://127.0.0.1:8000

# Test external connectivity
curl -I https://festas-builds.com
```

### Common Issues

1. **502 Bad Gateway**: The upstream service isn't running or the port mapping is incorrect
   - Check if Docker containers are running: `docker ps`
   - Verify port exposure in docker-compose.yml
   - Check if service is listening: `netstat -tlnp | grep <port>`

2. **Certificate errors**: Certificates not found or expired
   - Run `sudo certbot renew`
   - Check certificate paths match those in Nginx configs

3. **Port conflicts**: Another service is using port 80/443
   - Check what's using the port: `sudo netstat -tlnp | grep :80`
   - Stop conflicting services

## Security Headers

All configurations include:
- `X-Frame-Options`: Protects against clickjacking
- `X-Content-Type-Options`: Prevents MIME type sniffing
- `X-XSS-Protection`: Enables browser XSS protection
- `Referrer-Policy`: Controls referrer information

Pterodactyl panel has stricter headers with `X-Frame-Options: DENY` and `Referrer-Policy: same-origin`.

## Caching Strategy

- **Static assets** (images, fonts, etc.): `max-age=31536000, immutable` (1 year)
- **Next.js static builds** (`/_next/static/`): `max-age=31536000, immutable`
- **Console assets** (CSS/JS): `max-age=0, must-revalidate` (revalidation-based)
- **Console HTML**: `no-cache, no-store, must-revalidate` (never cached)
- **BlueMap tiles**: `max-age=3600` (1 hour)

## Migration Notes

This configuration replaces the previous Caddy-based reverse proxy. Key differences:

1. **SSL Management**: Manual Certbot setup replaces Caddy's automatic ACME
2. **Configuration Format**: Nginx directives replace Caddyfile syntax
3. **Port Exposure**: Docker containers must explicitly expose ports to `127.0.0.1`
4. **Reloading**: Use `sudo systemctl reload nginx` instead of `docker compose exec caddy caddy reload`

## Deployment

These configurations are deployed automatically via GitHub Actions workflow (`.github/workflows/deploy.yml`). Manual deployment steps:

```bash
# Copy configs
sudo cp nginx/sites-available/*.conf /etc/nginx/sites-available/

# Test and reload
sudo nginx -t && sudo systemctl reload nginx

# Obtain/renew certificates
sudo certbot --nginx -d festas-builds.com # ... (repeat for all domains)
```
