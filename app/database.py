import sqlite3
import os
from typing import Dict, Any, Optional
from contextlib import contextmanager
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
DATABASE_FILE = os.getenv("DATABASE_FILE", "linktree.db")


@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    print("Initialisiere Datenbank...")
    with get_db_connection() as conn:
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

        # Create Table (Updated)
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
            FOREIGN KEY (parent_id) REFERENCES items(id) ON DELETE SET NULL,
            FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
        )"""
        )

        cursor.execute(
            """CREATE TABLE IF NOT EXISTS clicks (id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER NOT NULL, timestamp DATETIME DEFAULT (datetime('now', 'localtime')), referer TEXT, country_code TEXT, FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE)"""
        )
        cursor.execute("""CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)""")
        cursor.execute(
            """CREATE TABLE IF NOT EXISTS subscribers (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, subscribed_at DATETIME DEFAULT (datetime('now', 'localtime')), redirect_page_id INTEGER, FOREIGN KEY (redirect_page_id) REFERENCES pages(id) ON DELETE SET NULL)"""
        )
        cursor.execute(
            """CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL, sent_at DATETIME DEFAULT (datetime('now', 'localtime')))"""
        )
        
        # Special pages content table
        cursor.execute(
            """CREATE TABLE IF NOT EXISTS special_pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            page_key TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            subtitle TEXT,
            content TEXT NOT NULL,
            updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
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

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_items_display_order ON items(display_order)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_clicks_item_id ON clicks(item_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_items_page_id ON items(page_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_special_pages_key ON special_pages(page_key)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_mediakit_section ON mediakit_data(section)")

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
            "page_id": "ALTER TABLE items ADD COLUMN page_id INTEGER DEFAULT NULL REFERENCES pages(id) ON DELETE CASCADE",
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
            cursor.execute("ALTER TABLE subscribers ADD COLUMN redirect_page_id INTEGER DEFAULT NULL REFERENCES pages(id) ON DELETE SET NULL")

        # Create default page if none exists (for backward compatibility)
        cursor.execute("SELECT COUNT(*) FROM pages")
        if cursor.fetchone()[0] == 0:
            settings = get_settings_from_db()
            default_title = settings.get("title", "Mein Link-in-Bio")
            default_bio = settings.get("bio", "")
            default_image = settings.get("image_url", "")
            default_bg = settings.get("bg_image_url", "")
            cursor.execute(
                """INSERT INTO pages (slug, title, bio, image_url, bg_image_url, is_active) 
                   VALUES ('', ?, ?, ?, ?, 1)""",
                (default_title, default_bio, default_image, default_bg),
            )
            default_page_id = cursor.lastrowid
            # Migrate existing items to default page
            cursor.execute("UPDATE items SET page_id = ? WHERE page_id IS NULL", (default_page_id,))

        default_settings = {
            "title": os.getenv("DEFAULT_PROFILE_NAME", "Eric | Tech & Gaming"),
            "bio": os.getenv("DEFAULT_PROFILE_BIO", "Tech & Gaming Influencer aus Hamburg 🎮⚡ | Ingenieur & Content Creator | Ästhetik trifft Innovation"),
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
        
        # Initialize special pages with default content if not exists
        cursor.execute("SELECT COUNT(*) FROM special_pages")
        if cursor.fetchone()[0] == 0:
            default_special_pages = [
                ("ueber-mich", "Über mich", "Tech & Gaming Enthusiast aus Hamburg", 
                 """<section><h2>Hallo! 👋</h2><p>Willkommen auf meiner Seite! Ich bin Eric, Tech- und Gaming-Enthusiast aus der schönen Hansestadt Hamburg. Hier vereinen sich meine Leidenschaften für innovative Technologien, Gaming und ästhetisches Design.</p></section><section><h2>Was ich mache 🎮⚡</h2><p>Als Ingenieur und Content Creator verbinde ich technisches Know-how mit kreativer Leidenschaft. Mein Fokus liegt auf:</p><ul><li><strong>Gaming Content:</strong> Reviews, Streams und Gameplay-Highlights aus der Welt des Gaming</li><li><strong>Tech & Innovation:</strong> Neueste Technologietrends, Hardware-Tests und Software-Entwicklung</li><li><strong>Engineering:</strong> Einblicke in die Welt der Technik und innovative Lösungsansätze</li><li><strong>Design & Ästhetik:</strong> Wo Funktionalität auf visuelles Design trifft</li></ul></section>"""),
                ("impressum", "Impressum", "Angaben gemäß § 5 TMG",
                 """<section><h2>Angaben gemäß § 5 TMG</h2><p>Eric [Nachname]<br>[Straße und Hausnummer]<br>[PLZ] Hamburg<br>Deutschland</p></section><section><h2>Kontakt</h2><p><strong>E-Mail:</strong> kontakt@example.com</p></section>"""),
                ("datenschutz", "Datenschutzerklärung", "Ihre Privatsphäre ist uns wichtig",
                 """<section><h2>1. Datenschutz auf einen Blick</h2><p>Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen.</p></section>""")
            ]
            for page_key, title, subtitle, content in default_special_pages:
                cursor.execute(
                    "INSERT INTO special_pages (page_key, title, subtitle, content) VALUES (?, ?, ?, ?)",
                    (page_key, title, subtitle, content)
                )
        
        conn.commit()


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
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pages WHERE slug = ?", (slug,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_page_by_id(page_id: int) -> Optional[Dict[str, Any]]:
    """Get a page by its ID."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pages WHERE id = ?", (page_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_all_pages() -> list:
    """Get all pages."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pages ORDER BY created_at ASC")
        return [dict(row) for row in cursor.fetchall()]


def create_page(slug: str, title: str, bio: str = "", image_url: str = "", bg_image_url: str = "") -> dict:
    """Create a new page."""
    with get_db_connection() as conn:
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
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, list(data.values()) + [page_id])
        conn.commit()
        cursor.execute("SELECT * FROM pages WHERE id = ?", (page_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def delete_page(page_id: int):
    """Delete a page and all its items."""
    with get_db_connection() as conn:
        conn.execute("DELETE FROM pages WHERE id = ?", (page_id,))
        conn.commit()


def get_special_page(page_key: str) -> Optional[Dict[str, Any]]:
    """Get special page content by key (ueber-mich, impressum, datenschutz)."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM special_pages WHERE page_key = ?", (page_key,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_all_special_pages() -> list:
    """Get all special pages."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM special_pages ORDER BY page_key")
        return [dict(row) for row in cursor.fetchall()]


def update_special_page(page_key: str, title: str, subtitle: str, content: str):
    """Update special page content."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """UPDATE special_pages 
               SET title = ?, subtitle = ?, content = ?, updated_at = datetime('now', 'localtime')
               WHERE page_key = ?""",
            (title, subtitle, content, page_key)
        )
        conn.commit()


def get_mediakit_data() -> Dict[str, Dict[str, str]]:
    """Get all media kit data organized by section."""
    with get_db_connection() as conn:
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
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO mediakit_data (section, key, value, display_order, updated_at)
               VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
               ON CONFLICT(section, key) 
               DO UPDATE SET value = ?, display_order = ?, updated_at = datetime('now', 'localtime')""",
            (section, key, value, display_order, value, display_order)
        )
        conn.commit()


def delete_mediakit_entry(section: str, key: str):
    """Delete a media kit entry."""
    with get_db_connection() as conn:
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
            (platform, username, stats_data, stats_data)
        )
        conn.commit()


def get_social_stats_cache(platform: Optional[str] = None) -> Dict[str, Any]:
    """Get cached social media stats, optionally filtered by platform."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        if platform:
            cursor.execute(
                "SELECT platform, username, stats_data, fetched_at FROM social_stats_cache WHERE platform = ?",
                (platform,)
            )
        else:
            cursor.execute("SELECT platform, username, stats_data, fetched_at FROM social_stats_cache")
        
        rows = cursor.fetchall()
        result = {}
        for row in rows:
            import json
            result[row[0]] = {
                'username': row[1],
                'data': json.loads(row[2]),
                'fetched_at': row[3]
            }
        return result


def clear_social_stats_cache():
    """Clear all cached social media stats."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM social_stats_cache")
        conn.commit()
