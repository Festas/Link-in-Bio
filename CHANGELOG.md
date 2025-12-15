# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt hält sich an [Semantic Versioning](https://semver.org/lang/de/).

## [2.0.0] - 2025-12-15 - Nginx Migration

### Changed
- **BREAKING**: Migrated from Dockerized Caddy to host-based Nginx reverse proxy
- Updated `docker-compose.yml` to expose web container port to `127.0.0.1:8000`
- Updated deployment workflow to deploy Nginx configurations instead of Caddy
- Updated all helper scripts to remove Caddy references and add Nginx support
- Updated firewall configuration to use standard ports 80/443 instead of 8080/8443

### Added
- Comprehensive Nginx server block configurations for all 9 domains
- SSL/TLS management via Certbot/Let's Encrypt
- Automated Nginx setup script (`scripts/setup-nginx-ssl.sh`)
- Documentation: `docs/NGINX_MIGRATION.md` - Complete migration guide
- Documentation: `docs/DEPLOYMENT_CHECKLIST.md` - Deployment procedures
- Documentation: `docs/EXTERNAL_SERVICES_PORTS.md` - Port mapping reference
- Documentation: `nginx/README.md` - Nginx configuration reference
- Security headers configuration in Nginx (X-Frame-Options, X-Content-Type-Options, etc.)
- Cache headers for static assets and application content
- WebSocket support for real-time features (Minecraft console)

### Removed
- `Caddyfile` configuration file
- Caddy service from `docker-compose.yml`
- Caddy-specific volumes and networks
- Caddy-related directory creation in deployment scripts

### Migration Notes
- All domains continue to work with identical routing logic
- SSL certificates are now managed via Certbot instead of Caddy's automatic ACME
- Docker containers must expose ports to `127.0.0.1` instead of using shared network
- Manual SSL certificate setup required for new deployments
- See `docs/NGINX_MIGRATION.md` for complete migration instructions

## [1.2.0] - 2024-11-22 - Comprehensive Project Rework

### Added
#### Documentation
- Comprehensive README.md with features, setup, deployment guide
- CONTRIBUTING.md with development workflow and guidelines  
- .env.example documenting all configuration options
- MIT LICENSE file
- Makefile with common development tasks

#### Testing Infrastructure
- Comprehensive test suite with 30 tests (18 API, 5 auth, 7 page tests)
- Pytest fixtures for reusable test components
- CI/CD workflow for automated testing, linting, security scanning
- Test coverage for all critical paths

#### Production Features
- Structured logging with JSON formatter support
- Request ID tracking middleware for better debugging
- Health check endpoint at /health for container orchestration
- Environment-based logging configuration (LOG_LEVEL, JSON_LOGS)
- Startup and shutdown event logging
- Request/response lifecycle logging

#### Security
- Password validation on startup with weak password warnings
- Content-Security-Policy (CSP) headers
- HTTP Strict-Transport-Security (HSTS) in production
- X-Request-ID headers for request tracing
- HEALTHCHECK instruction in Dockerfile

#### Developer Experience
- Black code formatter configuration
- Flake8 linter configuration
- MyPy type checker configuration
- Pytest configuration in pyproject.toml
- Comprehensive .gitignore file
- .gitkeep files for empty directories

### Changed
- Formatted all 15 Python files with black (PEP 8 compliant)
- Removed star imports, explicit imports throughout
- Fixed bare except clauses (use `Exception` instead)
- Updated TemplateResponse calls to modern API (fixes deprecation warnings)
- Organized imports following best practices
- Updated requirements.txt (duckduckgo_search → ddgs)
- Enhanced middleware with request ID tracking
- Improved error handling throughout

### Fixed
- TemplateResponse deprecation warnings in all route handlers
- Exception handling using proper Exception types
- Import organization and unused imports
- Flake8 configuration file format
- Test fixture cleanup redundancy

### Security
- Implemented weak password detection on startup
- Enhanced security headers (CSP, HSTS, XSS Protection)
- Added request ID tracking for audit trails
- Improved error handling to prevent information leakage

## [1.1.0] - Previous Release

### Added
- Background tasks for web scraping to improve UI responsiveness
- SSRF protection in scraper
- Enhanced retry logic with proxy support
- Comprehensive error handling in scraper

### Fixed
- Async/await improvements
- Database connection handling
- Steam Workshop title normalization

## [1.0.0] - Initial Release

### Added
- FastAPI-based Link-in-Bio application
- Multiple content types (links, videos, products, etc.)
- Admin panel with authentication
- Analytics and tracking
- Newsletter and contact form
- Docker deployment support
- Caddy reverse proxy integration
