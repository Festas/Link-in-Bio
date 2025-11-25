# Database Architecture

This document describes the multi-database architecture used in the Link-in-Bio application.

## Overview

The application uses **four separate SQLite databases** stored in the centralized `data/` directory:

```
data/
├── linktree.db       # Main application database
├── special_pages.db  # Special pages database
├── pages.db          # Custom pages database
└── mediakit.db       # MediaKit database
```

## Database Separation Benefits

- **Data Persistence**: Deleting one database won't affect the others
- **Easier Backups**: Each database can be backed up separately
- **Better Organization**: Related data is grouped logically
- **Reduced Risk**: Configuration changes don't affect static content
- **Centralized Location**: All databases in `data/` folder for easy management

## Referential Integrity

Since SQLite foreign key constraints cannot span multiple database files, referential integrity between databases is maintained through application logic:

### Cross-Database References

**Items → Pages**: Items in `linktree.db` reference pages in `pages.db` via `page_id`
**Subscribers → Pages**: Subscribers in `linktree.db` reference pages in `pages.db` via `redirect_page_id`

### Cascade Deletes

When deleting a page using `delete_page(page_id)`, the function automatically:
1. Deletes all items with that `page_id` from `linktree.db`
2. Sets `redirect_page_id` to NULL for subscribers referencing that page
3. Deletes the page from `pages.db`

```python
from app.database import delete_page

# This will automatically clean up related items and subscribers
delete_page(page_id=5)
```

### Orphaned Reference Cleanup

If pages are deleted directly from `pages.db` (bypassing `delete_page()`), orphaned references may exist. Run the cleanup function periodically:

```python
from app.database import cleanup_orphaned_references

# Clean up items and subscribers referencing non-existent pages
result = cleanup_orphaned_references()
print(f"Cleaned: {result['items_cleaned']} items, {result['subscribers_cleaned']} subscribers")
```

## Database Architecture

### 1. data/linktree.db (Main Database)

**Purpose**: Stores dynamic application data that changes frequently

**Tables**:
- `items` - Link items displayed on pages
- `clicks` - Click tracking data
- `settings` - Application settings and configuration
- `subscribers` - Email subscribers
- `messages` - Contact form messages
- `social_stats_cache` - Cached social media statistics

**Usage**: This database can be safely deleted/reset for testing without losing special pages or custom pages.

### 2. data/special_pages.db (Special Pages Database)

**Purpose**: Stores special pages (Impressum, Datenschutz, Über mich, etc.)

**Tables**:
- `special_pages` - Special page content
- `special_page_blocks` - Block-based content for special pages

**Default Content**: 
- Über mich (ueber-mich)
- Impressum (impressum)
- Datenschutzerklärung (datenschutz)

### 3. data/pages.db (Custom Pages Database)

**Purpose**: Stores custom pages created via the admin panel

**Tables**:
- `pages` - Custom pages with slugs, titles, bios, images

### 4. data/mediakit.db (MediaKit Database)

**Purpose**: Stores all MediaKit-related data

**Tables**:
- `mediakit_data` - Media Kit section data
- `mediakit_settings` - Media Kit settings (access control, etc.)
- `mediakit_views` - Media Kit view tracking
- `mediakit_access_requests` - Media Kit access requests
- `mediakit_blocks` - Block-based Media Kit content

## Database Access

### Connection Functions

```python
from app.database import (
    get_db_connection,               # Main database
    get_special_pages_db_connection, # Special pages database
    get_custom_pages_db_connection,  # Custom pages database
    get_mediakit_db_connection       # MediaKit database
)
```

### Configuration

The `data/` directory is used by default. You can customize paths using environment variables:

```bash
# Optional - defaults to data/ directory
DATA_DIR=data
DATABASE_FILE=data/linktree.db
SPECIAL_PAGES_DB=data/special_pages.db
CUSTOM_PAGES_DB=data/pages.db
MEDIAKIT_DB=data/mediakit.db
```

## Initialization

### First-Time Setup

Run the initialization script to create all databases with default data:

```bash
python3 init_databases.py
```

This script will:
1. Create `data/` directory if it doesn't exist
2. Create `linktree.db` with default settings
3. Create `special_pages.db` with default special pages
4. Create `pages.db` with a default main page
5. Create `mediakit.db` with MediaKit tables

### Programmatic Initialization

```python
from app.database import init_db

# Initializes all four databases
init_db()
```

## Deployment

### Docker Compose

The entire `data/` directory is mounted as a volume:

```yaml
volumes:
  - ./data:/app/data
```

### GitHub Actions Deployment

The deployment workflow (`.github/workflows/deploy.yml`):
1. Excludes the `data/` directory from SCP copy (preserves existing data)
2. Creates `.env` files from GitHub Secrets
3. Runs `init_databases.py` to ensure all databases exist
4. Restarts Docker containers with updated code

### .env Files from GitHub Secrets

The deployment automatically creates all `.env` files from GitHub Secrets:
- `.env` from `ENV_FILE` secret
- `.env.social` from `INSTAGRAM_SECRET` and `TIKTOK_SECRET` secrets

## Backup Strategy

### Using Makefile

```bash
# Backup all databases
make backup
```

### Manual Backup

```bash
# Backup all databases in data/
tar -czf databases_backup_$(date +%Y%m%d).tar.gz data/*.db

# Restore
tar -xzf databases_backup_YYYYMMDD.tar.gz
```

### Individual Backups

```bash
cp data/linktree.db data/linktree.db.backup
cp data/mediakit.db data/mediakit.db.backup
```

## Troubleshooting

### Missing Database Files

```bash
python3 init_databases.py
```

### Permission Issues

```bash
chmod 644 data/*.db
```

### Database Locked Errors

1. Stop the application
2. Wait a few seconds
3. Restart the application

## Development

### Testing

When testing, you can safely delete individual databases:

```bash
rm data/linktree.db
python3 init_databases.py  # Recreates missing databases
```

### Adding New Tables

Decide which database new tables belong to:
- Frequently changing data → `linktree.db`
- Special pages → `special_pages.db`
- Custom pages → `pages.db`
- MediaKit data → `mediakit.db`

Update the corresponding `init_*_db()` function in `app/database.py`.

## References

- Database initialization: `app/database.py`
- Initialization script: `init_databases.py`
- Docker configuration: `docker-compose.yml`
- Deployment workflow: `.github/workflows/deploy.yml`
