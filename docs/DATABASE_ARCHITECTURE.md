# Database Architecture

This document describes the multi-database architecture used in the Link-in-Bio application.

## Overview

The application uses **three separate SQLite databases** to provide better data separation and persistence:

1. **`linktree.db`** - Main application database
2. **`special_pages.db`** - Special pages and Media Kit database
3. **`pages.db`** - Custom pages database

## Database Separation Benefits

- **Data Persistence**: Deleting `linktree.db` will NOT affect special pages or custom pages
- **Easier Backups**: Each database can be backed up separately
- **Better Organization**: Related data is grouped logically
- **Reduced Risk**: Configuration changes don't affect static content

## Database Details

### 1. linktree.db (Main Database)

**Purpose**: Stores dynamic application data that changes frequently

**Tables**:
- `items` - Link items displayed on pages
- `clicks` - Click tracking data
- `settings` - Application settings and configuration
- `subscribers` - Email subscribers
- `messages` - Contact form messages
- `social_stats_cache` - Cached social media statistics

**Usage**: This database can be safely deleted/reset for testing without losing special pages or custom pages.

### 2. special_pages.db (Special Pages Database)

**Purpose**: Stores special pages (Impressum, Datenschutz, Über mich, etc.) and Media Kit data

**Tables**:
- `special_pages` - Special page content (impressum, datenschutz, ueber-mich)
- `special_page_blocks` - Block-based content for special pages
- `mediakit_data` - Media Kit section data
- `mediakit_settings` - Media Kit settings (access control, etc.)
- `mediakit_views` - Media Kit view tracking
- `mediakit_access_requests` - Media Kit access requests
- `mediakit_blocks` - Block-based Media Kit content

**Default Content**: 
- Über mich (ueber-mich)
- Impressum (impressum)
- Datenschutzerklärung (datenschutz)

**Usage**: This database persists across main database resets, preserving all edits to special pages.

### 3. pages.db (Custom Pages Database)

**Purpose**: Stores custom pages created via the admin panel

**Tables**:
- `pages` - Custom pages with slugs, titles, bios, images

**Default Content**:
- Default/main page (slug: '')

**Usage**: This database persists custom pages independently, so deleting linktree.db won't remove user-created pages.

## Database Access

### Connection Functions

```python
from app.database import (
    get_db_connection,              # Main database
    get_special_pages_db_connection, # Special pages database
    get_custom_pages_db_connection   # Custom pages database
)
```

### Environment Variables

You can customize database file paths using environment variables:

```bash
DATABASE_FILE=linktree.db           # Main database (default)
SPECIAL_PAGES_DB=special_pages.db   # Special pages database (default)
CUSTOM_PAGES_DB=pages.db            # Custom pages database (default)
```

## Initialization

### First-Time Setup

Run the initialization script to create all databases with default data:

```bash
python3 init_databases.py
```

This script will:
1. Create `linktree.db` with default settings
2. Create `special_pages.db` with default special pages (Impressum, Datenschutz, Über mich)
3. Create `pages.db` with a default main page

### Programmatic Initialization

```python
from app.database import init_db

# Initializes all three databases
init_db()
```

## Deployment

### Docker Compose

All three databases are mounted as volumes in `docker-compose.yml`:

```yaml
volumes:
  - ./linktree.db:/app/linktree.db
  - ./special_pages.db:/app/special_pages.db
  - ./pages.db:/app/pages.db
```

### GitHub Actions Deployment

The deployment workflow (`.github/workflows/deploy.yml`):
1. Excludes all database files from SCP copy (preserves existing data)
2. Runs `init_databases.py` to ensure all databases exist
3. Restarts Docker containers with updated code

### Manual Deployment

When deploying to a new server:

1. Copy application files (excluding .db files)
2. Create `.env` file with configuration
3. Run initialization:
   ```bash
   python3 init_databases.py
   ```
4. Start the application:
   ```bash
   docker compose up -d
   ```

## Backup Strategy

### Individual Database Backups

```bash
# Backup main database only
cp linktree.db linktree.db.backup

# Backup special pages only
cp special_pages.db special_pages.db.backup

# Backup custom pages only
cp pages.db pages.db.backup
```

### Full Backup

```bash
# Backup all databases
tar -czf databases_backup_$(date +%Y%m%d).tar.gz *.db
```

### Restore

```bash
# Restore from backup
tar -xzf databases_backup_YYYYMMDD.tar.gz
```

## Migration

If you have an existing single-database installation, the new multi-database structure will automatically:

1. Keep existing data in `linktree.db` temporarily
2. Create `special_pages.db` with default special pages
3. Create `pages.db` with a default page

You may need to manually migrate data if you had custom special pages in the old database.

## Troubleshooting

### Missing Database Files

If a database file is missing, run:
```bash
python3 init_databases.py
```

### Permission Issues

Ensure the application has write access to the database files:
```bash
chmod 644 *.db
```

### Database Locked Errors

If you encounter "database is locked" errors:
1. Stop the application
2. Wait a few seconds
3. Restart the application

## Development

### Testing

When testing, you can safely delete `linktree.db` without affecting special pages or custom pages:

```bash
rm linktree.db
python3 init_databases.py  # Recreates linktree.db only
```

### Adding New Tables

When adding new tables, decide which database they belong to:
- Frequently changing data → `linktree.db`
- Special pages / Media Kit → `special_pages.db`
- Custom pages → `pages.db`

Update the corresponding `init_*_db()` function in `app/database.py`.

## References

- Database initialization: `app/database.py`
- Initialization script: `init_databases.py`
- Docker configuration: `docker-compose.yml`
- Deployment workflow: `.github/workflows/deploy.yml`
