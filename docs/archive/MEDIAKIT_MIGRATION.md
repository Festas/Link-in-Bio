# Media Kit Database Migration Guide

## Overview

As of this update, the Media Kit has been separated into its own dedicated database (`mediakit.db`) for better organization and cleaner data structure.

## Database Structure

The application now uses 4 separate SQLite databases:

- **linktree.db** - Main database (items, clicks, settings, subscribers, messages, social_stats_cache)
- **special_pages.db** - Special pages (impressum, datenschutz, ueber-mich, kontakt)
- **pages.db** - Custom pages
- **mediakit.db** - Media Kit (all mediakit-related tables)

## Migration for Existing Installations

If you're upgrading from a previous version where Media Kit tables were in `special_pages.db`, you need to migrate the data.

### Automatic Migration

Run the migration script:

```bash
python migrate_mediakit_db.py
```

This script will:
1. Check if `special_pages.db` exists with mediakit tables
2. Create and initialize `mediakit.db`
3. Copy all mediakit data to the new database
4. Report the migration results

The script is safe to run multiple times - it will only migrate if needed.

### Manual Migration

If you prefer manual migration:

```bash
# 1. Backup your data first
cp special_pages.db special_pages.db.backup

# 2. Initialize the new database
python -c "from app.database import init_mediakit_db; init_mediakit_db()"

# 3. Export and import data for each table
for table in mediakit_data mediakit_settings mediakit_views mediakit_access_requests mediakit_blocks; do
    sqlite3 special_pages.db ".mode insert $table" "SELECT * FROM $table;" | sqlite3 mediakit.db
done

# 4. Verify the migration
python -c "from app.database import get_mediakit_data; print(get_mediakit_data())"
```

### New Installations

New installations will automatically create all 4 databases when you run:

```bash
python -c "from app.database import init_db; init_db()"
```

Or when the application starts for the first time.

## Environment Variables

Update your `.env` file to specify the database paths (optional - defaults are provided):

```bash
DATABASE_FILE=linktree.db
SPECIAL_PAGES_DB=special_pages.db
CUSTOM_PAGES_DB=pages.db
MEDIAKIT_DB=mediakit.db
```

## Cleanup (Optional)

After verifying the migration was successful, you can optionally remove the old mediakit tables from `special_pages.db`:

```bash
# Drop old mediakit tables from special_pages.db
sqlite3 special_pages.db "DROP TABLE IF EXISTS mediakit_data;"
sqlite3 special_pages.db "DROP TABLE IF EXISTS mediakit_settings;"
sqlite3 special_pages.db "DROP TABLE IF EXISTS mediakit_views;"
sqlite3 special_pages.db "DROP TABLE IF EXISTS mediakit_access_requests;"
sqlite3 special_pages.db "DROP TABLE IF EXISTS mediakit_blocks;"
```

Or keep them as backup until you're confident everything works correctly.

## Benefits

- **Better Organization**: Each domain (main app, pages, special pages, media kit) has its own database
- **Cleaner Structure**: Easier to understand and maintain
- **Improved Performance**: Smaller databases can be more efficient
- **Better Backups**: Can backup/restore specific databases independently
- **Scalability**: Easier to migrate specific databases to different storage solutions in the future

## Troubleshooting

### Migration Script Issues

If the migration script fails:

1. Check the error message for details
2. Ensure Python dependencies are installed: `pip install -r requirements.txt`
3. Verify file permissions on the database files
4. Check that `special_pages.db` exists and is not corrupted

### Data Verification

To verify all data migrated correctly:

```python
python << 'EOF'
from app.database import (
    get_mediakit_data,
    get_all_mediakit_settings,
    get_mediakit_blocks,
    get_mediakit_views_stats
)

print("Media Kit Data:", get_mediakit_data())
print("Settings:", get_all_mediakit_settings())
print("Blocks:", len(get_mediakit_blocks()))
print("Views Stats:", get_mediakit_views_stats())
EOF
```

### Rollback

If you need to rollback:

1. Stop the application
2. Restore from your backup: `cp special_pages.db.backup special_pages.db`
3. Delete the new database: `rm mediakit.db`
4. Checkout the previous version of the code

## Support

If you encounter any issues during migration, please:
1. Check the existing issues on GitHub
2. Create a new issue with:
   - Error messages
   - Database file sizes
   - Python/SQLite versions
   - Steps to reproduce
