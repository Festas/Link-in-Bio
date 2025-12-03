# Deploy Script Guide

This guide explains how to use the `scripts/deploy.sh` script for reliable, idempotent deployments of the Link-in-Bio application.

## Overview

The deploy script (`scripts/deploy.sh`) addresses common deployment issues by:

1. **Writing docker-compose.yml via heredoc** - Prevents escaped/quoted line issues that can occur when generating files through SSH actions
2. **Validating environment files** - Ensures `.env` and `.env.social` exist before deployment
3. **Setting up Caddy volumes** - Creates Docker volumes with correct ownership (UID 1000) so Caddy can write ACME certificates
4. **Waiting for service health** - Waits for the web service to become healthy before running migrations
5. **Retrying migrations** - Attempts Alembic migrations with retries, falling back to `init_databases.py` if needed
6. **Providing detailed logs** - Outputs helpful debugging information when something fails

## Prerequisites

Before running the deploy script:

1. **Docker and Docker Compose** must be installed on the server
2. **Repository must be cloned** to the server (or the required files present)
3. **`.env` file** must exist with required configuration (copy from `.env.example`)
4. **`.env.social` file** must exist (can be empty if no social media integration needed)

## Usage

### Local/Manual Deployment

```bash
# SSH into your server
ssh deploy@YOUR_SERVER_IP

# Navigate to the application directory
cd /srv/link-in-bio

# Ensure .env files exist
cp .env.example .env
nano .env  # Edit with your configuration

touch .env.social
# Or copy from template: cp .env.social.example .env.social

# Run the deploy script
./scripts/deploy.sh
```

### GitHub Actions Integration

To use this script in your GitHub Actions workflow, update `.github/workflows/deploy.yml` to:

1. Copy the required files and secrets to the server
2. Run the deploy script instead of generating docker-compose.yml inline

Example workflow snippet:

```yaml
- name: Deploy to Server
  uses: appleboy/ssh-action@v1.0.3
  env:
    ENV_FILE: ${{ secrets.ENV_FILE }}
    INSTAGRAM_SECRET: ${{ secrets.INSTAGRAM_SECRET }}
    TIKTOK_SECRET: ${{ secrets.TIKTOK_SECRET }}
  with:
    host: ${{ secrets.HOST }}
    username: ${{ secrets.USERNAME }}
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    envs: ENV_FILE,INSTAGRAM_SECRET,TIKTOK_SECRET
    script: |
      set -euo pipefail
      APP_DIR="/srv/link-in-bio"
      cd "$APP_DIR"
      
      # Update repository
      git pull origin main
      
      # Write .env file from secret
      echo "${ENV_FILE}" > .env
      chmod 600 .env
      
      # Write .env.social file from secrets
      > .env.social
      [[ -n "${INSTAGRAM_SECRET:-}" ]] && echo "${INSTAGRAM_SECRET}" >> .env.social
      [[ -n "${TIKTOK_SECRET:-}" ]] && echo "${TIKTOK_SECRET}" >> .env.social
      chmod 600 .env.social
      
      # Run the deploy script
      ./scripts/deploy.sh
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `COMPOSE_PROJECT_NAME` | `linkinbio` | Docker Compose project name. Used to create predictable volume names. |

## COMPOSE_PROJECT_NAME

The script sets `COMPOSE_PROJECT_NAME=linkinbio` to ensure Docker volume names are predictable:

- `linkinbio_caddy_data` - Caddy certificates and ACME data
- `linkinbio_caddy_config` - Caddy configuration

This allows the script to pre-create and set correct ownership on these volumes before Caddy starts.

## Troubleshooting

### docker-compose.yml parsing errors

**Symptom:** `Invalid docker-compose.yml` or YAML parsing errors in workflow logs.

**Cause:** When generating docker-compose.yml via SSH commands with echo/printf, special characters can get escaped incorrectly.

**Solution:** The deploy script uses a heredoc to write docker-compose.yml, avoiding escaping issues entirely.

### Missing .env or .env.social

**Symptom:** 
```
ERROR: .env file is missing in repository root.
```

**Solution:** Create the required files before running the deploy script:

```bash
# Copy from examples
cp .env.example .env
cp .env.social.example .env.social

# Or create empty .env.social if not using social features
touch .env.social
```

### Caddy ACME/certificate errors

**Symptom:** 
```
ACME account creation failed
Error opening /data/...
```

**Cause:** Caddy cannot write to the `/data` directory because the Docker volume has incorrect permissions.

**Solution:** The deploy script automatically creates volumes with correct ownership (UID 1000). If issues persist:

```bash
# Manually fix volume permissions
docker run --rm -v linkinbio_caddy_data:/data alpine sh -c "chown -R 1000:1000 /data"
docker run --rm -v linkinbio_caddy_config:/data alpine sh -c "chown -R 1000:1000 /data"
```

### Alembic migration failures

**Symptom:**
```
alembic failed, retrying in 5s (1/6)
```

**Cause:** Database not ready when migrations run, or database connection issues.

**Solution:** The script:
1. Waits for the web service to become healthy before running migrations
2. Retries Alembic up to 6 times with 5-second delays
3. Falls back to `init_databases.py` if Alembic fails

If migrations still fail, check:
- Database configuration in `.env`
- Database container is running and accessible
- Web container logs for connection errors

```bash
# Check logs
docker compose logs --tail=100 web

# Manually run init_databases.py
docker compose exec web python init_databases.py
```

### Web service not becoming healthy

**Symptom:**
```
WARNING: Web service did not become healthy within timeout
```

**Cause:** Application startup issues, missing dependencies, or configuration errors.

**Solution:** Check web container logs:

```bash
docker compose logs --tail=100 web
```

Common issues:
- Missing or invalid `.env` configuration
- Database connection failures
- Missing Python dependencies

### Container startup failures

**Symptom:**
```
ERROR: docker compose up failed
```

**Solution:** Check the detailed output which includes:
- Docker Compose configuration
- Container status
- Recent container logs

Common issues:
- Port conflicts (80/443 already in use)
- Invalid Caddyfile syntax
- Docker image build failures

## Files Modified by Deploy Script

The deploy script modifies or creates:

| File | Action |
|------|--------|
| `docker-compose.yml` | Overwritten with canonical version |
| `data/` | Created if missing |
| `static/uploads/` | Created if missing |

## Comparison with Previous Deploy Method

| Issue | Previous Method | New Method |
|-------|-----------------|------------|
| docker-compose.yml escaping | printf with shell escaping | Heredoc (no escaping needed) |
| Caddy volume permissions | Not handled | Pre-creates with UID 1000 |
| .env validation | Weak/implicit | Explicit validation with clear errors |
| Migration timing | Immediate (may fail) | Waits for health + 6 retries |
| Fallback | Single attempt | Falls back to init_databases.py |
| Debug info | Limited | Comprehensive logs on failure |

## Related Documentation

- [DEPLOY.md](../DEPLOY.md) - Registry-based deployment guide (GHCR)
- [docs/HETZNER_DEPLOYMENT.md](HETZNER_DEPLOYMENT.md) - Hetzner server setup guide
- [deploy/bootstrap.sh](../deploy/bootstrap.sh) - Server bootstrap script
