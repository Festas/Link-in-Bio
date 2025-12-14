# Pterodactyl Panel & Wings Setup Guide

## Overview

This guide covers the automated installation of Pterodactyl Panel and Wings on the Hetzner server, along with the manual configuration steps required to complete the setup.

## What Was Automatically Installed

The GitHub Actions workflow `deploy-pterodactyl.yml` automatically installs and configures:

### System Components
- **PHP 8.3** with all required extensions (cli, common, gd, mysql, mbstring, bcmath, xml, fpm, curl, zip, intl, sqlite3, redis)
- **Composer** (latest version)
- **MariaDB** database server
- **Redis** cache and queue server
- **Nginx** as internal reverse proxy

### Database Setup
- Database: `pterodactyl`
- User: `ptero@127.0.0.1` (Panel database access)
- User: `pterodactyluser@127.0.0.1` (Gameserver databases access)
- All users use the password from the `PTERO_DB_PASSWORD` secret (default: `PterodactylDBPass2024!`)

### Panel Installation
- **Location**: `/var/www/pterodactyl`
- **URL**: `https://panel.festas-builds.com`
- **Timezone**: `Europe/Berlin`
- **Cache/Session/Queue**: Redis
- Database migrations completed
- Admin user created with credentials from secrets:
  - Email: `PTERO_ADMIN_EMAIL` (default: `admin@festas-builds.com`)
  - Password: `PTERO_ADMIN_PASSWORD` (default: `PteroAdmin2024!`)

### Nginx Configuration
- Listening on: `127.0.0.1:8080` (internal only)
- PHP-FPM socket: `/run/php/php8.3-fpm.sock`
- Document root: `/var/www/pterodactyl/public`
- Caddy handles SSL and external access

### Systemd Services
- **pteroq.service**: Queue worker for background jobs (running)
- **Cron job**: Scheduled tasks runner (configured for www-data user)
- **wings.service**: Wings daemon (installed but NOT running - requires manual token)

### Wings Installation
- Binary location: `/usr/local/bin/wings`
- Configuration directory: `/etc/pterodactyl/`
- Service file created but not started (requires manual token configuration)

## Manual Configuration Steps

### 1. DNS Configuration

Create an A record for the Panel subdomain:

```
Type: A
Host: panel
Value: 128.140.99.121
TTL: 3600 (or default)
```

**Verify DNS propagation:**
```bash
dig panel.festas-builds.com +short
# Should return: 128.140.99.121
```

### 2. Update and Reload Caddy

After DNS is configured, the Caddyfile has already been updated with the Pterodactyl Panel configuration. Deploy the updated configuration:

**Option A: Via GitHub Actions**
1. Push changes to the `main` branch
2. The deploy workflow will automatically update Caddy

**Option B: Manual SSH**
```bash
ssh deploy@128.140.99.121
cd /srv/link-in-bio
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### 3. Access the Panel

Open your browser and navigate to:
```
https://panel.festas-builds.com
```

Log in with your admin credentials:
- **Email**: Value from `PTERO_ADMIN_EMAIL` secret
- **Default Email**: `admin@festas-builds.com`
- **Password**: Value from `PTERO_ADMIN_PASSWORD` secret

### 4. Create a Location

Locations are groups of nodes. Create at least one:

1. Navigate to **Admin → Locations** in the Panel
2. Click **Create New**
3. Fill in the form:
   - **Short Code**: `hetzner-fsn1` (example)
   - **Description**: `Hetzner Falkenstein DC` (example)
4. Click **Create Location**

### 5. Create a Node

Nodes are servers that run game servers via Wings:

1. Navigate to **Admin → Nodes**
2. Click **Create New**
3. Fill in the **Basic Details**:
   - **Name**: `Node-1` (or your preferred name)
   - **Description**: `Primary Game Server Node`
   - **Location**: Select the location you created
   - **FQDN**: `panel.festas-builds.com` (Wings will connect on port 8080)
   - **Communicate Over SSL**: Yes
   - **Behind Proxy**: Yes
   - **Daemon Port**: `8080` (Wings internal port)

4. **Allocation Settings**:
   - **Memory**: `8192` MB (adjust based on server specs)
   - **Memory Over-Allocation**: `0` (or small percentage like 10)
   - **Disk**: `50000` MB (50 GB, adjust as needed)
   - **Disk Over-Allocation**: `0`

5. **Network Configuration**:
   - Click **Add Allocation**
   - **IP Address**: `128.140.99.121` (server public IP)
   - **IP Alias**: Leave empty
   - **Port**: `25565` (Minecraft default, add more as needed)
   - Add additional ports like `25566`, `25567`, etc.

6. Click **Create Node**

### 6. Get Wings Configuration Token

After creating the node:

1. Navigate to **Admin → Nodes**
2. Click on the node you just created
3. Go to the **Configuration** tab
4. You'll see a command like:
   ```bash
   sudo wings configure --panel-url https://panel.festas-builds.com --token <YOUR_TOKEN> --node <NODE_ID>
   ```
5. Copy this entire command

### 7. Configure Wings on Server

SSH into the server and run the configuration command:

```bash
ssh deploy@128.140.99.121

# Run the command from Panel (replace with your actual command)
sudo wings configure --panel-url https://panel.festas-builds.com --token <YOUR_TOKEN> --node <NODE_ID>

# This creates /etc/pterodactyl/config.yml
```

### 8. Install Docker (if not already installed)

Wings requires Docker to run game servers:

```bash
# Check if Docker is installed
docker --version

# If not installed, install Docker
curl -sSL https://get.docker.com/ | CHANNEL=stable bash
sudo systemctl enable --now docker
```

### 9. Start Wings Service

Now that Wings is configured, start the service:

```bash
sudo systemctl start wings
sudo systemctl status wings

# Check Wings logs
sudo journalctl -u wings -f
```

If Wings starts successfully, you should see it connect to the Panel.

### 10. Verify Node Connection

Back in the Panel:

1. Navigate to **Admin → Nodes**
2. Check if your node shows as **Online** (green status)
3. If offline, check Wings logs for connection errors

## Common Configuration Tasks

### Adding More Ports

To allow more game servers:

1. In Panel: **Admin → Nodes → [Your Node] → Allocation**
2. Click **Create Allocation**
3. Add ports like `25566`, `25567`, `30000-30010` (range), etc.

### Creating Your First Server

1. Navigate to **Admin → Servers → Create New**
2. Fill in server details:
   - **Server Name**: Your server name
   - **Server Owner**: Select or create a user
   - **Egg**: Select game type (Minecraft, etc.)
   - **Node**: Select your node
   - **Primary Allocation**: Select a port
3. Configure **Resource Limits** (CPU, RAM, Disk)
4. Click **Create Server**

### Managing Users

1. **Admin → Users** to create new users
2. Users can access their servers at `https://panel.festas-builds.com`
3. Admin users can access admin panel, regular users only see their servers

## Troubleshooting

### Panel Not Accessible

```bash
# Check Nginx status
sudo systemctl status nginx

# Check PHP-FPM status
sudo systemctl status php8.3-fpm

# Check Nginx error log
sudo tail -f /var/log/nginx/pterodactyl.error.log

# Check Caddy configuration
cd /srv/link-in-bio
docker compose exec caddy caddy validate --config /etc/caddy/Caddyfile
```

### Wings Not Connecting

```bash
# Check Wings status
sudo systemctl status wings

# View Wings logs
sudo journalctl -u wings -f

# Verify config file exists
sudo cat /etc/pterodactyl/config.yml

# Check Docker status
sudo systemctl status docker

# Test Wings manually (for debugging)
sudo wings --debug
```

### Database Issues

```bash
# Check MariaDB status
sudo systemctl status mariadb

# Access MariaDB console
sudo mysql

# Check database exists
SHOW DATABASES;
USE pterodactyl;
SHOW TABLES;
```

### Queue Worker Issues

```bash
# Check pteroq status
sudo systemctl status pteroq

# Restart queue worker
sudo systemctl restart pteroq

# View queue worker logs
sudo journalctl -u pteroq -f
```

### Permission Issues

```bash
# Fix Panel permissions
cd /var/www/pterodactyl
sudo chown -R www-data:www-data /var/www/pterodactyl/*
sudo chmod -R 755 /var/www/pterodactyl/storage
sudo chmod -R 755 /var/www/pterodactyl/bootstrap/cache
```

## Security Recommendations

1. **Change Default Passwords**: Update the admin password after first login
2. **Enable 2FA**: Enable two-factor authentication for admin accounts
3. **Firewall Rules**: Ensure firewall allows:
   - Port 443 (HTTPS for Panel)
   - Port 8080 (Wings communication to Panel)
   - Game server ports (25565, etc.)
4. **Regular Updates**: Keep Panel and Wings updated:
   ```bash
   # Update Panel
   cd /var/www/pterodactyl
   sudo -u www-data php artisan p:upgrade
   
   # Update Wings
   sudo systemctl stop wings
   sudo curl -L -o /usr/local/bin/wings "https://github.com/pterodactyl/wings/releases/latest/download/wings_linux_amd64"
   sudo systemctl start wings
   ```

## Backup Recommendations

### Panel Backup

```bash
# Create backup directory if it doesn't exist
sudo mkdir -p /backup

# Database backup (password from environment or interactive)
# Option 1: With password from secret
PTERO_DB_PASSWORD="your_password_here"
sudo mysqldump -u ptero -p"${PTERO_DB_PASSWORD}" pterodactyl > /backup/pterodactyl_$(date +%Y%m%d).sql

# Option 2: Interactive (will prompt for password)
sudo mysqldump -u ptero -p pterodactyl > /backup/pterodactyl_$(date +%Y%m%d).sql

# Panel files backup
sudo tar -czf /backup/pterodactyl_files_$(date +%Y%m%d).tar.gz /var/www/pterodactyl
```

### Server Data Backup

Server files are stored in `/var/lib/pterodactyl/volumes/`
```bash
# Create backup directory if it doesn't exist
sudo mkdir -p /backup

# Backup server volumes
sudo tar -czf /backup/server_volumes_$(date +%Y%m%d).tar.gz /var/lib/pterodactyl/volumes
```

## Useful Commands

```bash
# Restart all Panel services
sudo systemctl restart nginx php8.3-fpm pteroq

# View all Panel logs
sudo tail -f /var/log/nginx/pterodactyl.error.log

# Clear Panel cache
cd /var/www/pterodactyl
sudo -u www-data php artisan cache:clear
sudo -u www-data php artisan config:clear
sudo -u www-data php artisan view:clear

# Run database migrations (after Panel updates)
sudo -u www-data php artisan migrate --seed --force

# Create new admin user manually
cd /var/www/pterodactyl
sudo -u www-data php artisan p:user:make
```

## Additional Resources

- **Official Documentation**: https://pterodactyl.io/
- **Panel GitHub**: https://github.com/pterodactyl/panel
- **Wings GitHub**: https://github.com/pterodactyl/wings
- **Community Discord**: https://discord.gg/pterodactyl

## Support

If you encounter issues not covered in this guide:

1. Check the official Pterodactyl documentation
2. Review the GitHub Actions workflow logs
3. Check Wings and Panel logs on the server
4. Join the Pterodactyl Discord community for help

---

**Last Updated**: December 2024  
**Server**: Hetzner (128.140.99.121)  
**OS**: Ubuntu 24.04
