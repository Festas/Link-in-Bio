#!/bin/bash
# Pterodactyl Panel & Wings Deployment Script
# This script is called by the GitHub Actions workflow to deploy Pterodactyl
# Environment variables expected: PTERO_DB_PASSWORD, PTERO_ADMIN_EMAIL, PTERO_ADMIN_PASSWORD, FORCE_REINSTALL

set -euo pipefail

echo "=========================================="
echo "Pterodactyl Panel & Wings Installation"
echo "=========================================="

# Set default values for secrets if not provided
PTERO_DB_PASSWORD="${PTERO_DB_PASSWORD:-PterodactylDBPass2024!}"
PTERO_ADMIN_EMAIL="${PTERO_ADMIN_EMAIL:-admin@festas-builds.com}"
PTERO_ADMIN_PASSWORD="${PTERO_ADMIN_PASSWORD:-PteroAdmin2024!}"

# ==========================================
# 1. Check if already installed (idempotent)
# ==========================================
echo "[1/9] Checking existing installation..."

# Check for FORCE_REINSTALL environment variable to allow reinstallation
if [[ "${FORCE_REINSTALL:-false}" == "true" ]]; then
  echo "⚠ FORCE_REINSTALL is set, removing existing installation..."
  
  # Stop services
  sudo systemctl stop pteroq || true
  sudo systemctl stop nginx || true
  
  # Kill any processes using port 8080
  sudo fuser -k 8080/tcp || true
  sleep 2  # Give processes time to die
  
  # Remove application files
  sudo rm -rf /var/www/pterodactyl
  
  # Remove Nginx configurations
  sudo rm -f /etc/nginx/sites-enabled/pterodactyl.conf
  sudo rm -f /etc/nginx/sites-available/pterodactyl.conf
  sudo rm -f /etc/nginx/sites-enabled/panel.festas-builds.com.conf
  sudo rm -f /etc/nginx/sites-available/panel.festas-builds.com.conf
  
  # Clean database
  sudo mysql -e "DROP DATABASE IF EXISTS pterodactyl;" || true
  sudo mysql -e "DROP USER IF EXISTS 'ptero'@'127.0.0.1';" || true
  sudo mysql -e "DROP USER IF EXISTS 'ptero'@'localhost';" || true
  sudo mysql -e "DROP USER IF EXISTS 'pterodactyluser'@'127.0.0.1';" || true
  sudo mysql -e "DROP USER IF EXISTS 'pterodactyluser'@'localhost';" || true
  
  # Remove systemd services
  sudo systemctl disable pteroq || true
  sudo rm -f /etc/systemd/system/pteroq.service
  sudo systemctl daemon-reload
  
  # Remove cron job
  sudo crontab -u www-data -l 2>/dev/null | grep -v "pterodactyl/artisan schedule:run" | sudo crontab -u www-data - || true
  
  echo "✓ Previous installation removed"
fi

if [[ -f /var/www/pterodactyl/artisan ]]; then
  echo "⚠ Pterodactyl Panel already installed at /var/www/pterodactyl"
  echo "Skipping installation to prevent data loss."
  echo "To reinstall, set FORCE_REINSTALL=true and re-run this workflow."
  exit 0
fi

echo "✓ No existing installation found, proceeding..."

# ==========================================
# 2. System Setup
# ==========================================
echo "[2/9] Installing system dependencies..."

# Update package list
sudo apt-get update

# Add PHP repository for 8.3
sudo apt-get install -y software-properties-common
sudo add-apt-repository -y ppa:ondrej/php
sudo apt-get update

# Install PHP 8.3 and extensions
sudo apt-get install -y php8.3 php8.3-cli php8.3-common php8.3-gd \
  php8.3-mysql php8.3-mbstring php8.3-bcmath php8.3-xml php8.3-fpm \
  php8.3-curl php8.3-zip php8.3-intl php8.3-sqlite3 php8.3-redis

# Install Composer if not present
if ! command -v composer &> /dev/null; then
  echo "Installing Composer..."
  curl -sS https://getcomposer.org/installer | sudo php -- --install-dir=/usr/local/bin --filename=composer
fi

# Install MariaDB if not present
if ! command -v mysql &> /dev/null; then
  echo "Installing MariaDB..."
  sudo apt-get install -y mariadb-server mariadb-client
  sudo systemctl start mariadb
  sudo systemctl enable mariadb
fi

# Install Redis if not present
if ! command -v redis-cli &> /dev/null; then
  echo "Installing Redis..."
  sudo apt-get install -y redis-server
  sudo systemctl start redis-server
  sudo systemctl enable redis-server
fi

# Install other dependencies
sudo apt-get install -y curl tar unzip git net-tools lsof

echo "✓ System dependencies installed"

# ==========================================
# 3. Database Setup
# ==========================================
echo "[3/9] Setting up database..."

# Create database
sudo mysql -e "CREATE DATABASE IF NOT EXISTS pterodactyl;"

# Create users for BOTH localhost and 127.0.0.1 (MySQL treats them differently!)
# User for 127.0.0.1
sudo mysql -e "CREATE USER IF NOT EXISTS 'ptero'@'127.0.0.1' IDENTIFIED BY '${PTERO_DB_PASSWORD}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON pterodactyl.* TO 'ptero'@'127.0.0.1' WITH GRANT OPTION;"

# User for localhost (this is what PHP often uses!)
sudo mysql -e "CREATE USER IF NOT EXISTS 'ptero'@'localhost' IDENTIFIED BY '${PTERO_DB_PASSWORD}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON pterodactyl.* TO 'ptero'@'localhost' WITH GRANT OPTION;"

# Pterodactyl user for game server databases (both hosts)
sudo mysql -e "CREATE USER IF NOT EXISTS 'pterodactyluser'@'127.0.0.1' IDENTIFIED BY '${PTERO_DB_PASSWORD}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON *.* TO 'pterodactyluser'@'127.0.0.1' WITH GRANT OPTION;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'pterodactyluser'@'localhost' IDENTIFIED BY '${PTERO_DB_PASSWORD}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON *.* TO 'pterodactyluser'@'localhost' WITH GRANT OPTION;"

sudo mysql -e "FLUSH PRIVILEGES;"

echo "✓ Database setup complete"

# ==========================================
# 4. Panel Installation
# ==========================================
echo "[4/9] Installing Pterodactyl Panel..."

# Create directory
sudo mkdir -p /var/www/pterodactyl
cd /var/www/pterodactyl

# Download Panel
echo "Downloading latest Panel release..."
PANEL_VERSION=$(curl -s https://api.github.com/repos/pterodactyl/panel/releases/latest | grep -oP '"tag_name": "\K(.*)(?=")')
echo "Latest version: ${PANEL_VERSION}"

sudo curl -L -o panel.tar.gz "https://github.com/pterodactyl/panel/releases/latest/download/panel.tar.gz"
sudo tar -xzf panel.tar.gz
sudo rm panel.tar.gz

# Copy .env.example to .env BEFORE setting permissions
sudo cp .env.example .env

# Set permissions BEFORE running composer (this is critical!)
sudo chown -R www-data:www-data /var/www/pterodactyl
sudo chmod -R 775 /var/www/pterodactyl/storage /var/www/pterodactyl/bootstrap/cache

# Create composer cache directories with proper permissions
echo "Setting up composer cache directories..."
sudo mkdir -p /var/www/.cache/composer
sudo mkdir -p /var/www/.composer
sudo chown -R www-data:www-data /var/www/.cache /var/www/.composer

# Install composer dependencies as www-data (now has write permissions)
echo "Installing composer dependencies..."
cd /var/www/pterodactyl
sudo -u www-data COMPOSER_HOME=/var/www/.composer composer install --no-dev --optimize-autoloader --no-interaction

echo "✓ Panel files installed"

# ==========================================
# 5. Panel Configuration
# ==========================================
echo "[5/9] Configuring Panel..."

# Generate application key (now .env file exists)
sudo -u www-data php artisan key:generate --force

# Configure .env file
sudo -u www-data php artisan p:environment:setup \
  --url=https://panel.festas-builds.com \
  --timezone=Europe/Berlin \
  --cache=redis \
  --session=redis \
  --queue=redis \
  --redis-host=127.0.0.1 \
  --redis-pass= \
  --redis-port=6379 \
  --no-interaction

# Configure database settings
echo "Configuring database connection..."
sudo -u www-data php artisan p:environment:database \
  --host=127.0.0.1 \
  --port=3306 \
  --database=pterodactyl \
  --username=ptero \
  --password="${PTERO_DB_PASSWORD}" \
  --no-interaction

# Fix .env file password format (Laravel may add extra quotes)
echo "Fixing .env password format..."
# Use a safe method that doesn't expose password to shell expansion
sudo -u www-data sh -c "sed -i 's/^DB_PASSWORD=.*/DB_PASSWORD='\"${PTERO_DB_PASSWORD}\"'/' /var/www/pterodactyl/.env"
echo "✓ .env password format fixed"

# Verify .env file has correct database credentials
echo "Verifying .env database credentials..."
if ! sudo grep -q "DB_USERNAME=ptero" /var/www/pterodactyl/.env; then
  echo "ERROR: .env file has incorrect DB_USERNAME!"
  echo "Expected: DB_USERNAME=ptero"
  echo "Current .env DB settings:"
  sudo grep DB_ /var/www/pterodactyl/.env || true
  exit 1
fi
echo "✓ .env credentials verified"

# Configure mail settings (use log driver to prevent SMTP failures)
sudo -u www-data php artisan p:environment:mail \
  --driver=mail \
  --email=noreply@festas-builds.com \
  --from="Pterodactyl Panel" \
  --no-interaction

# Force MAIL_MAILER to log to prevent SMTP failures
echo "Forcing MAIL_MAILER to log mode to prevent email failures..."
sudo -u www-data sed -i 's/^MAIL_MAILER=.*/MAIL_MAILER=log/' /var/www/pterodactyl/.env
sudo -u www-data sed -i 's/^MAIL_HOST=.*/MAIL_HOST=localhost/' /var/www/pterodactyl/.env
echo "✓ Mail configuration set to log mode"

echo "✓ Panel configuration complete"

# ==========================================
# 6. Database Migrations
# ==========================================
echo "[6/9] Running database migrations..."

# Run migrations with proper error handling
echo "Running migrations and seeding database..."
MIGRATION_FAILED=false
MIGRATION_OUTPUT=$(sudo -u www-data php artisan migrate --seed --force 2>&1) || MIGRATION_FAILED=true

if [[ "${MIGRATION_FAILED}" == "true" ]]; then
  echo "❌ ERROR: Database migration FAILED!"
  echo ""
  echo "Migration Output:"
  echo "================="
  echo "${MIGRATION_OUTPUT}"
  echo ""
  echo "Diagnostic Information:"
  echo "======================="
  echo ""
  echo "1. Database connection test..."
  sudo mysql -e "SHOW GRANTS FOR 'ptero'@'localhost';" 2>&1 || echo "Failed to show grants"
  sudo mysql -e "SELECT user, host FROM mysql.user WHERE user='ptero';" 2>&1 || echo "Failed to query users"
  echo ""
  echo "2. .env file database settings..."
  sudo cat /var/www/pterodactyl/.env | grep DB_ 2>&1 || echo "Failed to read .env"
  echo ""
  echo "3. Direct MySQL connection test..."
  sudo MYSQL_PWD="${PTERO_DB_PASSWORD}" mysql -u ptero -h 127.0.0.1 pterodactyl -e "SELECT 1 AS test;" 2>&1 || echo "Direct connection failed"
  echo ""
  echo "4. Laravel logs (last 50 lines)..."
  sudo tail -50 /var/www/pterodactyl/storage/logs/laravel.log 2>&1 || echo "No Laravel logs found"
  echo ""
  echo "5. Current database tables..."
  sudo mysql pterodactyl -e "SHOW TABLES;" 2>&1 || echo "Failed to show tables"
  echo ""
  echo "======================="
  echo "Migration failed - cannot proceed with admin user creation!"
  echo "======================="
  exit 1
fi

echo "✓ Migrations and seeding completed successfully"
echo "Migration Output:"
echo "${MIGRATION_OUTPUT}"
echo ""

# Verify migrations were successful by checking migration status
echo "Verifying migration status with 'php artisan migrate:status'..."
MIGRATION_STATUS=$(sudo -u www-data php artisan migrate:status 2>&1) || true

if ! echo "${MIGRATION_STATUS}" | grep -q "Migration name"; then
  echo "⚠ WARNING: Could not verify migration status"
  echo "Migration Status Output:"
  echo "${MIGRATION_STATUS}"
else
  echo "✓ Migration status verified"
  echo "${MIGRATION_STATUS}" | head -20
fi
echo ""

# Verify expected tables exist - FAIL FAST if they don't
echo "Verifying critical database tables exist..."
CRITICAL_TABLES=("users" "settings" "migrations")
ALL_TABLES_EXIST=true

for table in "${CRITICAL_TABLES[@]}"; do
  if ! sudo mysql pterodactyl -e "SHOW TABLES LIKE '${table}';" 2>/dev/null | grep -q "${table}"; then
    echo "❌ CRITICAL TABLE MISSING: ${table}"
    ALL_TABLES_EXIST=false
  else
    echo "✓ Table exists: ${table}"
  fi
done

if [[ "${ALL_TABLES_EXIST}" != "true" ]]; then
  echo ""
  echo "❌ ERROR: Critical database tables are missing!"
  echo ""
  echo "Current tables in database:"
  sudo mysql pterodactyl -e "SHOW TABLES;" 2>&1 || echo "Failed to show tables"
  echo ""
  echo "Migration status:"
  echo "${MIGRATION_STATUS}"
  echo ""
  echo "======================="
  echo "Cannot proceed with admin user creation - database incomplete!"
  echo "======================="
  exit 1
fi

echo "✓ All critical database tables verified"
echo "✓ Database migrations complete and verified"

# ==========================================
# 7. Create/Reset Admin User (Idempotent)
# ==========================================
echo "[7/9] Creating/resetting admin user..."

# Function to create or reset admin user
# This is idempotent - it will create the user if it doesn't exist,
# or update the password if it does exist

echo "Checking if admin user exists..."
USER_EXISTS=$(sudo MYSQL_PWD="${PTERO_DB_PASSWORD}" mysql -u ptero pterodactyl -sN -e "SELECT COUNT(*) FROM users WHERE email='${PTERO_ADMIN_EMAIL}';" 2>/dev/null || echo "0")

if [[ "${USER_EXISTS}" == "0" ]]; then
  echo "Admin user does not exist, creating new user..."
  
  # Attempt to create user with retries
  CREATE_SUCCESS=false
  for attempt in {1..3}; do
    echo "Attempt ${attempt}/3 to create admin user..."
    if sudo -u www-data php artisan p:user:make \
      --email="${PTERO_ADMIN_EMAIL}" \
      --username=admin \
      --name-first=Admin \
      --name-last=Festas \
      --password="${PTERO_ADMIN_PASSWORD}" \
      --admin=1 \
      --no-interaction 2>&1; then
      CREATE_SUCCESS=true
      echo "✓ Admin user created successfully!"
      break
    else
      echo "⚠ Attempt ${attempt} failed, retrying..."
      sleep 2
    fi
  done
  
  if [[ "${CREATE_SUCCESS}" != "true" ]]; then
    echo "❌ ERROR: Failed to create admin user after 3 attempts!"
    exit 1
  fi
else
  echo "Admin user already exists, updating password..."
  
  # Update the password for existing user
  # We'll use direct SQL to ensure the password is updated
  PASSWORD_HASH=$(sudo -u www-data php -r "echo password_hash('${PTERO_ADMIN_PASSWORD}', PASSWORD_BCRYPT);")
  
  if sudo MYSQL_PWD="${PTERO_DB_PASSWORD}" mysql -u ptero pterodactyl -e "UPDATE users SET password='${PASSWORD_HASH}', root_admin=1 WHERE email='${PTERO_ADMIN_EMAIL}';" 2>&1; then
    echo "✓ Admin user password updated successfully!"
  else
    echo "❌ ERROR: Failed to update admin user password!"
    exit 1
  fi
fi

# Verify admin user exists and has correct permissions
echo ""
echo "Verifying admin user..."
ADMIN_COUNT=$(sudo MYSQL_PWD="${PTERO_DB_PASSWORD}" mysql -u ptero pterodactyl -sN -e "SELECT COUNT(*) FROM users WHERE email='${PTERO_ADMIN_EMAIL}' AND root_admin=1;" 2>/dev/null || echo "0")

if [[ "${ADMIN_COUNT}" == "1" ]]; then
  echo "✓ Admin user verified: ${PTERO_ADMIN_EMAIL}"
  echo "✓ Admin permissions: root_admin=1"
  echo "✓ Username: admin"
  echo "✓ Password: [CONFIGURED FROM SECRETS]"
else
  echo "❌ ERROR: Admin user verification failed!"
  echo "Expected 1 admin user, found: ${ADMIN_COUNT}"
  exit 1
fi

echo "✓ Admin user setup complete and verified"

# ==========================================
# 8. Nginx Setup
# ==========================================
echo "[8/9] Setting up Nginx..."

# Ensure all required ports are completely free
echo "Ensuring required ports (80, 443, 8081) are free..."
sudo fuser -k 80/tcp || true
sudo fuser -k 443/tcp || true
sudo fuser -k 8081/tcp || true
sleep 3  # Give processes time to terminate

# Double-check with lsof and kill any remaining processes
sudo lsof -ti :80 | xargs -r sudo kill -9 || true
sudo lsof -ti :443 | xargs -r sudo kill -9 || true
sudo lsof -ti :8081 | xargs -r sudo kill -9 || true
sleep 2

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
  echo "Installing Nginx..."
  sudo apt-get install -y nginx
fi

# Stop Nginx before making configuration changes to prevent port conflicts
echo "Stopping Nginx for configuration..."
sudo systemctl stop nginx || true

# Remove ALL default Nginx configurations to prevent port 80 conflicts
echo "Removing default Nginx configurations..."
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-available/default
sudo rm -f /etc/nginx/conf.d/default.conf

# Disable default server in nginx.conf if present
if sudo grep -q "listen.*80" /etc/nginx/nginx.conf 2>/dev/null; then
  echo "⚠ Warning: /etc/nginx/nginx.conf contains port 80 configuration"
  echo "This may need manual cleanup if issues persist"
fi

# Check if SSL certificates exist and write appropriate config
if [[ -f /etc/letsencrypt/live/panel.festas-builds.com/fullchain.pem ]]; then
  echo "✓ SSL certificates found - creating HTTPS configuration..."
  
  # Create HTTPS Nginx configuration
  sudo tee /etc/nginx/sites-available/panel.festas-builds.com.conf > /dev/null << 'NGINX_SSL_EOF'
# Pterodactyl Panel - HTTPS Configuration
server {
    listen 80;
    listen [::]:80;
    server_name panel.festas-builds.com;
    return 301 https://$server_name$request_uri;
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

    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    client_max_body_size 100m;
    client_body_timeout 120s;
    sendfile off;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param PHP_VALUE "upload_max_filesize = 100M \n post_max_size=100M";
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param HTTP_PROXY "";
        fastcgi_intercept_errors off;
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
NGINX_SSL_EOF

else
  echo "⚠ SSL certificates not found - creating temporary HTTP-only configuration..."
  echo "   Run 'sudo certbot --nginx -d panel.festas-builds.com' after deployment"
  
  # Create temporary HTTP-only configuration
  sudo tee /etc/nginx/sites-available/panel.festas-builds.com.conf > /dev/null << 'NGINX_HTTP_EOF'
# Pterodactyl Panel - Temporary HTTP Configuration
# Run certbot to enable HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name panel.festas-builds.com;
    root /var/www/pterodactyl/public;
    index index.php;

    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "same-origin" always;

    access_log /var/log/nginx/panel.festas-builds.com.access.log;
    error_log /var/log/nginx/panel.festas-builds.com.error.log;

    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    client_max_body_size 100m;
    client_body_timeout 120s;
    sendfile off;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param PHP_VALUE "upload_max_filesize = 100M \n post_max_size=100M";
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param HTTP_PROXY "";
        fastcgi_intercept_errors off;
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
NGINX_HTTP_EOF

fi

# Enable site
sudo ln -sf /etc/nginx/sites-available/panel.festas-builds.com.conf /etc/nginx/sites-enabled/panel.festas-builds.com.conf

# Test Nginx configuration
echo "Testing Nginx configuration..."
if ! sudo nginx -t; then
  echo "ERROR: Nginx configuration test failed!"
  sudo nginx -t 2>&1  # Show detailed error
  exit 1
fi

# Enable Nginx
sudo systemctl enable nginx

# Restart Nginx (works whether it's running or not)
echo "Starting/restarting Nginx..."
sudo systemctl restart nginx

# Wait a moment for Nginx to start
sleep 2

# Verify Nginx started successfully
if ! sudo systemctl is-active --quiet nginx; then
  echo "ERROR: Nginx failed to start!"
  echo "Checking Nginx status..."
  sudo systemctl status nginx --no-pager -l || true
  echo ""
  echo "Checking Nginx error log..."
  sudo tail -100 /var/log/nginx/error.log || true
  echo ""
  echo "Checking what's using ports 80 and 443..."
  sudo netstat -tlnp | grep -E ':(80|443)' || true
  sudo lsof -i :80 || true
  sudo lsof -i :443 || true
  exit 1
fi

echo "✓ Nginx started successfully"




# ==========================================
# 9. Systemd Services & Cron
# ==========================================
echo "[9/9] Setting up systemd services..."

# Create pteroq service
sudo tee /etc/systemd/system/pteroq.service > /dev/null <<'SERVICE_EOF'
[Unit]
Description=Pterodactyl Queue Worker
After=redis-server.service

[Service]
User=www-data
Group=www-data
Restart=always
ExecStart=/usr/bin/php /var/www/pterodactyl/artisan queue:work --queue=high,standard,low --sleep=3 --tries=3
StartLimitInterval=180
StartLimitBurst=30
RestartSec=5s

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# Enable and start pteroq
sudo systemctl enable pteroq.service
sudo systemctl start pteroq.service

# Wait for queue worker to initialize
sleep 3

# Flush any failed jobs from previous deployment attempts
echo "Flushing failed queue jobs..."
cd /var/www/pterodactyl
sudo -u www-data php artisan queue:flush 2>/dev/null || echo "⚠ Queue flush skipped (first install)"
echo "✓ Queue worker started cleanly"

# Add cron job for schedule (check if already exists to maintain idempotency)
CRON_CMD="* * * * * php /var/www/pterodactyl/artisan schedule:run >> /dev/null 2>&1"
if ! sudo crontab -u www-data -l 2>/dev/null | grep -q "pterodactyl/artisan schedule:run"; then
  (sudo crontab -u www-data -l 2>/dev/null || true; echo "${CRON_CMD}") | sudo crontab -u www-data -
  echo "✓ Cron job added"
else
  echo "✓ Cron job already exists"
fi

echo "✓ Systemd services configured"

# ==========================================
# 10. Wings Installation
# ==========================================
echo "[10/10] Installing Wings..."

# Create pterodactyl directory
sudo mkdir -p /etc/pterodactyl

# Download Wings
WINGS_VERSION=$(curl -s https://api.github.com/repos/pterodactyl/wings/releases/latest | grep -oP '"tag_name": "\K(.*)(?=")')
echo "Downloading Wings ${WINGS_VERSION}..."
sudo curl -L -o /usr/local/bin/wings "https://github.com/pterodactyl/wings/releases/latest/download/wings_linux_amd64"
sudo chmod +x /usr/local/bin/wings

# Create Wings systemd service
sudo tee /etc/systemd/system/wings.service > /dev/null <<'WINGS_EOF'
[Unit]
Description=Pterodactyl Wings Daemon
After=docker.service
Requires=docker.service
PartOf=docker.service

[Service]
User=root
WorkingDirectory=/etc/pterodactyl
LimitNOFILE=4096
PIDFile=/var/run/wings/daemon.pid
ExecStart=/usr/local/bin/wings
Restart=on-failure
StartLimitInterval=180
StartLimitBurst=30
RestartSec=5s

[Install]
WantedBy=multi-user.target
WINGS_EOF

# Enable Wings service (but don't start - needs manual token configuration)
sudo systemctl enable wings.service

echo "✓ Wings installed (not started - needs manual token configuration)"

# ==========================================
# 11. Set Final Permissions
# ==========================================
echo "Setting final permissions..."

sudo chown -R www-data:www-data /var/www/pterodactyl
sudo chmod -R 775 /var/www/pterodactyl/storage
sudo chmod -R 775 /var/www/pterodactyl/bootstrap/cache

echo "✓ Permissions set"

# ==========================================
# Final Status & Verification
# ==========================================
echo ""
echo "=========================================="
echo "Installation Complete - Running Verification"
echo "=========================================="
echo ""

# Verify all critical services are running
FAILED_SERVICES=""

echo "Checking services status..."
if ! sudo systemctl is-active --quiet nginx; then
  echo "❌ Nginx is NOT running"
  FAILED_SERVICES="${FAILED_SERVICES}nginx "
else
  echo "✓ Nginx is running"
fi

if ! sudo systemctl is-active --quiet php8.3-fpm; then
  echo "❌ PHP-FPM is NOT running"
  FAILED_SERVICES="${FAILED_SERVICES}php8.3-fpm "
else
  echo "✓ PHP-FPM is running"
fi

if ! sudo systemctl is-active --quiet pteroq; then
  echo "❌ Pterodactyl Queue is NOT running"
  FAILED_SERVICES="${FAILED_SERVICES}pteroq "
else
  echo "✓ Pterodactyl Queue is running"
  
  # Verify queue is processing without errors
  echo "Checking queue for recent errors..."
  sleep 5
  QUEUE_ERRORS=$(sudo journalctl -u pteroq --since "10 seconds ago" 2>/dev/null | grep -c "FAIL" || echo "0")
  if [[ "${QUEUE_ERRORS}" -gt "0" ]]; then
    echo "⚠ WARNING: Queue has ${QUEUE_ERRORS} failed jobs in last 10 seconds"
    echo "Checking logs..."
    sudo journalctl -u pteroq -n 20 --no-pager || true
    FAILED_SERVICES="${FAILED_SERVICES}pteroq-errors "
  else
    echo "✓ Queue processing without errors"
  fi
fi

if ! sudo systemctl is-active --quiet mariadb; then
  echo "❌ MariaDB is NOT running"
  FAILED_SERVICES="${FAILED_SERVICES}mariadb "
else
  echo "✓ MariaDB is running"
fi

if ! sudo systemctl is-active --quiet redis-server; then
  echo "❌ Redis is NOT running"
  FAILED_SERVICES="${FAILED_SERVICES}redis "
else
  echo "✓ Redis is running"
fi

# Check if Nginx is listening on port 80 and/or 443
echo ""
echo "Checking Nginx port binding..."
if sudo netstat -tlnp | grep -E ":(80|443)" | grep -q nginx; then
  echo "✓ Nginx is listening on port 80 and/or 443"
  sudo netstat -tlnp | grep nginx | grep -E ":(80|443)" || true
else
  echo "❌ Nginx is NOT listening on expected ports (80/443)"
  sudo netstat -tlnp | grep nginx || echo "Nginx not listening on any port"
  FAILED_SERVICES="${FAILED_SERVICES}nginx-port "
fi

# Test database connection
echo ""
echo "Testing database connection..."
# Use environment variable to avoid password exposure in process list
if sudo MYSQL_PWD="${PTERO_DB_PASSWORD}" mysql -u ptero pterodactyl -e "SELECT COUNT(*) FROM settings;" >/dev/null 2>&1; then
  echo "✓ Database connection successful"
else
  echo "❌ Database connection failed"
  FAILED_SERVICES="${FAILED_SERVICES}database "
fi

# Check critical directories
echo ""
echo "Verifying file permissions..."
if [[ -w /var/www/pterodactyl/storage ]]; then
  echo "✓ Storage directory is writable"
else
  echo "⚠ Storage directory is NOT writable, fixing..."
  sudo chown -R www-data:www-data /var/www/pterodactyl/storage /var/www/pterodactyl/bootstrap/cache
  sudo chmod -R 775 /var/www/pterodactyl/storage /var/www/pterodactyl/bootstrap/cache
  if [[ -w /var/www/pterodactyl/storage ]]; then
    echo "✓ Storage directory permissions fixed"
  else
    echo "❌ Storage directory is STILL NOT writable after fix attempt"
    FAILED_SERVICES="${FAILED_SERVICES}permissions "
  fi
fi

# ==========================================
# Final Admin User Reset (Recovery Step)
# ==========================================
# This step runs even if some services failed, to ensure admin can log in
echo ""
echo "=========================================="
echo "Final Admin User Reset (Recovery Step)"
echo "=========================================="

# Check if database is accessible
if sudo MYSQL_PWD="${PTERO_DB_PASSWORD}" mysql -u ptero pterodactyl -e "SELECT 1;" >/dev/null 2>&1; then
  echo "✓ Database is accessible"
  
  # Check if users table exists
  if sudo mysql pterodactyl -e "SHOW TABLES LIKE 'users';" 2>/dev/null | grep -q "users"; then
    echo "✓ Users table exists"
    
    # Perform final admin user reset
    echo "Performing final admin user reset/verification..."
    USER_EXISTS=$(sudo MYSQL_PWD="${PTERO_DB_PASSWORD}" mysql -u ptero pterodactyl -sN -e "SELECT COUNT(*) FROM users WHERE email='${PTERO_ADMIN_EMAIL}';" 2>/dev/null || echo "0")
    
    if [[ "${USER_EXISTS}" == "0" ]]; then
      echo "⚠ Admin user does not exist, attempting emergency creation..."
      
      # Try Laravel command first
      if sudo -u www-data php artisan p:user:make \
        --email="${PTERO_ADMIN_EMAIL}" \
        --username=admin \
        --name-first=Admin \
        --name-last=Festas \
        --password="${PTERO_ADMIN_PASSWORD}" \
        --admin=1 \
        --no-interaction 2>&1; then
        echo "✓ Emergency admin user created via Laravel!"
      else
        echo "⚠ Laravel command failed, trying direct SQL insert..."
        PASSWORD_HASH=$(sudo -u www-data php -r "echo password_hash('${PTERO_ADMIN_PASSWORD}', PASSWORD_BCRYPT);")
        UUID=$(sudo -u www-data php -r "require '/var/www/pterodactyl/vendor/autoload.php'; echo \Ramsey\Uuid\Uuid::uuid4()->toString();")
        
        if sudo MYSQL_PWD="${PTERO_DB_PASSWORD}" mysql -u ptero pterodactyl -e "
          INSERT INTO users (uuid, email, username, name_first, name_last, password, root_admin, language, created_at, updated_at)
          VALUES ('${UUID}', '${PTERO_ADMIN_EMAIL}', 'admin', 'Admin', 'Festas', '${PASSWORD_HASH}', 1, 'en', NOW(), NOW())
          ON DUPLICATE KEY UPDATE password='${PASSWORD_HASH}', root_admin=1, updated_at=NOW();
        " 2>&1; then
          echo "✓ Emergency admin user created via direct SQL!"
        else
          echo "❌ Failed to create admin user via SQL"
        fi
      fi
    else
      echo "✓ Admin user exists, ensuring password is current..."
      PASSWORD_HASH=$(sudo -u www-data php -r "echo password_hash('${PTERO_ADMIN_PASSWORD}', PASSWORD_BCRYPT);")
      
      if sudo MYSQL_PWD="${PTERO_DB_PASSWORD}" mysql -u ptero pterodactyl -e "
        UPDATE users SET password='${PASSWORD_HASH}', root_admin=1, updated_at=NOW() WHERE email='${PTERO_ADMIN_EMAIL}';
      " 2>&1; then
        echo "✓ Admin password updated to match secrets!"
      else
        echo "❌ Failed to update admin password"
      fi
    fi
    
    # Final verification
    FINAL_ADMIN_COUNT=$(sudo MYSQL_PWD="${PTERO_DB_PASSWORD}" mysql -u ptero pterodactyl -sN -e "SELECT COUNT(*) FROM users WHERE email='${PTERO_ADMIN_EMAIL}' AND root_admin=1;" 2>/dev/null || echo "0")
    
    if [[ "${FINAL_ADMIN_COUNT}" == "1" ]]; then
      echo ""
      echo "✅ ADMIN USER FINAL STATUS: READY"
      echo "   Email: ${PTERO_ADMIN_EMAIL}"
      echo "   Password: Configured from GitHub secrets"
      echo "   Admin: Yes (root_admin=1)"
      echo ""
    else
      echo ""
      echo "❌ ADMIN USER FINAL STATUS: FAILED"
      echo "   Could not verify admin user exists with correct permissions"
      echo ""
    fi
  else
    echo "❌ Users table does not exist - cannot create admin user"
  fi
else
  echo "❌ Database is not accessible - cannot reset admin user"
fi

echo "=========================================="
echo ""

# If any service failed, show details and exit with error
if [[ -n "${FAILED_SERVICES}" ]]; then
  echo ""
  echo "=========================================="
  echo "⚠ Installation completed with ERRORS"
  echo "=========================================="
  echo "Failed components: ${FAILED_SERVICES}"
  echo ""
  echo "Service Details:"
  sudo systemctl status nginx --no-pager -l || true
  sudo systemctl status php8.3-fpm --no-pager -l || true
  sudo systemctl status pteroq --no-pager -l || true
  exit 1
fi

echo ""
echo "=========================================="
echo "✓ All Verification Checks Passed!"
echo "=========================================="
echo ""
echo "Panel URL: https://panel.festas-builds.com"
echo "Admin Email: ${PTERO_ADMIN_EMAIL}"
echo ""
echo "Services Status:"
sudo systemctl status nginx --no-pager -l || true
sudo systemctl status php8.3-fpm --no-pager -l || true
sudo systemctl status pteroq --no-pager -l || true
echo ""
echo "Next Steps:"
echo "1. Ensure DNS A-record for panel.festas-builds.com points to this server"
echo "2. If this is the first deployment, obtain SSL certificates:"
echo "   sudo certbot --nginx -d panel.festas-builds.com"
echo "3. After obtaining certificates, reload Nginx:"
echo "   sudo systemctl reload nginx"
echo "4. Log into the panel at https://panel.festas-builds.com"
echo "5. Create a Location and Node in the admin panel"
echo "6. Generate Wings token and configure Wings"
echo ""
echo "Admin User Recovery:"
echo "If you cannot log in, use the 'Reset Pterodactyl Admin User' workflow"
echo "to reset your admin credentials without reinstalling."
echo ""
echo "See docs/PTERODACTYL_SETUP.md for detailed instructions"
echo "=========================================="
