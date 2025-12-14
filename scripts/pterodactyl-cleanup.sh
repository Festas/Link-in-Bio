#!/bin/bash
# Pterodactyl Cleanup Script
# This script cleans up a failed Pterodactyl installation and fixes common issues

set -euo pipefail

echo "=========================================="
echo "Pterodactyl Cleanup & Recovery Script"
echo "=========================================="
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "⚠ This script must be run as root or with sudo"
   exit 1
fi

# Default password (can be overridden)
PTERO_DB_PASSWORD="${PTERO_DB_PASSWORD:-PterodactylDBPass2024!}"

echo "[1/5] Stopping services..."
systemctl stop nginx 2>/dev/null || true
systemctl stop pteroq 2>/dev/null || true
systemctl stop php8.3-fpm 2>/dev/null || true
echo "✓ Services stopped"

echo ""
echo "[2/5] Cleaning Nginx configurations..."
rm -f /etc/nginx/sites-enabled/*
rm -f /etc/nginx/sites-available/pterodactyl.conf
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-available/default
rm -f /etc/nginx/conf.d/default.conf
echo "✓ Nginx configs cleaned"

echo ""
echo "[3/5] Fixing .env file password format..."
if [[ -f /var/www/pterodactyl/.env ]]; then
  cd /var/www/pterodactyl
  
  # Fix password format (remove extra quotes)
  sudo -u www-data sed -i 's/DB_PASSWORD=".*"/DB_PASSWORD='"${PTERO_DB_PASSWORD}"'/' .env
  
  # Show current DB settings
  echo "Current database settings in .env:"
  grep DB_ .env || true
  echo "✓ .env file updated"
else
  echo "⚠ .env file not found at /var/www/pterodactyl/.env"
fi

echo ""
echo "[4/5] Testing database connection..."
if [[ -f /var/www/pterodactyl/artisan ]]; then
  cd /var/www/pterodactyl
  if sudo -u www-data php artisan migrate:status; then
    echo "✓ Database connection successful"
  else
    echo "❌ Database connection failed"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Check if MariaDB is running: systemctl status mariadb"
    echo "2. Verify database user exists: mysql -e \"SELECT user, host FROM mysql.user WHERE user='ptero';\""
    echo "3. Test manual connection: mysql -u ptero -p pterodactyl"
  fi
else
  echo "⚠ Pterodactyl not installed at /var/www/pterodactyl"
fi

echo ""
echo "[5/5] Recreating Nginx configuration..."
cat > /etc/nginx/sites-available/pterodactyl.conf << 'NGINX_EOF'
server {
    listen 127.0.0.1:8081;
    server_name panel.festas-builds.com;
    root /var/www/pterodactyl/public;
    index index.php;

    access_log /var/log/nginx/pterodactyl.access.log;
    error_log /var/log/nginx/pterodactyl.error.log;

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
        fastcgi_param PHP_VALUE "upload_max_filesize = 100M \n post_max_size=100M";
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        fastcgi_param HTTP_PROXY "";
        fastcgi_intercept_errors off;
        fastcgi_buffer_size 16k;
        fastcgi_buffers 4 16k;
        fastcgi_connect_timeout 300;
        fastcgi_send_timeout 300;
        fastcgi_read_timeout 300;
        include /etc/nginx/fastcgi_params;
    }

    location ~ /\.ht {
        deny all;
    }
}
NGINX_EOF

# Enable site
ln -sf /etc/nginx/sites-available/pterodactyl.conf /etc/nginx/sites-enabled/pterodactyl.conf

# Test configuration
echo "Testing Nginx configuration..."
if nginx -t; then
  echo "✓ Nginx configuration valid"
else
  echo "❌ Nginx configuration test failed"
  exit 1
fi

echo ""
echo "[6/6] Restarting services..."
systemctl start php8.3-fpm 2>/dev/null || echo "⚠ php8.3-fpm not available"
systemctl start nginx
systemctl start pteroq 2>/dev/null || echo "⚠ pteroq not available"

echo ""
echo "=========================================="
echo "Cleanup Complete!"
echo "=========================================="
echo ""
echo "Service Status:"
systemctl status nginx --no-pager -l || true
echo ""
systemctl status php8.3-fpm --no-pager -l || true
echo ""
systemctl status pteroq --no-pager -l || true
echo ""
echo "Nginx Port Check:"
netstat -tlnp | grep 8081 || echo "⚠ Port 8081 not in use"
echo ""
echo "Next Steps:"
echo "1. Verify Nginx is listening: netstat -tlnp | grep 8081"
echo "2. Test database connection: cd /var/www/pterodactyl && sudo -u www-data php artisan migrate:status"
echo "3. Check logs: tail -50 /var/log/nginx/pterodactyl.error.log"
echo "4. Access panel: https://panel.festas-builds.com"
echo "=========================================="
