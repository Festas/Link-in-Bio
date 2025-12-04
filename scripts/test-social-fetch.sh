#!/usr/bin/env bash
#
# test-social-fetch.sh - Hardened test script for social media fetch testing
#
# This script validates the environment and runs social media fetch tests.
# It provides clear, actionable error messages and creates .env.social from
# GitHub Secrets when missing.
#
# Usage:
#   ./scripts/test-social-fetch.sh [platform]
#
# Arguments:
#   platform - One of: instagram, tiktok, both (default: both)
#
# Environment variables (from GitHub Secrets):
#   INSTAGRAM_SECRET - Instagram API credentials (entire .env block)
#   TIKTOK_SECRET    - TikTok API credentials (entire .env block)
#   PROJECT_PATH     - Path to project directory (default: /srv/link-in-bio)
#
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging helpers
log_step() {
    echo -e "${BLUE}[${1}/6]${NC} $2"
}

log_success() {
    echo -e "  ${GREEN}✅${NC} $1"
}

log_error() {
    echo -e "  ${RED}❌ ERROR:${NC} $1"
}

log_warning() {
    echo -e "  ${YELLOW}⚠️${NC} $1"
}

log_info() {
    echo -e "  ℹ️  $1"
}

# Parse arguments
PLATFORM="${1:-both}"
PROJECT_PATH="${PROJECT_PATH:-/srv/link-in-bio}"

echo "=========================================="
echo "🧪 Social Media Fetch Test Script"
echo "=========================================="
echo "⏰ Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "📍 Platform: $PLATFORM"
echo "📂 Project Path: $PROJECT_PATH"
echo "=========================================="
echo ""

# ==========================================
# 1. Ensure project directory exists
# ==========================================
log_step 1 "📂 Ensuring project directory exists..."

if [ ! -d "$PROJECT_PATH" ]; then
    log_warning "Project directory $PROJECT_PATH not found."
    
    # If running in GitHub Actions, try to link GITHUB_WORKSPACE
    if [ -n "${GITHUB_WORKSPACE:-}" ] && [ -d "${GITHUB_WORKSPACE}" ]; then
        log_info "Attempting to create symlink from GITHUB_WORKSPACE..."
        mkdir -p "$(dirname "$PROJECT_PATH")"
        ln -sf "${GITHUB_WORKSPACE}" "$PROJECT_PATH"
        log_success "Linked GITHUB_WORKSPACE to $PROJECT_PATH"
    else
        log_error "Project directory missing and GITHUB_WORKSPACE not available."
        echo ""
        echo "💡 Possible solutions:"
        echo "   1. Deploy the application first using the deploy workflow"
        echo "   2. Verify the project_path input is correct"
        echo "   3. Check if the server has been properly bootstrapped"
        exit 1
    fi
fi

cd "$PROJECT_PATH"
log_success "Working directory: $(pwd)"
echo ""

# ==========================================
# 2. Check Docker Compose and web service
# ==========================================
log_step 2 "🐳 Checking Docker Compose and web service..."

# Check if docker is available
if ! command -v docker &>/dev/null; then
    log_error "docker CLI not found."
    echo ""
    echo "💡 Possible solutions:"
    echo "   1. Install Docker on the server"
    echo "   2. Ensure Docker is in the PATH"
    echo "   3. Run: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &>/dev/null; then
    log_error "Docker daemon is not running."
    echo ""
    echo "💡 Possible solutions:"
    echo "   1. Start Docker: sudo systemctl start docker"
    echo "   2. Check Docker status: sudo systemctl status docker"
    exit 1
fi

# Check if docker compose is available
if ! docker compose version &>/dev/null 2>&1; then
    log_error "Docker Compose is not available."
    echo ""
    echo "💡 Possible solutions:"
    echo "   1. Install Docker Compose plugin"
    echo "   2. Update Docker to a newer version"
    exit 1
fi

# Check if any containers are running
if ! docker compose ps &>/dev/null 2>&1; then
    log_error "Docker Compose is not configured or not running in this directory."
    echo ""
    echo "💡 Possible solutions:"
    echo "   1. Ensure docker-compose.yml exists in $PROJECT_PATH"
    echo "   2. Run: docker compose up -d"
    exit 1
fi

# Check if the web service is running
if ! docker compose ps --services --filter status=running 2>/dev/null | grep -q "^web$"; then
    log_error "Web service is not running."
    echo ""
    echo "Current container status:"
    docker compose ps || true
    echo ""
    echo "💡 Possible solutions:"
    echo "   1. Start the web service: docker compose up -d web"
    echo "   2. Check logs: docker compose logs web"
    echo "   3. Redeploy the application"
    exit 1
fi

log_success "Docker Compose is running"
log_success "Web service is running"
docker compose ps
echo ""

# ==========================================
# 3. Check and create .env.social
# ==========================================
log_step 3 "🔑 Checking credentials configuration..."

ENV_SOCIAL_FILE="${PROJECT_PATH}/.env.social"
SECRETS_AVAILABLE=false

# Check if .env.social exists
if [ ! -f "$ENV_SOCIAL_FILE" ]; then
    log_warning ".env.social file not found."
    log_info "Attempting to create from GitHub Secrets..."
    
    # Check if any secrets are available
    if [ -n "${INSTAGRAM_SECRET:-}" ] || [ -n "${TIKTOK_SECRET:-}" ]; then
        SECRETS_AVAILABLE=true
        
        # Create .env.social from secrets
        {
            echo "# Auto-generated from GitHub Secrets"
            echo "# Generated at: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
            echo ""
            
            if [ -n "${INSTAGRAM_SECRET:-}" ]; then
                echo "# Instagram credentials"
                echo "${INSTAGRAM_SECRET}"
                echo ""
            fi
            
            if [ -n "${TIKTOK_SECRET:-}" ]; then
                echo "# TikTok credentials"
                echo "${TIKTOK_SECRET}"
                echo ""
            fi
        } > "$ENV_SOCIAL_FILE"
        
        log_success ".env.social created from GitHub Secrets"
    else
        log_error ".env.social is missing and no GitHub Secrets are available."
        echo ""
        echo "💡 To fix this, configure GitHub Secrets:"
        echo "   1. Go to Repository → Settings → Secrets and variables → Actions"
        echo "   2. Add secret 'INSTAGRAM_SECRET' with your Instagram credentials"
        echo "   3. Add secret 'TIKTOK_SECRET' with your TikTok credentials"
        echo ""
        echo "   See docs/SOCIAL_TOKENS.md for detailed instructions on obtaining tokens."
        exit 1
    fi
else
    log_success ".env.social file exists"
fi

# Validate credentials for requested platforms
if [ "$PLATFORM" = "instagram" ] || [ "$PLATFORM" = "both" ]; then
    echo ""
    log_info "Checking Instagram credentials..."
    
    INSTAGRAM_CONFIGURED=true
    
    if grep -qE "^INSTAGRAM_ACCESS_TOKEN=.+" "$ENV_SOCIAL_FILE" 2>/dev/null; then
        log_success "INSTAGRAM_ACCESS_TOKEN is configured"
    else
        log_warning "INSTAGRAM_ACCESS_TOKEN is missing or empty"
        INSTAGRAM_CONFIGURED=false
    fi
    
    if grep -q "INSTAGRAM_USERNAME=" "$ENV_SOCIAL_FILE" 2>/dev/null; then
        INSTA_USER=$(grep "INSTAGRAM_USERNAME=" "$ENV_SOCIAL_FILE" | head -n1 | cut -d'=' -f2)
        log_success "INSTAGRAM_USERNAME: @$INSTA_USER"
    else
        log_warning "INSTAGRAM_USERNAME not found"
        INSTAGRAM_CONFIGURED=false
    fi
    
    if grep -qE "^INSTAGRAM_APP_ID=.+" "$ENV_SOCIAL_FILE" 2>/dev/null; then
        log_success "INSTAGRAM_APP_ID is configured"
    else
        log_warning "INSTAGRAM_APP_ID is missing (token refresh will not work)"
    fi
    
    if grep -qE "^INSTAGRAM_APP_SECRET=.+" "$ENV_SOCIAL_FILE" 2>/dev/null; then
        log_success "INSTAGRAM_APP_SECRET is configured"
    else
        log_warning "INSTAGRAM_APP_SECRET is missing (token refresh will not work)"
    fi
    
    if [ "$INSTAGRAM_CONFIGURED" = false ] && [ "$PLATFORM" = "instagram" ]; then
        log_error "Required Instagram credentials are missing."
        echo ""
        echo "💡 Required environment variables:"
        echo "   INSTAGRAM_ACCESS_TOKEN - Long-lived access token"
        echo "   INSTAGRAM_USERNAME     - Instagram username (without @)"
        echo ""
        echo "   See docs/SOCIAL_TOKENS.md for instructions."
        exit 1
    fi
fi

if [ "$PLATFORM" = "tiktok" ] || [ "$PLATFORM" = "both" ]; then
    echo ""
    log_info "Checking TikTok credentials..."
    
    TIKTOK_CONFIGURED=true
    
    if grep -qE "^TIKTOK_ACCESS_TOKEN=.+" "$ENV_SOCIAL_FILE" 2>/dev/null; then
        log_success "TIKTOK_ACCESS_TOKEN is configured"
    else
        log_warning "TIKTOK_ACCESS_TOKEN is missing or empty"
        TIKTOK_CONFIGURED=false
    fi
    
    if grep -qE "^TIKTOK_REFRESH_TOKEN=.+" "$ENV_SOCIAL_FILE" 2>/dev/null; then
        log_success "TIKTOK_REFRESH_TOKEN is configured"
    else
        log_warning "TIKTOK_REFRESH_TOKEN is missing (token refresh will not work)"
    fi
    
    if grep -qE "^TIKTOK_CLIENT_KEY=.+" "$ENV_SOCIAL_FILE" 2>/dev/null; then
        log_success "TIKTOK_CLIENT_KEY is configured"
    else
        log_warning "TIKTOK_CLIENT_KEY is missing (token refresh will not work)"
    fi
    
    if grep -qE "^TIKTOK_CLIENT_SECRET=.+" "$ENV_SOCIAL_FILE" 2>/dev/null; then
        log_success "TIKTOK_CLIENT_SECRET is configured"
    else
        log_warning "TIKTOK_CLIENT_SECRET is missing (token refresh will not work)"
    fi
    
    if [ "$TIKTOK_CONFIGURED" = false ] && [ "$PLATFORM" = "tiktok" ]; then
        log_error "Required TikTok credentials are missing."
        echo ""
        echo "💡 Required environment variables:"
        echo "   TIKTOK_ACCESS_TOKEN  - Access token from OAuth flow"
        echo "   TIKTOK_REFRESH_TOKEN - Refresh token for daily renewal"
        echo ""
        echo "   See docs/SOCIAL_TOKENS.md for instructions."
        exit 1
    fi
fi

echo ""

# ==========================================
# 4. Verify web container can access .env.social
# ==========================================
log_step 4 "🔍 Verifying container access to credentials..."

# Check if .env.social is mounted in the container
if docker compose exec -T web test -f /app/.env.social 2>/dev/null; then
    log_success "Container can access .env.social"
else
    log_warning "Container may not have access to .env.social"
    log_info "Restarting web service to pick up new credentials..."
    docker compose restart web
    sleep 5
    
    if docker compose exec -T web test -f /app/.env.social 2>/dev/null; then
        log_success "Container now has access to .env.social"
    else
        log_error "Container cannot access .env.social after restart"
        echo ""
        echo "💡 Possible solutions:"
        echo "   1. Ensure .env.social is in docker-compose.yml volumes"
        echo "   2. Check file permissions: chmod 644 .env.social"
        exit 1
    fi
fi

echo ""

# ==========================================
# 5. Run fetch scripts
# ==========================================
log_step 5 "🚀 Running fetch scripts..."
echo ""

INSTAGRAM_SUCCESS=false
TIKTOK_SUCCESS=false
INSTAGRAM_RAN=false
TIKTOK_RAN=false

# Run Instagram fetch if requested
if [ "$PLATFORM" = "instagram" ] || [ "$PLATFORM" = "both" ]; then
    INSTAGRAM_RAN=true
    echo "=========================================="
    echo "📸 INSTAGRAM STATS FETCH"
    echo "=========================================="
    echo "⏰ Started at: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    echo ""
    
    if docker compose exec -T web python fetch_instagram_stats.py 2>&1; then
        INSTAGRAM_SUCCESS=true
        echo ""
        log_success "Instagram fetch completed successfully"
    else
        EXIT_CODE=$?
        echo ""
        log_error "Instagram fetch failed (exit code: $EXIT_CODE)"
        echo ""
        echo "💡 Common issues and solutions:"
        echo "   • 'No Instagram Business Account found':"
        echo "      - Ensure account is a Business/Creator account (not Personal)"
        echo "      - Link Instagram to a Facebook Page"
        echo "      - Verify the App has 'instagram_basic' permission"
        echo "   • 'Token expired or invalid':"
        echo "      - Regenerate the access token in Meta Developer Portal"
        echo "      - Update INSTAGRAM_SECRET in GitHub Secrets"
        echo "   • 'Permission denied':"
        echo "      - Add 'instagram_basic' and 'pages_read_engagement' permissions"
    fi
    
    echo "⏰ Finished at: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    echo "=========================================="
    echo ""
fi

# Run TikTok fetch if requested
if [ "$PLATFORM" = "tiktok" ] || [ "$PLATFORM" = "both" ]; then
    TIKTOK_RAN=true
    echo "=========================================="
    echo "🎵 TIKTOK STATS FETCH"
    echo "=========================================="
    echo "⏰ Started at: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    echo ""
    
    if docker compose exec -T web python fetch_tiktok_stats.py 2>&1; then
        TIKTOK_SUCCESS=true
        echo ""
        log_success "TikTok fetch completed successfully"
    else
        EXIT_CODE=$?
        echo ""
        log_error "TikTok fetch failed (exit code: $EXIT_CODE)"
        echo ""
        echo "💡 Common issues and solutions:"
        echo "   • '401 Unauthorized':"
        echo "      - Access token has expired (24h lifetime)"
        echo "      - Regenerate tokens via TikTok Developer Portal"
        echo "      - Ensure refresh_token is valid (1 year lifetime)"
        echo "   • 'Invalid client_key':"
        echo "      - Verify TIKTOK_CLIENT_KEY matches your app"
        echo "      - Check app status in TikTok Developer Portal"
        echo "   • 'Scope not authorized':"
        echo "      - Re-authorize with 'user.info.basic' scope"
    fi
    
    echo "⏰ Finished at: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    echo "=========================================="
    echo ""
fi

# ==========================================
# 6. Summary
# ==========================================
log_step 6 "📊 Test Summary"
echo "=========================================="
echo "⏰ Completed at: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

OVERALL_SUCCESS=true

if [ "$INSTAGRAM_RAN" = "true" ]; then
    if [ "$INSTAGRAM_SUCCESS" = "true" ]; then
        echo "📸 Instagram: ✅ SUCCESS"
    else
        echo "📸 Instagram: ❌ FAILED"
        OVERALL_SUCCESS=false
    fi
else
    echo "📸 Instagram: ⏭️ SKIPPED"
fi

if [ "$TIKTOK_RAN" = "true" ]; then
    if [ "$TIKTOK_SUCCESS" = "true" ]; then
        echo "🎵 TikTok:    ✅ SUCCESS"
    else
        echo "🎵 TikTok:    ❌ FAILED"
        OVERALL_SUCCESS=false
    fi
else
    echo "🎵 TikTok:    ⏭️ SKIPPED"
fi

echo ""
echo "=========================================="

if [ "$OVERALL_SUCCESS" = "true" ]; then
    echo "🎉 All requested tests passed!"
    echo ""
    echo "📚 Next steps:"
    echo "   - View stats in the MediaKit: https://your-domain/mediakit"
    echo "   - Check database: docker compose exec web python -c \"from app.database import get_social_stats_cache; print(get_social_stats_cache('instagram'))\""
    exit 0
else
    echo "⚠️ Some tests failed. Check the logs above for details."
    echo ""
    echo "📚 Resources:"
    echo "   - Setup guide: docs/SOCIAL_TOKENS.md"
    echo "   - Instagram: docs/INSTAGRAM_INTEGRATION.md"
    echo "   - TikTok: docs/TIKTOK_INTEGRATION.md"
    exit 1
fi
