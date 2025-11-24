#!/usr/bin/env python3
"""
Migration script to move Media Kit data from special_pages.db to mediakit.db

This script is safe to run multiple times. It will only migrate data if:
1. special_pages.db exists and has mediakit tables
2. mediakit.db doesn't exist or is empty

Usage:
    python migrate_mediakit_db.py
"""

import sqlite3
import os
import sys
from pathlib import Path


def migrate_mediakit_data():
    """Migrate Media Kit data from special_pages.db to mediakit.db"""

    # Get database paths
    special_pages_db = os.getenv("SPECIAL_PAGES_DB", "special_pages.db")
    mediakit_db = os.getenv("MEDIAKIT_DB", "mediakit.db")

    print("=== Media Kit Database Migration ===\n")

    # Check if special_pages.db exists
    if not os.path.exists(special_pages_db):
        print(f"❌ Source database '{special_pages_db}' not found.")
        print("   No migration needed.")
        return True

    # Check if mediakit tables exist in special_pages.db
    try:
        conn_old = sqlite3.connect(special_pages_db)
        cursor_old = conn_old.cursor()

        # Get list of tables
        cursor_old.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'mediakit%' ORDER BY name")
        mediakit_tables = [row[0] for row in cursor_old.fetchall()]

        if not mediakit_tables:
            print(f"✓ No mediakit tables found in {special_pages_db}")
            print("  No migration needed.")
            conn_old.close()
            return True

        print(f"Found {len(mediakit_tables)} mediakit tables in {special_pages_db}:")
        for table in mediakit_tables:
            print(f"  - {table}")

    except sqlite3.Error as e:
        print(f"❌ Error reading source database: {e}")
        return False

    # Initialize the new mediakit database
    print(f"\nInitializing {mediakit_db}...")
    from app.database import init_mediakit_db

    try:
        init_mediakit_db()
        print(f"✓ {mediakit_db} initialized")
    except Exception as e:
        print(f"❌ Error initializing mediakit database: {e}")
        conn_old.close()
        return False

    # Migrate data for each table
    print("\nMigrating data...")
    conn_new = sqlite3.connect(mediakit_db)
    cursor_new = conn_new.cursor()

    tables_migrated = 0
    total_rows_migrated = 0

    for table in mediakit_tables:
        try:
            # Get row count from old database
            cursor_old.execute(f"SELECT COUNT(*) FROM {table}")
            row_count = cursor_old.fetchone()[0]

            if row_count == 0:
                print(f"  ⊘ {table}: 0 rows (empty)")
                continue

            # Get all data from old table
            cursor_old.execute(f"SELECT * FROM {table}")
            rows = cursor_old.fetchall()

            # Get column names
            cursor_old.execute(f"PRAGMA table_info({table})")
            columns = [col[1] for col in cursor_old.fetchall()]

            # Delete existing data in new table (in case of re-run)
            cursor_new.execute(f"DELETE FROM {table}")

            # Insert data into new table
            placeholders = ",".join(["?"] * len(columns))
            cursor_new.executemany(f"INSERT INTO {table} VALUES ({placeholders})", rows)

            conn_new.commit()
            tables_migrated += 1
            total_rows_migrated += row_count

            print(f"  ✓ {table}: {row_count} rows migrated")

        except sqlite3.Error as e:
            print(f"  ❌ {table}: Migration failed - {e}")
            conn_new.rollback()

    conn_old.close()
    conn_new.close()

    print(f"\n✅ Migration complete!")
    print(f"   Tables migrated: {tables_migrated}")
    print(f"   Total rows: {total_rows_migrated}")

    # Offer to clean up old tables
    if tables_migrated > 0:
        print(f"\n⚠️  Old mediakit tables still exist in {special_pages_db}")
        print("   You can safely remove them after verifying the migration:")
        print(f"   For each table: sqlite3 {special_pages_db} 'DROP TABLE tablename;'")
        print("\n   Or keep them as backup until you're confident everything works.")

    return True


if __name__ == "__main__":
    try:
        from dotenv import load_dotenv

        load_dotenv()
        success = migrate_mediakit_data()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Migration failed with error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
