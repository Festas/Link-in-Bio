# External Services Port Configuration

This document describes the port configuration required for external Docker services that are not part of the main Link-in-Bio docker-compose.yml but need to be accessible via Nginx.

## Overview

The main Link-in-Bio application (`web` container) is the only service defined in the repository's docker-compose.yml. All other services (Minecraft, RigPilot, ImmoCalc, Cosmic Survivor, Pterodactyl) are deployed separately and need to expose ports to `127.0.0.1` for Nginx to proxy to them.

## Required Port Mappings

| Service | Container Name | Internal Port | Required Host Port | Domain |
|---------|---------------|---------------|-------------------|---------|
| Link-in-Bio Web | `linktree_app` | 8000 | 127.0.0.1:8000 | festas-builds.com, admin.festas-builds.com |
| Pterodactyl Panel | - | - | Direct (FastCGI) | panel.festas-builds.com |
| Minecraft Web | `minecraft-web` | 80 | 127.0.0.1:8100 | mc.festas-builds.com |
| Minecraft Console | `minecraft-console` | 3001 | 127.0.0.1:3001 | mc.festas-builds.com (/console, /api) |
| BlueMap | `minecraft-server` | 8100 | 127.0.0.1:8101 | mc-map.festas-builds.com |
| Plan Analytics | `minecraft-server` | 8804 | 127.0.0.1:8804 | mc-stats.festas-builds.com |
| Cosmic Survivor | `cosmic-survivor` | 80 | 127.0.0.1:8200 | cs.festas-builds.com |
| RigPilot | `rigpilot` | 3000 | 127.0.0.1:3000 | rigpilot.festas-builds.com |
| ImmoCalc | `immocalc` | 3000 | 127.0.0.1:3100 | immocalc.festas-builds.com |

## Docker Compose Configuration Examples

### Example 1: Minecraft Services

If your Minecraft server has a separate docker-compose.yml, update it like this:

```yaml
version: "3.8"
services:
  minecraft-server:
    # ... existing config ...
    ports:
      # BlueMap
      - "127.0.0.1:8101:8100"
      # Plan Analytics
      - "127.0.0.1:8804:8804"
      # Minecraft server (game)
      - "25565:25565"
  
  minecraft-web:
    # ... existing config ...
    ports:
      - "127.0.0.1:8100:80"
  
  minecraft-console:
    # ... existing config ...
    ports:
      - "127.0.0.1:3001:3001"
```

### Example 2: RigPilot (Next.js)

```yaml
version: "3.8"
services:
  rigpilot:
    # ... existing config ...
    ports:
      - "127.0.0.1:3000:3000"
```

### Example 3: ImmoCalc (Next.js)

```yaml
version: "3.8"
services:
  immocalc:
    # ... existing config ...
    ports:
      # Using port 3100 on host to avoid conflict with RigPilot
      - "127.0.0.1:3100:3000"
```

### Example 4: Cosmic Survivor

```yaml
version: "3.8"
services:
  cosmic-survivor:
    # ... existing config ...
    ports:
      - "127.0.0.1:8200:80"
```

## Important Notes

### Security
- **Always bind to 127.0.0.1**: This ensures services are only accessible from localhost, not from external networks
- **Never use 0.0.0.0**: This would expose services directly to the internet, bypassing Nginx security features

### Port Conflicts
- Check for port conflicts before starting containers:
  ```bash
  netstat -tlnp | grep 127.0.0.1
  ```
- Each service must use a unique host port
- Container ports can be the same (e.g., multiple containers using port 80 internally)

### Network Configuration
- Services do NOT need to join a shared network with Nginx (unlike with Caddy)
- Services only need to expose ports to the host's localhost
- Nginx running on the host can access any service on 127.0.0.1

## Migration from Caddy Network

### Before (Caddy)
Services joined the `caddy-network` Docker network:

```yaml
services:
  your-service:
    networks:
      - caddy-network

networks:
  caddy-network:
    external: true
```

### After (Nginx)
Services expose ports to localhost instead:

```yaml
services:
  your-service:
    ports:
      - "127.0.0.1:<host-port>:<container-port>"
    # No networks section needed unless services need to talk to each other
```

## Verification Commands

### Check if Port is Listening

```bash
# Check if service is listening on expected port
netstat -tlnp | grep 127.0.0.1:8000

# Alternative using ss
ss -tlnp | grep 127.0.0.1:8000

# Test connectivity
curl -I http://127.0.0.1:8000
```

### Check Port Availability Before Starting

```bash
# Check if port is already in use
sudo lsof -i :8000
# If empty, port is available
```

### List All Localhost Ports

```bash
# Show all services listening on 127.0.0.1
netstat -tlnp | grep 127.0.0.1
```

## Troubleshooting

### "Connection Refused" from Nginx

**Problem**: Nginx shows "Connection refused" when trying to reach upstream

**Check**:
1. Is the Docker container running?
   ```bash
   docker ps | grep <container-name>
   ```

2. Is the port exposed to 127.0.0.1?
   ```bash
   docker port <container-name>
   ```

3. Is the service listening inside the container?
   ```bash
   docker exec <container-name> netstat -tlnp
   ```

**Solution**: Update docker-compose.yml to expose the port to 127.0.0.1

### Port Already in Use

**Problem**: Docker fails to start with "port is already allocated"

**Check**:
```bash
sudo lsof -i :<port-number>
```

**Solution**: 
- Stop the conflicting service
- Choose a different host port
- Update both docker-compose.yml and Nginx configuration

### Service Accessible Externally

**Problem**: Service can be accessed directly without going through Nginx

**Check**:
```bash
# Should return nothing (timeout)
curl http://<server-ip>:8000

# Should work
curl http://127.0.0.1:8000
```

**Solution**: Ensure port is bound to 127.0.0.1, not 0.0.0.0:
```yaml
ports:
  - "127.0.0.1:8000:8000"  # ✓ Correct
  # NOT: "8000:8000"        # ✗ Wrong - exposes to all interfaces
```

## Deployment Workflow

When deploying a new external service:

1. **Create/update docker-compose.yml** with correct port exposure
2. **Create Nginx server block** in `nginx/sites-available/`
3. **Copy to server** and enable:
   ```bash
   sudo cp new-domain.conf /etc/nginx/sites-available/
   sudo ln -s /etc/nginx/sites-available/new-domain.conf /etc/nginx/sites-enabled/
   ```
4. **Test Nginx config**: `sudo nginx -t`
5. **Obtain SSL certificate**: `sudo certbot --nginx -d new-domain.festas-builds.com`
6. **Reload Nginx**: `sudo systemctl reload nginx`
7. **Start Docker container**: `docker compose up -d`
8. **Test access**: `curl https://new-domain.festas-builds.com`

## Security Best Practices

1. **Localhost Only**: Always bind to 127.0.0.1, never 0.0.0.0
2. **Firewall**: Ensure firewall only allows ports 22, 80, 443
3. **SSL/TLS**: All public-facing domains must use HTTPS
4. **Security Headers**: Nginx adds security headers (configured in server blocks)
5. **No Direct Access**: Services should not be accessible except through Nginx

## Monitoring

### Check All Service Ports

```bash
# One-liner to check all expected ports
for port in 8000 8100 3001 8101 8804 8200 3000 3100; do
  echo -n "Port $port: "
  nc -z 127.0.0.1 $port && echo "✓ Open" || echo "✗ Closed"
done
```

### Monitor Port Usage

```bash
# Watch port usage in real-time
watch -n 2 'netstat -tlnp | grep 127.0.0.1'
```

### Log Monitoring

```bash
# Monitor Nginx access to each upstream
sudo tail -f /var/log/nginx/*.access.log | grep "upstream"
```

## Future Services

When adding new services, follow this pattern:

1. Choose an unused port on 127.0.0.1
2. Update this document with the mapping
3. Create Nginx server block
4. Configure docker-compose.yml with port exposure
5. Obtain SSL certificate
6. Deploy and test

Suggested available ports for future use:
- 127.0.0.1:3200-3299 (Node.js apps)
- 127.0.0.1:8300-8399 (Web apps)
- 127.0.0.1:9000-9099 (Specialized services)
