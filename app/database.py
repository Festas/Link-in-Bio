import sqlite3
import os
import json
from typing import Dict, Any, Optional
from contextlib import contextmanager
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
DATABASE_FILE = os.getenv("DATABASE_FILE", "linktree.db")
SPECIAL_PAGES_DB = os.getenv("SPECIAL_PAGES_DB", "special_pages.db")
CUSTOM_PAGES_DB = os.getenv("CUSTOM_PAGES_DB", "pages.db")


@contextmanager
def get_db_connection():
    """Main database connection for items, clicks, settings, subscribers, messages, social_stats_cache"""
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def get_special_pages_db_connection():
    """Special pages database connection for special_pages, mediakit tables"""
    conn = sqlite3.connect(SPECIAL_PAGES_DB)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def get_custom_pages_db_connection():
    """Custom pages database connection for pages table"""
    conn = sqlite3.connect(CUSTOM_PAGES_DB)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    print("Initialisiere Datenbanken...")
    init_main_db()
    init_special_pages_db()
    init_custom_pages_db()
    print("✓ Alle Datenbanken initialisiert")


def init_main_db():
    """Initialize main database (linktree.db) for items, clicks, settings, subscribers, messages, social_stats_cache"""
    print("Initialisiere Hauptdatenbank (linktree.db)...")
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Create items table
        cursor.execute(
            """CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            item_type TEXT NOT NULL, 
            title TEXT NOT NULL, 
            url TEXT, 
            image_url TEXT, 
            display_order INTEGER DEFAULT 0, 
            parent_id INTEGER, 
            click_count INTEGER DEFAULT 0, 
            is_featured BOOLEAN DEFAULT 0, 
            is_active BOOLEAN DEFAULT 1, 
            is_affiliate BOOLEAN DEFAULT 0, 
            publish_on TEXT, 
            expires_on TEXT, 
            price TEXT, 
            grid_columns INTEGER DEFAULT 2,
            page_id INTEGER,
            FOREIGN KEY (parent_id) REFERENCES items(id) ON DELETE SET NULL
        )"""
        )

        cursor.execute(
            """CREATE TABLE IF NOT EXISTS clicks (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            item_id INTEGER NOT NULL, 
            timestamp DATETIME DEFAULT (datetime('now', 'localtime')), 
            referer TEXT, 
            country_code TEXT, 
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
        )"""
        )

        cursor.execute("""CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)""")

        cursor.execute(
            """CREATE TABLE IF NOT EXISTS subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            email TEXT NOT NULL UNIQUE, 
            subscribed_at DATETIME DEFAULT (datetime('now', 'localtime')), 
            redirect_page_id INTEGER
        )"""
        )

        cursor.execute(
            """CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            name TEXT NOT NULL, 
            email TEXT NOT NULL, 
            message TEXT NOT NULL, 
            sent_at DATETIME DEFAULT (datetime('now', 'localtime'))
        )"""
        )

        # Social media stats cache table
        cursor.execute(
            """CREATE TABLE IF NOT EXISTS social_stats_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            platform TEXT NOT NULL,
            username TEXT NOT NULL,
            stats_data TEXT NOT NULL,
            fetched_at DATETIME DEFAULT (datetime('now', 'localtime')),
            UNIQUE(platform, username)
        )"""
        )

        # Create indexes for main database
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_items_display_order ON items(display_order)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_clicks_item_id ON clicks(item_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_items_page_id ON items(page_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_items_active ON items(is_active)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_items_parent ON items(parent_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_clicks_timestamp ON clicks(timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_social_stats_platform ON social_stats_cache(platform)")

        # Migrationen (Fix für grid_columns)
        cursor.execute("PRAGMA table_info(items)")
        columns_items = [col[1] for col in cursor.fetchall()]

        migrations = {
            "price": "ALTER TABLE items ADD COLUMN price TEXT DEFAULT NULL",
            "grid_columns": "ALTER TABLE items ADD COLUMN grid_columns INTEGER DEFAULT 2",
            "publish_on": "ALTER TABLE items ADD COLUMN publish_on TEXT DEFAULT NULL",
            "expires_on": "ALTER TABLE items ADD COLUMN expires_on TEXT DEFAULT NULL",
            "is_featured": "ALTER TABLE items ADD COLUMN is_featured BOOLEAN DEFAULT 0",
            "is_affiliate": "ALTER TABLE items ADD COLUMN is_affiliate BOOLEAN DEFAULT 0",
            "parent_id": "ALTER TABLE items ADD COLUMN parent_id INTEGER DEFAULT NULL REFERENCES items(id) ON DELETE SET NULL",
            "page_id": "ALTER TABLE items ADD COLUMN page_id INTEGER DEFAULT NULL",
        }

        for col, sql in migrations.items():
            if col not in columns_items:
                try:
                    cursor.execute(sql)
                except:
                    pass

        # Clicks Migration
        cursor.execute("PRAGMA table_info(clicks)")
        click_cols = [c[1] for c in cursor.fetchall()]
        if "country_code" not in click_cols:
            cursor.execute("ALTER TABLE clicks ADD COLUMN country_code TEXT DEFAULT NULL")

        # Subscribers Migration
        cursor.execute("PRAGMA table_info(subscribers)")
        subscriber_cols = [c[1] for c in cursor.fetchall()]
        if "redirect_page_id" not in subscriber_cols:
            cursor.execute("ALTER TABLE subscribers ADD COLUMN redirect_page_id INTEGER DEFAULT NULL")

        # Initialize default settings
        default_settings = {
            "title": os.getenv("DEFAULT_PROFILE_NAME", "Eric | Tech & Gaming"),
            "bio": os.getenv(
                "DEFAULT_PROFILE_BIO",
                "Tech & Gaming Influencer aus Hamburg 🎮⚡ | Ingenieur & Content Creator | Ästhetik trifft Innovation",
            ),
            "theme": "theme-dark",
            "button_style": "style-rounded",
            "social_youtube": "",
            "social_instagram": "",
            "social_tiktok": "",
            "social_twitch": "",
            "social_x": "",
            "social_discord": "",
        }
        for key, value in default_settings.items():
            cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, value))

        conn.commit()
        print("✓ Hauptdatenbank initialisiert")


def init_special_pages_db():
    """Initialize special pages database for special_pages, mediakit tables"""
    print("Initialisiere Special-Pages-Datenbank (special_pages.db)...")
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()

        # Special pages content table
        cursor.execute(
            """CREATE TABLE IF NOT EXISTS special_pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            page_key TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            subtitle TEXT,
            content TEXT NOT NULL,
            blocks TEXT,
            updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
        )"""
        )

        # Special page blocks table
        cursor.execute(
            """CREATE TABLE IF NOT EXISTS special_page_blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            page_key TEXT NOT NULL,
            block_type TEXT NOT NULL,
            content TEXT NOT NULL,
            settings TEXT,
            position INTEGER NOT NULL,
            created_at DATETIME DEFAULT (datetime('now', 'localtime')),
            updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (page_key) REFERENCES special_pages(page_key) ON DELETE CASCADE
        )"""
        )

        # Media kit data table
        cursor.execute(
            """CREATE TABLE IF NOT EXISTS mediakit_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT,
            display_order INTEGER DEFAULT 0,
            updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
            UNIQUE(section, key)
        )"""
        )

        # Media kit settings table (for access control, video pitch, etc.)
        cursor.execute(
            """CREATE TABLE IF NOT EXISTS mediakit_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            setting_key TEXT NOT NULL UNIQUE,
            setting_value TEXT,
            updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
        )"""
        )

        # Media kit views tracking table
        cursor.execute(
            """CREATE TABLE IF NOT EXISTS mediakit_views (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            viewer_email TEXT,
            viewer_ip TEXT,
            viewer_country TEXT,
            user_agent TEXT,
            viewed_at DATETIME DEFAULT (datetime('now', 'localtime'))
        )"""
        )

        # Media kit access requests table (for gated access)
        cursor.execute(
            """CREATE TABLE IF NOT EXISTS mediakit_access_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            name TEXT,
            company TEXT,
            message TEXT,
            status TEXT DEFAULT 'pending',
            ip_address TEXT,
            requested_at DATETIME DEFAULT (datetime('now', 'localtime')),
            approved_at DATETIME
        )"""
        )

        # Media kit blocks table (new flexible block-based system)
        cursor.execute(
            """CREATE TABLE IF NOT EXISTS mediakit_blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            block_type TEXT NOT NULL,
            title TEXT,
            content TEXT,
            settings TEXT,
            position INTEGER NOT NULL DEFAULT 0,
            is_visible BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT (datetime('now', 'localtime')),
            updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
        )"""
        )

        # Create indexes for special pages database
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_special_pages_key ON special_pages(page_key)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_mediakit_section ON mediakit_data(section)")

        # Initialize special pages with default content if not exists
        cursor.execute("SELECT COUNT(*) FROM special_pages")
        if cursor.fetchone()[0] == 0:
            default_special_pages = [
                (
                    "ueber-mich",
                    "Über mich",
                    "Tech & Gaming Enthusiast aus Hamburg",
                    """<section><h2>Hallo! 👋</h2><p>Willkommen auf meiner Seite! Ich bin Eric, Tech- und Gaming-Enthusiast aus der schönen Hansestadt Hamburg. Hier vereinen sich meine Leidenschaften für innovative Technologien, Gaming und ästhetisches Design.</p></section><section><h2>Was ich mache 🎮⚡</h2><p>Als Ingenieur und Content Creator verbinde ich technisches Know-how mit kreativer Leidenschaft. Mein Fokus liegt auf:</p><ul><li><strong>Gaming Content:</strong> Reviews, Streams und Gameplay-Highlights aus der Welt des Gaming</li><li><strong>Tech & Innovation:</strong> Neueste Technologietrends, Hardware-Tests und Software-Entwicklung</li><li><strong>Engineering:</strong> Einblicke in die Welt der Technik und innovative Lösungsansätze</li><li><strong>Design & Ästhetik:</strong> Wo Funktionalität auf visuelles Design trifft</li></ul></section>""",
                ),
                (
                    "impressum",
                    "Impressum",
                    "Angaben gemäß § 5 TMG",
                    """<section><h2>Angaben gemäß § 5 TMG</h2><p>Eric [Nachname]<br>[Straße und Hausnummer]<br>[PLZ] Hamburg<br>Deutschland</p></section><section><h2>Kontakt</h2><p><strong>E-Mail:</strong> kontakt@example.com</p></section>""",
                ),
                (
                    "datenschutz",
                    "Datenschutzerklärung",
                    "Ihre Privatsphäre ist uns wichtig",
                    """<section><h2>1. Datenschutz auf einen Blick</h2><p>Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen.</p></section>""",
                ),
            ]
            for page_key, title, subtitle, content in default_special_pages:
                cursor.execute(
                    "INSERT INTO special_pages (page_key, title, subtitle, content) VALUES (?, ?, ?, ?)",
                    (page_key, title, subtitle, content),
                )

        conn.commit()
        print("✓ Special-Pages-Datenbank initialisiert")


def init_custom_pages_db():
    """Initialize custom pages database for pages table"""
    print("Initialisiere Custom-Pages-Datenbank (pages.db)...")
    with get_custom_pages_db_connection() as conn:
        cursor = conn.cursor()

        # Create pages table
        cursor.execute(
            """CREATE TABLE IF NOT EXISTS pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            bio TEXT,
            image_url TEXT,
            bg_image_url TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT (datetime('now', 'localtime')),
            updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
        )"""
        )

        # Create indexes for custom pages database
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pages_active ON pages(is_active)")

        # Create default page if none exists (for backward compatibility)
        cursor.execute("SELECT COUNT(*) FROM pages")
        if cursor.fetchone()[0] == 0:
            # Try to get default values from main database settings if it exists
            # Otherwise use environment variables or hardcoded defaults
            default_title = os.getenv("DEFAULT_PROFILE_NAME", "Eric | Tech & Gaming")
            default_bio = os.getenv(
                "DEFAULT_PROFILE_BIO",
                "Tech & Gaming Influencer aus Hamburg 🎮⚡ | Ingenieur & Content Creator | Ästhetik trifft Innovation",
            )
            default_image = ""
            default_bg = ""

            # Try to get settings from main database if it already exists
            if os.path.exists(DATABASE_FILE):
                try:
                    with get_db_connection() as main_conn:
                        main_cursor = main_conn.cursor()
                        main_cursor.execute(
                            "SELECT key, value FROM settings WHERE key IN ('title', 'bio', 'image_url', 'bg_image_url')"
                        )
                        settings = {row[0]: row[1] for row in main_cursor.fetchall()}
                        default_title = settings.get("title", default_title)
                        default_bio = settings.get("bio", default_bio)
                        default_image = settings.get("image_url", default_image)
                        default_bg = settings.get("bg_image_url", default_bg)
                except Exception:
                    # If main database doesn't have settings table yet, use defaults
                    pass

            cursor.execute(
                """INSERT INTO pages (slug, title, bio, image_url, bg_image_url, is_active) 
                   VALUES ('', ?, ?, ?, ?, 1)""",
                (default_title, default_bio, default_image, default_bg),
            )

        conn.commit()
        print("✓ Custom-Pages-Datenbank initialisiert")


def get_next_display_order(page_id: Optional[int] = None) -> int:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        if page_id:
            cursor.execute("SELECT MAX(display_order) FROM items WHERE page_id = ?", (page_id,))
        else:
            cursor.execute("SELECT MAX(display_order) FROM items")
        result = cursor.fetchone()
        return (result[0] if result and result[0] else 0) + 1


def get_settings_from_db() -> Dict[str, Any]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM settings")
        return {row["key"]: row["value"] for row in cursor.fetchall()}


def create_item_in_db(item_data: tuple) -> dict:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # 15 Parameter inkl page_id
        cursor.execute(
            """INSERT INTO items (
            item_type, title, url, image_url, display_order, parent_id, 
            click_count, is_featured, is_active, is_affiliate, 
            publish_on, expires_on, price, grid_columns, page_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            item_data,
        )
        conn.commit()
        cursor.execute("SELECT * FROM items WHERE id = ?", (cursor.lastrowid,))
        return dict(cursor.fetchone())


def update_item_in_db(item_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not data:
        return None
    set_clauses = [f"{key} = ?" for key in data.keys()]
    query = f"UPDATE items SET {', '.join(set_clauses)} WHERE id = ?"
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, list(data.values()) + [item_id])
        conn.commit()
        cursor.execute("SELECT * FROM items WHERE id = ?", (item_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def delete_item_from_db(item_id: int):
    with get_db_connection() as conn:
        conn.execute("DELETE FROM items WHERE id = ?", (item_id,))
        conn.commit()


def get_page_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    """Get a page by its slug."""
    with get_custom_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pages WHERE slug = ?", (slug,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_page_by_id(page_id: int) -> Optional[Dict[str, Any]]:
    """Get a page by its ID."""
    with get_custom_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pages WHERE id = ?", (page_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_all_pages() -> list:
    """Get all pages."""
    with get_custom_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pages ORDER BY created_at ASC")
        return [dict(row) for row in cursor.fetchall()]


def create_page(slug: str, title: str, bio: str = "", image_url: str = "", bg_image_url: str = "") -> dict:
    """Create a new page."""
    with get_custom_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO pages (slug, title, bio, image_url, bg_image_url, is_active) 
               VALUES (?, ?, ?, ?, ?, 1)""",
            (slug, title, bio, image_url, bg_image_url),
        )
        conn.commit()
        cursor.execute("SELECT * FROM pages WHERE id = ?", (cursor.lastrowid,))
        return dict(cursor.fetchone())


def update_page(page_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update a page."""
    if not data:
        return None
    data["updated_at"] = datetime.now().isoformat()
    set_clauses = [f"{key} = ?" for key in data.keys()]
    query = f"UPDATE pages SET {', '.join(set_clauses)} WHERE id = ?"
    with get_custom_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, list(data.values()) + [page_id])
        conn.commit()
        cursor.execute("SELECT * FROM pages WHERE id = ?", (page_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def delete_page(page_id: int):
    """Delete a page and all its items. Also handles cleanup of related records in main database."""
    # First, delete related items from the main database
    with get_db_connection() as main_conn:
        main_cursor = main_conn.cursor()
        # Delete items associated with this page
        main_cursor.execute("DELETE FROM items WHERE page_id = ?", (page_id,))
        # Set redirect_page_id to NULL for subscribers referencing this page
        main_cursor.execute("UPDATE subscribers SET redirect_page_id = NULL WHERE redirect_page_id = ?", (page_id,))
        main_conn.commit()

    # Then delete the page from the custom pages database
    with get_custom_pages_db_connection() as conn:
        conn.execute("DELETE FROM pages WHERE id = ?", (page_id,))
        conn.commit()


def cleanup_orphaned_references():
    """
    Clean up orphaned references in main database.
    Since foreign key constraints can't span databases, we need to manually clean up.
    This should be called periodically or after page deletions outside of delete_page().
    """
    with get_db_connection() as main_conn:
        main_cursor = main_conn.cursor()

        # Get all valid page IDs from custom pages database
        with get_custom_pages_db_connection() as pages_conn:
            pages_cursor = pages_conn.cursor()
            pages_cursor.execute("SELECT id FROM pages")
            valid_page_ids = {row[0] for row in pages_cursor.fetchall()}

        # Clean up items with invalid page_id
        if valid_page_ids:
            placeholders = ",".join("?" * len(valid_page_ids))
            main_cursor.execute(
                f"UPDATE items SET page_id = NULL WHERE page_id IS NOT NULL AND page_id NOT IN ({placeholders})",
                tuple(valid_page_ids),
            )
        else:
            main_cursor.execute("UPDATE items SET page_id = NULL WHERE page_id IS NOT NULL")

        items_cleaned = main_cursor.rowcount

        # Clean up subscribers with invalid redirect_page_id
        if valid_page_ids:
            placeholders = ",".join("?" * len(valid_page_ids))
            main_cursor.execute(
                f"UPDATE subscribers SET redirect_page_id = NULL WHERE redirect_page_id IS NOT NULL AND redirect_page_id NOT IN ({placeholders})",
                tuple(valid_page_ids),
            )
        else:
            main_cursor.execute("UPDATE subscribers SET redirect_page_id = NULL WHERE redirect_page_id IS NOT NULL")

        subscribers_cleaned = main_cursor.rowcount

        main_conn.commit()

        return {"items_cleaned": items_cleaned, "subscribers_cleaned": subscribers_cleaned}


def get_special_page(page_key: str) -> Optional[Dict[str, Any]]:
    """Get special page content by key (ueber-mich, impressum, datenschutz)."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM special_pages WHERE page_key = ?", (page_key,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_all_special_pages() -> list:
    """Get all special pages."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM special_pages ORDER BY page_key")
        return [dict(row) for row in cursor.fetchall()]


def update_special_page(page_key: str, title: str, subtitle: str, content: str):
    """Update special page content."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """UPDATE special_pages 
               SET title = ?, subtitle = ?, content = ?, updated_at = datetime('now', 'localtime')
               WHERE page_key = ?""",
            (title, subtitle, content, page_key),
        )
        conn.commit()


# Special Page Blocks functions
def get_special_page_blocks(page_key: str) -> list:
    """Get all blocks for a special page ordered by position."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, page_key, block_type, content, settings, position, created_at, updated_at
               FROM special_page_blocks 
               WHERE page_key = ? 
               ORDER BY position""",
            (page_key,),
        )
        return [dict(row) for row in cursor.fetchall()]


def save_special_page_blocks(page_key: str, blocks: list):
    """Save blocks for a special page. Replaces all existing blocks."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        # Delete existing blocks
        cursor.execute("DELETE FROM special_page_blocks WHERE page_key = ?", (page_key,))

        # Insert new blocks
        for i, block in enumerate(blocks):
            cursor.execute(
                """INSERT INTO special_page_blocks (page_key, block_type, content, settings, position)
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    page_key,
                    block.get("block_type", "text"),
                    block.get("content", ""),
                    json.dumps(block.get("settings", {})) if block.get("settings") else None,
                    i,
                ),
            )
        conn.commit()


def update_special_page_block(block_id: int, content: str, settings: dict = None):
    """Update a specific block."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """UPDATE special_page_blocks 
               SET content = ?, settings = ?, updated_at = datetime('now', 'localtime')
               WHERE id = ?""",
            (content, json.dumps(settings) if settings else None, block_id),
        )
        conn.commit()


def delete_special_page_block(block_id: int):
    """Delete a specific block."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM special_page_blocks WHERE id = ?", (block_id,))
        conn.commit()


def get_mediakit_data() -> Dict[str, Dict[str, str]]:
    """Get all media kit data organized by section."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT section, key, value FROM mediakit_data ORDER BY section, display_order")
        rows = cursor.fetchall()

        data = {}
        for row in rows:
            section = row[0]
            key = row[1]
            value = row[2]
            if section not in data:
                data[section] = {}
            data[section][key] = value
        return data


def update_mediakit_data(section: str, key: str, value: str, display_order: int = 0):
    """Update or insert media kit data."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO mediakit_data (section, key, value, display_order, updated_at)
               VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
               ON CONFLICT(section, key) 
               DO UPDATE SET value = ?, display_order = ?, updated_at = datetime('now', 'localtime')""",
            (section, key, value, display_order, value, display_order),
        )
        conn.commit()


def delete_mediakit_entry(section: str, key: str):
    """Delete a media kit entry."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM mediakit_data WHERE section = ? AND key = ?", (section, key))
        conn.commit()


def save_social_stats_cache(platform: str, username: str, stats_data: str):
    """Save or update social media stats in cache."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO social_stats_cache (platform, username, stats_data, fetched_at)
               VALUES (?, ?, ?, datetime('now', 'localtime'))
               ON CONFLICT(platform, username)
               DO UPDATE SET stats_data = ?, fetched_at = datetime('now', 'localtime')""",
            (platform, username, stats_data, stats_data),
        )
        conn.commit()


def get_social_stats_cache(platform: Optional[str] = None) -> Dict[str, Any]:
    """Get cached social media stats, optionally filtered by platform."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        if platform:
            cursor.execute(
                "SELECT platform, username, stats_data, fetched_at FROM social_stats_cache WHERE platform = ?",
                (platform,),
            )
        else:
            cursor.execute("SELECT platform, username, stats_data, fetched_at FROM social_stats_cache")

        rows = cursor.fetchall()
        result = {}
        for row in rows:
            result[row[0]] = {"username": row[1], "data": json.loads(row[2]), "fetched_at": row[3]}
        return result


def clear_social_stats_cache():
    """Clear all cached social media stats."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM social_stats_cache")
        conn.commit()


# Media Kit Settings Functions
def get_mediakit_setting(key: str) -> Optional[str]:
    """Get a media kit setting value."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT setting_value FROM mediakit_settings WHERE setting_key = ?", (key,))
        row = cursor.fetchone()
        return row[0] if row else None


def update_mediakit_setting(key: str, value: str):
    """Update or insert a media kit setting."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO mediakit_settings (setting_key, setting_value, updated_at)
               VALUES (?, ?, datetime('now', 'localtime'))
               ON CONFLICT(setting_key) DO UPDATE SET 
               setting_value = excluded.setting_value,
               updated_at = excluded.updated_at""",
            (key, value),
        )
        conn.commit()


def get_all_mediakit_settings() -> Dict[str, str]:
    """Get all media kit settings."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT setting_key, setting_value FROM mediakit_settings")
        return {row[0]: row[1] for row in cursor.fetchall()}


# Media Kit Views Tracking Functions
def track_mediakit_view(
    viewer_email: Optional[str] = None,
    viewer_ip: Optional[str] = None,
    viewer_country: Optional[str] = None,
    user_agent: Optional[str] = None,
):
    """Track a media kit view."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO mediakit_views (viewer_email, viewer_ip, viewer_country, user_agent, viewed_at)
               VALUES (?, ?, ?, ?, datetime('now', 'localtime'))""",
            (viewer_email, viewer_ip, viewer_country, user_agent),
        )
        conn.commit()


def get_mediakit_views(limit: int = 100) -> list:
    """Get recent media kit views."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, viewer_email, viewer_ip, viewer_country, user_agent, viewed_at 
               FROM mediakit_views 
               ORDER BY viewed_at DESC 
               LIMIT ?""",
            (limit,),
        )
        return [dict(row) for row in cursor.fetchall()]


def get_mediakit_views_stats() -> Dict[str, Any]:
    """Get media kit views statistics."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()

        # Total views
        cursor.execute("SELECT COUNT(*) FROM mediakit_views")
        total_views = cursor.fetchone()[0]

        # Views this month
        cursor.execute(
            """SELECT COUNT(*) FROM mediakit_views 
               WHERE viewed_at >= date('now', 'start of month')"""
        )
        views_this_month = cursor.fetchone()[0]

        # Unique viewers (by email)
        cursor.execute(
            """SELECT COUNT(DISTINCT viewer_email) FROM mediakit_views 
               WHERE viewer_email IS NOT NULL"""
        )
        unique_viewers = cursor.fetchone()[0]

        # Top countries
        cursor.execute(
            """SELECT viewer_country, COUNT(*) as count 
               FROM mediakit_views 
               WHERE viewer_country IS NOT NULL 
               GROUP BY viewer_country 
               ORDER BY count DESC 
               LIMIT 5"""
        )
        top_countries = [{"country": row[0], "count": row[1]} for row in cursor.fetchall()]

        return {
            "total_views": total_views,
            "views_this_month": views_this_month,
            "unique_viewers": unique_viewers,
            "top_countries": top_countries,
        }


# Media Kit Access Requests Functions
def create_access_request(
    email: str,
    name: Optional[str] = None,
    company: Optional[str] = None,
    message: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> int:
    """Create a new access request."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO mediakit_access_requests 
               (email, name, company, message, status, ip_address, requested_at)
               VALUES (?, ?, ?, ?, 'pending', ?, datetime('now', 'localtime'))""",
            (email, name, company, message, ip_address),
        )
        conn.commit()
        return cursor.lastrowid


def get_access_requests(status: Optional[str] = None) -> list:
    """Get access requests, optionally filtered by status."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        if status:
            cursor.execute(
                """SELECT id, email, name, company, message, status, ip_address, 
                   requested_at, approved_at 
                   FROM mediakit_access_requests 
                   WHERE status = ?
                   ORDER BY requested_at DESC""",
                (status,),
            )
        else:
            cursor.execute(
                """SELECT id, email, name, company, message, status, ip_address, 
                   requested_at, approved_at 
                   FROM mediakit_access_requests 
                   ORDER BY requested_at DESC"""
            )
        return [dict(row) for row in cursor.fetchall()]


def update_access_request_status(request_id: int, status: str):
    """Update access request status."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        if status == "approved":
            cursor.execute(
                """UPDATE mediakit_access_requests 
                   SET status = ?, approved_at = datetime('now', 'localtime')
                   WHERE id = ?""",
                (status, request_id),
            )
        else:
            cursor.execute(
                """UPDATE mediakit_access_requests 
                   SET status = ?, approved_at = NULL
                   WHERE id = ?""",
                (status, request_id),
            )
        conn.commit()


def check_access_approved(email: str) -> bool:
    """Check if an email has approved access."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT COUNT(*) FROM mediakit_access_requests 
               WHERE email = ? AND status = 'approved'""",
            (email,),
        )
        return cursor.fetchone()[0] > 0


# Media Kit Blocks Functions (New Block-Based System)
def get_mediakit_blocks() -> list:
    """Get all media kit blocks ordered by position."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, block_type, title, content, settings, position, is_visible 
               FROM mediakit_blocks 
               ORDER BY position ASC"""
        )
        rows = cursor.fetchall()
        blocks = []
        for row in rows:
            blocks.append(
                {
                    "id": row[0],
                    "block_type": row[1],
                    "title": row[2],
                    "content": row[3],
                    "settings": json.loads(row[4]) if row[4] else {},
                    "position": row[5],
                    "is_visible": bool(row[6]),
                }
            )
        return blocks


def get_visible_mediakit_blocks() -> list:
    """Get only visible media kit blocks ordered by position."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, block_type, title, content, settings, position 
               FROM mediakit_blocks 
               WHERE is_visible = 1
               ORDER BY position ASC"""
        )
        rows = cursor.fetchall()
        blocks = []
        for row in rows:
            blocks.append(
                {
                    "id": row[0],
                    "block_type": row[1],
                    "title": row[2],
                    "content": row[3],
                    "settings": json.loads(row[4]) if row[4] else {},
                    "position": row[5],
                }
            )
        return blocks


def create_mediakit_block(
    block_type: str, title: str = None, content: str = None, settings: dict = None, position: int = None
) -> int:
    """Create a new media kit block."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()

        # If position not provided, add at the end
        if position is None:
            cursor.execute("SELECT MAX(position) FROM mediakit_blocks")
            max_pos = cursor.fetchone()[0]
            position = (max_pos + 1) if max_pos is not None else 0

        settings_json = json.dumps(settings) if settings else None

        cursor.execute(
            """INSERT INTO mediakit_blocks (block_type, title, content, settings, position, is_visible, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, 1, datetime('now', 'localtime'), datetime('now', 'localtime'))""",
            (block_type, title, content, settings_json, position),
        )
        conn.commit()
        return cursor.lastrowid


def update_mediakit_block(
    block_id: int, title: str = None, content: str = None, settings: dict = None, is_visible: bool = None
):
    """Update a media kit block."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()

        updates = []
        params = []

        if title is not None:
            updates.append("title = ?")
            params.append(title)

        if content is not None:
            updates.append("content = ?")
            params.append(content)

        if settings is not None:
            updates.append("settings = ?")
            params.append(json.dumps(settings))

        if is_visible is not None:
            updates.append("is_visible = ?")
            params.append(1 if is_visible else 0)

        if updates:
            updates.append("updated_at = datetime('now', 'localtime')")
            params.append(block_id)

            sql = f"UPDATE mediakit_blocks SET {', '.join(updates)} WHERE id = ?"
            cursor.execute(sql, params)
            conn.commit()


def delete_mediakit_block(block_id: int):
    """Delete a media kit block."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM mediakit_blocks WHERE id = ?", (block_id,))
        conn.commit()


def reorder_mediakit_blocks(block_positions: list):
    """Reorder media kit blocks. Expects list of {'id': int, 'position': int}."""
    with get_special_pages_db_connection() as conn:
        cursor = conn.cursor()
        for item in block_positions:
            cursor.execute(
                "UPDATE mediakit_blocks SET position = ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
                (item["position"], item["id"]),
            )
        conn.commit()
