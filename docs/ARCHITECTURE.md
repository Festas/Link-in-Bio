# Project Architecture

This document describes the refactored architecture of the Link-in-Bio application.

## Overview

The application has been refactored to improve modularity, reduce code duplication, and enhance maintainability.

## Backend Structure

### Core Modules

#### Authentication (`app/auth_unified.py`)
Unified authentication module that combines:
- **Basic Auth**: Legacy HTTP basic authentication
- **Session Auth**: Cookie-based sessions with configurable expiry
- **Password Hashing**: Bcrypt-based secure password storage
- **2FA Support**: TOTP-based two-factor authentication

```python
from app.auth_unified import require_auth, check_auth, hash_password
```

#### Caching (`app/cache_unified.py`)
Flexible caching system with multiple backends:
- **In-Memory Cache**: For development and simple deployments
- **Redis Cache**: For production and horizontal scaling
- **Automatic Fallback**: Falls back to in-memory if Redis unavailable

```python
from app.cache_unified import cache

# Basic usage
cache.set("key", "value", ttl=3600)
value = cache.get("key")

# Decorator usage
@cache.cached(ttl=3600)
def expensive_function():
    # ...
```

#### Settings Service (`app/settings_service.py`)
Centralized settings management:
- Cached settings access
- Batch updates
- Social media link helpers

```python
from app.settings_service import settings_service

# Get all settings
settings = settings_service.get_all_settings()

# Get specific setting
value = settings_service.get_setting("key", default="default")

# Update settings
settings_service.update_setting("key", "value")
```

#### Block System (`app/block_system.py`)
Reusable content blocks for building custom pages. Supports 10 block types:

1. **Heading** - H1-H6 headings
2. **Text** - Paragraphs with line break support
3. **Image** - Images with captions and sizing options
4. **List** - Ordered and unordered lists
5. **Spacer** - Vertical spacing (small, medium, large, xlarge)
6. **Gallery** - Image grids (2-4 columns)
7. **Quote** - Styled blockquotes with author attribution
8. **Video** - Responsive video embeds
9. **Columns** - Multi-column layouts (2-4 columns)
10. **Timeline** - Event timelines with dates

```python
from app.block_system import render_blocks_to_html, BLOCK_TYPES

# Render blocks to HTML
html = render_blocks_to_html(blocks)

# Available block types
print(BLOCK_TYPES.keys())
```

### Database Layer (`app/database.py`)

SQLite-based database with the following tables:
- `pages` - Multi-page support
- `items` - Content items (links, videos, products, etc.)
- `clicks` - Analytics tracking
- `settings` - Application settings
- `subscribers` - Email subscribers
- `messages` - Contact form messages
- `special_pages` - Legal pages content
- `special_page_blocks` - Block-based page content
- `mediakit_*` - Media kit data and blocks

### API Endpoints

#### Main Router (`app/endpoints.py`)
Core API endpoints:
- `/api/pages` - Page management
- `/api/items` - Content items (links, videos, etc.)
- `/api/settings` - Application settings
- `/api/analytics` - Analytics data
- `/api/subscribers` - Email subscribers
- `/api/messages` - Contact messages
- `/api/upload` - File uploads
- `/api/qrcode` - QR code generation

#### Enhanced Router (`app/endpoints_enhanced.py`)
Advanced features:
- `/api/auth/*` - Session-based auth
- `/api/analytics/enhanced/*` - Advanced analytics
- `/api/cache/stats` - Cache statistics

## Frontend Structure

### JavaScript Modules

The frontend is organized into focused, single-responsibility modules:

#### Core Modules
- `utils.js` - Shared utilities, auth helpers
- `api.js` - Public API client
- `icons.js` - Icon management

#### Admin Modules
- `admin.js` - Main admin initialization
- `admin_core.js` - Core admin functionality
- `admin_api.js` - Admin API client
- `admin_ui.js` - UI components and rendering
- `admin_forms.js` - Form handlers
- `admin_items.js` - Content item management
- `admin_profile.js` - Profile settings
- `admin_pages.js` - Page management
- `admin_dashboard.js` - Analytics dashboard
- `admin_mediakit.js` - Media kit editor
- `admin_mediakit_blocks.js` - Media kit block editor
- `admin_special_blocks.js` - Special page block editor
- `admin_scheduling.js` - Content scheduling
- `admin_smart_features.js` - Smart recommendations
- `admin_keyboard.js` - Keyboard shortcuts

#### Feature Modules
- `media.js` - Media manager
- `subscribers.js` - Subscriber management
- `inbox.js` - Message inbox
- `groups.js` - Item grouping and sorting
- `analytics.js` - Analytics visualization
- `enhanced_ui.js` - Enhanced UI features
- `consent.js` - Cookie consent
- `avatar_cropper.js` - Image cropping

### CSS Structure

- `style.css` - Main application styles
- `admin.css` - Admin panel styles
- `admin-modern.css` - Modern admin theme
- `enhanced-animations.css` - Animation library

## Configuration

### Environment Variables

```bash
# Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-password  # Legacy
ADMIN_PASSWORD_HASH=...       # Preferred (bcrypt hash)
REQUIRE_2FA=false
SESSION_EXPIRY_HOURS=24

# Database
DATABASE_FILE=linktree.db

# Caching (Optional)
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
REDIS_PREFIX=linkinbio:

# Application
APP_DOMAIN=example.com
LOG_LEVEL=INFO
JSON_LOGS=false
```

### Generating Password Hash

```bash
python -c "from app.auth_unified import hash_password; print(hash_password('your-password'))"
```

## Best Practices

### Adding New Features

1. **Backend**:
   - Create service modules for business logic
   - Use routers for API endpoints
   - Leverage caching for expensive operations
   - Follow existing patterns for database access

2. **Frontend**:
   - Create focused modules for new features
   - Export only necessary functions
   - Use the existing API client (`admin_api.js`)
   - Follow naming conventions (verb_noun.js)

### Code Organization

- **Don't**: Put everything in one file
- **Do**: Create focused modules with single responsibility
- **Don't**: Duplicate code across files
- **Do**: Extract common functionality into utilities
- **Don't**: Hard-code configuration
- **Do**: Use environment variables and the settings service

### Performance

- Use caching for frequently accessed data
- Implement pagination for large datasets
- Lazy-load admin modules on tab switch
- Optimize images before upload
- Use CDN for static assets in production

## Migration Guide

### From Old Auth to Unified Auth

```python
# Old
from app.auth import check_auth, require_auth

# New (same interface)
from app.auth_unified import check_auth, require_auth
```

### From Old Cache to Unified Cache

```python
# Old
from app.cache import cache
cache.set("key", "value", ttl=300)

# New (same interface)
from app.cache_unified import cache
cache.set("key", "value", ttl=300)
```

### Using New Block Types

```python
# In special page editor
blocks = [
    {
        'block_type': 'gallery',
        'content': json.dumps(['image1.jpg', 'image2.jpg']),
        'settings': json.dumps({'columns': 3})
    },
    {
        'block_type': 'quote',
        'content': 'Your quote here',
        'settings': json.dumps({'author': 'Author Name', 'style': 'info'})
    }
]
```

## Testing

Run the application:
```bash
python main.py
```

Access:
- **Frontend**: http://127.0.0.1:8000
- **Admin**: http://127.0.0.1:8000/admin
- **API Docs**: http://127.0.0.1:8000/api/docs

## Deployment

See [docs/QUICK_START.md](docs/QUICK_START.md) for deployment instructions.

## Contributing

When contributing:
1. Follow the existing architecture patterns
2. Add appropriate error handling
3. Document new features
4. Test your changes
5. Update this document if adding new modules

## License

See [LICENSE](../LICENSE) file.
