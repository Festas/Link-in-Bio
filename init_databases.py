#!/usr/bin/env python3
"""
Initialize database files with default data for deployment.
This script creates the database files with standard values if they don't exist.
Run this script on the server after deployment to ensure all databases are initialized.
"""

import os
import sys

# Add the app directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import init_db

if __name__ == "__main__":
    print("=" * 60)
    print("Initializing Link-in-Bio Databases")
    print("=" * 60)

    # Check which databases exist
    linktree_exists = os.path.exists("linktree.db")
    special_pages_exists = os.path.exists("special_pages.db")
    pages_exists = os.path.exists("pages.db")

    print(f"\nCurrent database status:")
    print(f"  linktree.db: {'EXISTS' if linktree_exists else 'MISSING'}")
    print(f"  special_pages.db: {'EXISTS' if special_pages_exists else 'MISSING'}")
    print(f"  pages.db: {'EXISTS' if pages_exists else 'MISSING'}")

    print("\nInitializing databases...")
    init_db()

    print("\n" + "=" * 60)
    print("Database initialization complete!")
    print("=" * 60)
    print("\nDatabase files created/updated:")
    print(f"  ✓ linktree.db (main database)")
    print(f"  ✓ special_pages.db (special pages & media kit)")
    print(f"  ✓ pages.db (custom pages)")
    print("\nAll databases are ready to use.")
