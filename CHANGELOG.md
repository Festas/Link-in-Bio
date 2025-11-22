# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt hält sich an [Semantic Versioning](https://semver.org/lang/de/).

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
