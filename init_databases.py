#!/usr/bin/env python3
"""
Initialize database files with default data for deployment.
This script creates the database files with standard values if they don't exist.
Run this script on the server after deployment to ensure all databases are initialized.

All databases are stored in the data/ directory.
"""

import os
import sys

# Add the app directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import init_db, DATA_DIR, DATABASE_FILE, SPECIAL_PAGES_DB, CUSTOM_PAGES_DB, MEDIAKIT_DB

if __name__ == "__main__":
    print("=" * 60)
    print("Initializing Link-in-Bio Databases")
    print("=" * 60)

    # Ensure data directory exists
    os.makedirs(DATA_DIR, exist_ok=True)
    print(f"\nDatabase directory: {DATA_DIR}/")

    # Check which databases exist
    linktree_exists = os.path.exists(DATABASE_FILE)
    special_pages_exists = os.path.exists(SPECIAL_PAGES_DB)
    pages_exists = os.path.exists(CUSTOM_PAGES_DB)
    mediakit_exists = os.path.exists(MEDIAKIT_DB)

    print(f"\nCurrent database status:")
    print(f"  {DATABASE_FILE}: {'EXISTS' if linktree_exists else 'MISSING'}")
    print(f"  {SPECIAL_PAGES_DB}: {'EXISTS' if special_pages_exists else 'MISSING'}")
    print(f"  {CUSTOM_PAGES_DB}: {'EXISTS' if pages_exists else 'MISSING'}")
    print(f"  {MEDIAKIT_DB}: {'EXISTS' if mediakit_exists else 'MISSING'}")

    print("\nInitializing databases...")
    init_db()

    print("\n" + "=" * 60)
    print("Database initialization complete!")
    print("=" * 60)
    print(f"\nDatabase files in {DATA_DIR}/:")
    print(f"  ✓ linktree.db (main database)")
    print(f"  ✓ special_pages.db (special pages)")
    print(f"  ✓ pages.db (custom pages)")
    print(f"  ✓ mediakit.db (media kit)")
    print("\nAll databases are ready to use.")
