# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt hält sich an [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

### Added
- Comprehensive project documentation (README.md, CONTRIBUTING.md)
- .env.example file with all configuration options
- Development tooling configuration (flake8, black, mypy, pytest)
- This CHANGELOG file to track project changes

### Changed
- Project structure improvements for better maintainability

### Security
- Enhanced security documentation and guidelines

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
