#!/usr/bin/env bash
#
# deploy.sh - Robust deploy script for Link-in-Bio
#
# This script is designed to be run on the target Hetzner server after cloning/updating the repo.
# It ensures docker-compose.yml is written safely (heredoc), validates env files,
# ensures Caddy volumes exist with correct ownership, and runs migrations with retries.
#
# Usage:
#   ./scripts/deploy.sh
#
# Environment variables:
#   COMPOSE_PROJECT_NAME - Docker Compose project name (default: linkinbio)
#
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$SCRIPT_DIR/.."

echo "========================================"
echo "Link-in-Bio Deploy Script"
echo "========================================"
echo "Working directory: $(pwd)"
echo ""

# ==========================================
# 1. Generate canonical docker-compose.yml
# ==========================================
echo "[1/6] Writing docker-compose.yml..."

# Use heredoc to prevent escaped/quoted line issues from SSH actions
cat > docker-compose.yml <<'EOF'
version: "3.8"
services:
  web:
    build: .
    container_name: linktree_app
    restart: unless-stopped
    volumes:
      - ./data:/app/data
      - ./static/uploads:/app/static/uploads
      - ./.env:/app/.env:ro
      - ./.env.social:/app/.env.social:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  caddy:
    image: caddy:latest
    container_name: caddy_server
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - web

volumes:
  caddy_data:
  caddy_config:
EOF

# Validate docker-compose.yml syntax
if ! docker compose -f docker-compose.yml config > /dev/null 2>&1; then
  echo "ERROR: Generated docker-compose.yml is invalid"
  echo "--- docker-compose.yml contents ---"
  cat docker-compose.yml
  echo "--- docker compose config output ---"
  docker compose -f docker-compose.yml config || true
  exit 1
fi
echo "✓ docker-compose.yml created and validated"

# ==========================================
# 2. Validate required env files
# ==========================================
echo ""
echo "[2/6] Validating environment files..."

if [ ! -f ".env" ]; then
  echo "ERROR: .env file is missing in repository root."
  echo "Please create .env with required configuration before deploying."
  echo "See .env.example for template."
  exit 1
fi
echo "✓ .env file exists"

if [ ! -f ".env.social" ]; then
  echo "ERROR: .env.social file is missing in repository root."
  echo "Please create .env.social (can be empty if no social media integration needed)."
  echo "See .env.social.example for template."
  exit 1
fi
echo "✓ .env.social file exists"

# ==========================================
# 3. Ensure Caddy volumes exist with correct ownership
# ==========================================
echo ""
echo "[3/6] Ensuring Caddy volumes have correct permissions..."

# Use a fixed compose project name so volume names are predictable
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-linkinbio}"

for vol in "${COMPOSE_PROJECT_NAME}_caddy_data" "${COMPOSE_PROJECT_NAME}_caddy_config"; do
  echo "  - Creating/checking volume: $vol"
  docker volume create "$vol" >/dev/null 2>&1 || true
  # Ensure volume is owned by UID 1000 (Caddy's default user)
  docker run --rm -v "$vol":/data alpine sh -c "mkdir -p /data && chown -R 1000:1000 /data" 2>/dev/null || {
    echo "  WARNING: Could not set ownership on $vol (may require sudo)"
  }
done
echo "✓ Caddy volumes prepared"

# ==========================================
# 4. Pull images and start containers
# ==========================================
echo ""
echo "[4/6] Starting containers..."

# Create required directories
mkdir -p data static/uploads

# Pull images (ignore failures for build-only services)
docker compose pull --ignore-pull-failures 2>/dev/null || true

# Build and start containers
if ! docker compose up -d --build; then
  echo ""
  echo "ERROR: docker compose up failed"
  echo ""
  echo "=== Docker Compose Config ==="
  docker compose -f docker-compose.yml config || true
  echo ""
  echo "=== Container Status ==="
  docker compose ps || true
  echo ""
  echo "=== Container Logs (last 100 lines) ==="
  docker compose logs --tail=100 || true
  exit 1
fi
echo "✓ Containers started"

# ==========================================
# 5. Wait for web service to become healthy
# ==========================================
echo ""
echo "[5/6] Waiting for web service to be healthy..."

WEB_ID="$(docker compose ps -q web 2>/dev/null || true)"
WEB_HEALTHY=false

if [ -n "$WEB_ID" ]; then
  for i in $(seq 1 30); do
    STATUS=$(docker inspect -f '{{.State.Health.Status}}' "$WEB_ID" 2>/dev/null || echo "unknown")
    if [ "$STATUS" = "healthy" ]; then
      echo "✓ Web service is healthy"
      WEB_HEALTHY=true
      break
    elif [ "$STATUS" = "unhealthy" ]; then
      echo "WARNING: Web service is unhealthy after $i attempts"
      break
    fi
    echo "  Waiting for web to be healthy ($i/30)... status: $STATUS"
    sleep 2
  done
else
  echo "WARNING: Could not determine web container ID; continuing with migration attempts"
fi

if [ "$WEB_HEALTHY" = false ]; then
  echo ""
  echo "WARNING: Web service did not become healthy within timeout"
  echo "Continuing with migration attempts anyway..."
  echo ""
  echo "=== Web Container Logs ==="
  docker compose logs --tail=50 web || true
fi

# ==========================================
# 6. Run database migrations with retries
# ==========================================
echo ""
echo "[6/6] Running database migrations..."

MIGRATION_SUCCESS=false

for i in $(seq 1 6); do
  echo "  Attempt $i/6: Running alembic upgrade head..."
  if docker compose exec -T web alembic upgrade head 2>&1; then
    echo "✓ Alembic migrations completed successfully"
    MIGRATION_SUCCESS=true
    break
  fi
  
  if [ "$i" -lt 6 ]; then
    echo "  Alembic failed, retrying in 5 seconds..."
    sleep 5
  fi
done

# Fallback to init_databases.py if alembic fails
if [ "$MIGRATION_SUCCESS" = false ]; then
  echo ""
  echo "WARNING: Alembic migrations failed after 6 attempts"
  echo "Attempting fallback: python init_databases.py..."
  
  if docker compose exec -T web python init_databases.py 2>&1; then
    echo "✓ init_databases.py completed successfully"
    MIGRATION_SUCCESS=true
  else
    echo ""
    echo "ERROR: Both alembic and init_databases.py failed"
    echo ""
    echo "=== Web Container Logs (last 200 lines) ==="
    docker compose logs --tail=200 web || true
    echo ""
    echo "Please check database configuration and connectivity."
    exit 1
  fi
fi

# ==========================================
# Final status
# ==========================================
echo ""
echo "========================================"
echo "Deployment completed successfully!"
echo "========================================"
echo ""
echo "=== Container Status ==="
docker compose ps
echo ""
echo "=== Recent Logs ==="
docker compose logs --tail=20
echo ""
echo "Deploy complete!"
