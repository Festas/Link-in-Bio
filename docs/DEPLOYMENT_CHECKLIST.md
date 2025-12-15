# Deployment Checklist - Nginx Migration

This checklist ensures a successful deployment of the Link-in-Bio infrastructure with the new Nginx setup.

## Pre-Deployment Checklist

### DNS Configuration
- [ ] Verify all DNS A/AAAA records point to server IP:
  - [ ] festas-builds.com
  - [ ] admin.festas-builds.com
  - [ ] panel.festas-builds.com
  - [ ] mc.festas-builds.com
  - [ ] mc-map.festas-builds.com
  - [ ] mc-stats.festas-builds.com
  - [ ] cs.festas-builds.com
  - [ ] rigpilot.festas-builds.com
  - [ ] immocalc.festas-builds.com

### Server Setup
- [ ] Server accessible via SSH
- [ ] Firewall allows ports 22, 80, 443
- [ ] Docker and Docker Compose installed
- [ ] Nginx installed (`sudo apt install nginx`)
- [ ] Certbot installed (`sudo apt install certbot python3-certbot-nginx`)

### GitHub Secrets
Verify these secrets are configured in repository settings:
- [ ] `HOST` - Server IP address
- [ ] `USERNAME` - SSH username
- [ ] `SSH_PRIVATE_KEY` - SSH private key
- [ ] `ENV_FILE` - Content of .env file
- [ ] `INSTAGRAM_SECRET` - Instagram API credentials (optional)
- [ ] `TIKTOK_SECRET` - TikTok API credentials (optional)

## Initial Deployment Steps

### 1. Stop Existing Caddy (if running)

```bash
# SSH into server
ssh user@your-server

# Stop Caddy containers
cd /srv/link-in-bio
docker compose down caddy
docker stop caddy_server 2>/dev/null || true
docker rm caddy_server 2>/dev/null || true
```

### 2. Run Nginx Setup Script

```bash
# Clone/pull latest code
cd /srv/link-in-bio
git pull origin main

# Run setup script
sudo ./scripts/setup-nginx-ssl.sh
```

This script will:
- Install Nginx and Certbot
- Deploy all Nginx server blocks
- Obtain SSL certificates for all domains
- Configure auto-renewal

### 3. Deploy Docker Containers

The GitHub Actions workflow will automatically:
- Build and push Docker image
- Copy Nginx configurations
- Update docker-compose.yml
- Start containers with exposed ports
- Reload Nginx

**OR** manually:

```bash
cd /srv/link-in-bio

# Pull latest changes
git pull origin main

# Update .env and .env.social
# (GitHub secrets handle this in CI/CD)

# Start containers
docker compose pull
docker compose up -d

# Check status
docker compose ps
```

### 4. Deploy Pterodactyl Panel (if needed)

```bash
# Run Pterodactyl deployment workflow via GitHub Actions
# OR manually run the workflow steps
```

Note: Pterodactyl uses Nginx on the host with direct SSL via FastCGI to PHP-FPM, compatible with new setup.

## Post-Deployment Verification

### 1. Check Container Status

```bash
docker compose ps
```

Expected output: `linktree_app` running and healthy

### 2. Test Local Endpoints

```bash
# Test web service
curl -I http://127.0.0.1:8000/health
# Expected: HTTP/1.1 200 OK

# Test Pterodactyl (if deployed)
curl -I https://panel.festas-builds.com
# Expected: HTTP/1.1 200 OK or 302 redirect
```

### 3. Verify Nginx Configuration

```bash
sudo nginx -t
# Expected: syntax is ok, test is successful

sudo systemctl status nginx
# Expected: active (running)
```

### 4. Check SSL Certificates

```bash
sudo certbot certificates
```

Verify all 9 domains have valid certificates with expiry dates in the future.

### 5. Test External Access

Test each domain in a browser:
- https://festas-builds.com - Should load Link-in-Bio homepage
- https://admin.festas-builds.com - Should load admin login
- https://panel.festas-builds.com - Should load Pterodactyl panel (if deployed)
- https://mc.festas-builds.com - Should load Minecraft website
- https://mc-map.festas-builds.com - Should load BlueMap (if container running)
- https://mc-stats.festas-builds.com - Should load Plan Analytics (if container running)
- https://cs.festas-builds.com - Should load Cosmic Survivor (if container running)
- https://rigpilot.festas-builds.com - Should load RigPilot (if container running)
- https://immocalc.festas-builds.com - Should load ImmoCalc (if container running)

### 6. Check Nginx Logs

```bash
# Error log (should be minimal)
sudo tail -f /var/log/nginx/error.log

# Access logs per domain
sudo tail -f /var/log/nginx/festas-builds.com.access.log
```

## Troubleshooting Guide

### 502 Bad Gateway

**Symptom**: Browser shows "502 Bad Gateway"

**Diagnosis**:
```bash
# Check if container is running
docker compose ps

# Check if service is listening
netstat -tlnp | grep 8000

# Check container logs
docker compose logs web --tail=50
```

**Solution**:
- Ensure Docker container is running: `docker compose up -d`
- Verify port exposure in docker-compose.yml: `ports: - "127.0.0.1:8000:8000"`
- Check application logs for startup errors

### 503 Service Unavailable

**Symptom**: Browser shows "503 Service Unavailable"

**Diagnosis**:
```bash
# Check Nginx error logs
sudo tail -50 /var/log/nginx/error.log

# Check if upstream is reachable
curl -I http://127.0.0.1:8000
```

**Solution**:
- Restart Nginx: `sudo systemctl restart nginx`
- Check Nginx configuration: `sudo nginx -t`

### SSL Certificate Errors

**Symptom**: Browser shows "Your connection is not private" or certificate warnings

**Diagnosis**:
```bash
# Check certificate status
sudo certbot certificates

# Check certificate files
ls -la /etc/letsencrypt/live/festas-builds.com/
```

**Solution**:
- Renew certificates: `sudo certbot renew --force-renewal`
- Obtain missing certificate: `sudo certbot --nginx -d domain.com`
- Check DNS records are pointing to correct IP

### Port Already in Use

**Symptom**: Nginx fails to start with "port already in use" error

**Diagnosis**:
```bash
# Check what's using ports 80/443
sudo netstat -tlnp | grep ':80\|:443'
```

**Solution**:
- Stop conflicting service: `sudo systemctl stop apache2` or similar
- Change Docker port mapping if conflict with container

### Container Not Accessible

**Symptom**: Nginx can't reach Docker container (502 error)

**Diagnosis**:
```bash
# Test container accessibility
curl -v http://127.0.0.1:8000

# Check Docker network
docker network ls
docker network inspect linkinbio-network
```

**Solution**:
- Verify ports are exposed to 127.0.0.1 in docker-compose.yml
- Restart containers: `docker compose restart`
- Check firewall/iptables rules

## Maintenance Tasks

### Update SSL Certificates

Certbot automatically renews certificates. To manually renew:

```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal

# Reload Nginx after renewal
sudo systemctl reload nginx
```

### Update Nginx Configuration

```bash
# Edit configuration
sudo nano /etc/nginx/sites-available/festas-builds.com.conf

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Update Docker Containers

Automated via GitHub Actions on push to main branch.

Manual update:
```bash
cd /srv/link-in-bio
git pull origin main
docker compose pull
docker compose up -d
```

### View Logs

```bash
# Nginx error log
sudo tail -f /var/log/nginx/error.log

# Nginx access log (specific domain)
sudo tail -f /var/log/nginx/festas-builds.com.access.log

# Docker container logs
docker compose logs -f web

# All Docker logs
docker compose logs -f
```

### Restart Services

```bash
# Restart Nginx
sudo systemctl restart nginx

# Restart Docker containers
docker compose restart

# Restart specific container
docker compose restart web
```

## Rollback Procedure

If critical issues occur, rollback to Caddy:

1. **Restore Caddyfile**:
   ```bash
   cd /srv/link-in-bio
   git checkout e3c65f4 Caddyfile  # Use commit hash before migration
   ```

2. **Restore docker-compose.yml**:
   ```bash
   git checkout e3c65f4 docker-compose.yml
   ```

3. **Stop Nginx**:
   ```bash
   sudo systemctl stop nginx
   ```

4. **Start Caddy**:
   ```bash
   docker compose up -d
   ```

5. **Verify services**:
   ```bash
   docker compose ps
   curl https://festas-builds.com
   ```

## Additional Resources

- **Nginx Configuration**: `nginx/README.md`
- **Migration Guide**: `docs/NGINX_MIGRATION.md`
- **Setup Script**: `scripts/setup-nginx-ssl.sh`
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Certbot Documentation**: https://certbot.eff.org/docs/
- **Let's Encrypt Rate Limits**: https://letsencrypt.org/docs/rate-limits/

## Contact

For issues or questions, open an issue on GitHub or contact the infrastructure team.
