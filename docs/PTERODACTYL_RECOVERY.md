# Pterodactyl Panel Recovery Guide

This guide provides manual recovery steps for when the Pterodactyl Panel installation encounters issues.

## Table of Contents
- [Common Issues](#common-issues)
- [Quick Recovery Script](#quick-recovery-script)
- [Manual Recovery Steps](#manual-recovery-steps)
- [Diagnostics](#diagnostics)
- [Complete Reinstallation](#complete-reinstallation)

## Common Issues

### 1. Nginx Configuration Corruption
**Symptoms:**
- Nginx fails to start
- Config file contains shell script content
- Port binding errors

**Cause:** Heredoc syntax issues or variable expansion problems in the deployment script.

**Fix:** Use the cleanup script or manually recreate the configuration.

### 2. Port 80 Conflicts
**Symptoms:**
- `nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)`
- Nginx fails to start

**Cause:** Another service is already using port 80/443. Pterodactyl Nginx configuration should serve directly on ports 80 and 443 with SSL.

**Fix:** Remove default Nginx configurations and ensure panel.festas-builds.com.conf is properly configured for direct SSL access.

### 3. Database Connection Issues
**Symptoms:**
- `SQLSTATE[HY000] [1045] Access denied for user 'ptero'@'localhost'`
- Migration failures
- `.env` file has incorrectly quoted password

**Cause:** Laravel's artisan command may wrap passwords with extra quotes, resulting in `DB_PASSWORD="password"` instead of `DB_PASSWORD=password`.

**Fix:** Manually edit the `.env` file to remove extra quotes around the password.

### 4. Service Failures
**Symptoms:**
- `pteroq.service` fails to start
- PHP-FPM socket errors
- Queue workers not processing jobs

**Cause:** Permissions issues or database connection problems.

**Fix:** Check permissions on `/var/www/pterodactyl` and verify database connectivity.

## Quick Recovery Script

A cleanup script is provided at `scripts/pterodactyl-cleanup.sh` that automatically fixes common issues:

```bash
# Download and run the cleanup script
cd /home/runner/work/Link-in-Bio/Link-in-Bio
sudo bash scripts/pterodactyl-cleanup.sh
```

Or run it directly on the server:

```bash
# Set the database password (if different from default)
export PTERO_DB_PASSWORD="YourPasswordHere"

# Run the script
sudo -E bash /path/to/pterodactyl-cleanup.sh
```

The script will:
1. Stop all Pterodactyl services
2. Clean corrupted Nginx configurations
3. Fix `.env` file password format
4. Test database connection
5. Recreate proper Nginx configuration
6. Restart all services

## Manual Recovery Steps

### Step 1: Stop Services

```bash
sudo systemctl stop nginx pteroq 2>/dev/null || true
```

### Step 2: Clean Nginx Configurations

```bash
# Remove all Nginx configs
sudo rm -f /etc/nginx/sites-enabled/*
sudo rm -f /etc/nginx/sites-available/pterodactyl.conf

# Remove default configs that bind to port 80
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-available/default
sudo rm -f /etc/nginx/conf.d/default.conf
```

### Step 3: Fix .env File Password Format

```bash
cd /var/www/pterodactyl

# Fix password format (remove extra quotes)
# Replace PterodactylDBPass2024! with your actual password
# Use a safe method that properly handles special characters
export PTERO_DB_PASSWORD="PterodactylDBPass2024!"
sudo -u www-data sh -c "sed -i 's/^DB_PASSWORD=.*/DB_PASSWORD='\"${PTERO_DB_PASSWORD}\"'/' .env"

# Verify the fix
sudo grep DB_ .env
```

Expected output:
```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=pterodactyl
DB_USERNAME=ptero
DB_PASSWORD=PterodactylDBPass2024!
```

### Step 4: Test Database Connection

```bash
cd /var/www/pterodactyl
sudo -u www-data php artisan migrate:status
```

If this fails, check:
```bash
# Check MariaDB is running
sudo systemctl status mariadb

# Verify database user exists
sudo mysql -e "SELECT user, host FROM mysql.user WHERE user='ptero';"

# Test manual connection
sudo mysql -u ptero -p pterodactyl
```

### Step 5: Recreate Nginx Configuration

Use the pterodactyl-cleanup.sh script to automatically recreate the correct configuration:

```bash
sudo bash scripts/pterodactyl-cleanup.sh
```

Or manually create the configuration:

```bash
# Check if SSL certificates exist
if [[ -f /etc/letsencrypt/live/panel.festas-builds.com/fullchain.pem ]]; then
  # Create HTTPS configuration
  sudo cat > /etc/nginx/sites-available/panel.festas-builds.com.conf << 'NGINX_EOF'
server {
    listen 80;
    listen [::]:80;
    server_name panel.festas-builds.com;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name panel.festas-builds.com;
    root /var/www/pterodactyl/public;
    index index.php;

    ssl_certificate /etc/letsencrypt/live/panel.festas-builds.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/panel.festas-builds.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "same-origin" always;

    access_log /var/log/nginx/panel.festas-builds.com.access.log;
    error_log /var/log/nginx/panel.festas-builds.com.error.log;

    client_max_body_size 100m;
    client_body_timeout 120s;
    sendfile off;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \.php$ {
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        fastcgi_param HTTP_PROXY "";
        fastcgi_buffer_size 16k;
        fastcgi_buffers 4 16k;
        fastcgi_connect_timeout 300;
        fastcgi_send_timeout 300;
        fastcgi_read_timeout 300;
    }

    location ~ /\.ht {
        deny all;
    }
}
NGINX_EOF
else
  # Create temporary HTTP-only configuration
  sudo cat > /etc/nginx/sites-available/panel.festas-builds.com.conf << 'NGINX_EOF'
server {
    listen 80;
    listen [::]:80;
    server_name panel.festas-builds.com;
    root /var/www/pterodactyl/public;
    index index.php;

    access_log /var/log/nginx/panel.festas-builds.com.access.log;
    error_log /var/log/nginx/panel.festas-builds.com.error.log;

    client_max_body_size 100m;
    client_body_timeout 120s;
    sendfile off;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
    }

    location ~ /\.ht {
        deny all;
    }
}
NGINX_EOF
  echo "⚠ Remember to run: sudo certbot --nginx -d panel.festas-builds.com"
fi

# Enable site
sudo ln -sf /etc/nginx/sites-available/panel.festas-builds.com.conf /etc/nginx/sites-enabled/panel.festas-builds.com.conf

# Test configuration
sudo nginx -t
```

### Step 6: Start Services

```bash
# Start PHP-FPM
sudo systemctl start php8.3-fpm

# Start Nginx
sudo systemctl start nginx

# Start Pterodactyl queue worker
sudo systemctl start pteroq
```

### Step 7: Verify Everything Works

```bash
# Check service status
sudo systemctl status nginx php8.3-fpm pteroq

# Verify Nginx is listening on correct ports
sudo netstat -tlnp | grep nginx

# Should show nginx listening on ports 80 and/or 443

# Test database connection
cd /var/www/pterodactyl
sudo -u www-data php artisan migrate:status

# Check logs
sudo tail -50 /var/log/nginx/pterodactyl.error.log
```

## Diagnostics

### Check Current State

```bash
# Service status
sudo systemctl status nginx php8.3-fpm pteroq mariadb redis-server

# Port usage
sudo netstat -tlnp | grep -E ':(80|443)'

# Nginx configuration test
sudo nginx -t

# Database connection
cd /var/www/pterodactyl && sudo -u www-data php artisan migrate:status

# View logs
sudo tail -100 /var/log/nginx/error.log
sudo tail -100 /var/log/nginx/pterodactyl.error.log
sudo journalctl -u nginx --no-pager -n 100
sudo journalctl -u pteroq --no-pager -n 100
```

### Common Error Messages

**Error: `bind() to 0.0.0.0:80 failed`**
- Solution: Remove default Nginx configs, ensure only panel.festas-builds.com.conf uses port 80/443

**Error: `Access denied for user 'ptero'@'localhost'`**
- Solution: Fix `.env` password format, recreate database user

**Error: `php8.3-fpm.sock failed (2: No such file or directory)`**
- Solution: Start PHP-FPM: `sudo systemctl start php8.3-fpm`

**Error: `Connection refused` when accessing panel**
- Check Caddy is running: `docker compose ps caddy`
- Check Caddy configuration: `docker compose exec -T caddy caddy validate`
- Reload Caddy: `docker compose exec caddy caddy reload`

## Complete Reinstallation

If recovery fails, you can completely reinstall:

```bash
# Run the workflow with force_reinstall option
# This will drop the database, remove all files, and start fresh
# Go to: https://github.com/Festas/Link-in-Bio/actions/workflows/deploy-pterodactyl.yml
# Click "Run workflow"
# Check "Force reinstall"
# Click "Run workflow" button
```

Or manually trigger via GitHub CLI:

```bash
gh workflow run deploy-pterodactyl.yml -f force_reinstall=true
```

## Post-Recovery Checklist

After recovery, verify:

- [ ] Nginx running: `sudo systemctl status nginx`
- [ ] Nginx listening on 80/443: `sudo netstat -tlnp | grep nginx`
- [ ] PHP-FPM running: `sudo systemctl status php8.3-fpm`
- [ ] pteroq running: `sudo systemctl status pteroq`
- [ ] Database connection works: `cd /var/www/pterodactyl && sudo -u www-data php artisan migrate:status`
- [ ] Panel accessible: https://panel.festas-builds.com
- [ ] Can login with admin credentials
- [ ] No errors in logs: `sudo tail -50 /var/log/nginx/pterodactyl.error.log`

## Support

If issues persist:

1. Check the main setup guide: `docs/PTERODACTYL_SETUP.md`
2. Review deployment workflow: `.github/workflows/deploy-pterodactyl.yml`
3. Check Pterodactyl documentation: https://pterodactyl.io/
4. Review system logs for detailed error messages

## Prevention

To prevent future issues:

1. **Don't manually edit files** - use the GitHub workflow for deployments
2. **Use force_reinstall carefully** - it drops the database and removes all data
3. **Monitor logs** - check Nginx and pteroq logs regularly
4. **Keep backups** - backup `/var/www/pterodactyl` and the database regularly
5. **Test before production** - verify changes in the workflow before running on production

## Backup Commands

Create a backup before making changes:

```bash
# Backup application files
sudo tar -czf /root/pterodactyl-backup-$(date +%Y%m%d).tar.gz /var/www/pterodactyl

# Backup database
sudo mysqldump -u root pterodactyl > /root/pterodactyl-db-backup-$(date +%Y%m%d).sql

# Backup Nginx config
sudo cp /etc/nginx/sites-available/pterodactyl.conf /root/pterodactyl-nginx-backup-$(date +%Y%m%d).conf
```

Restore from backup:

```bash
# Restore application files
sudo rm -rf /var/www/pterodactyl
sudo tar -xzf /root/pterodactyl-backup-YYYYMMDD.tar.gz -C /

# Restore database
sudo mysql pterodactyl < /root/pterodactyl-db-backup-YYYYMMDD.sql

# Restore Nginx config
sudo cp /root/pterodactyl-nginx-backup-YYYYMMDD.conf /etc/nginx/sites-available/pterodactyl.conf
sudo systemctl restart nginx
```
