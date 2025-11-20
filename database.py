import sqlite3
import os
from typing import Dict, Any, Optional
from contextlib import contextmanager
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

DATABASE_FILE = "linktree.db"

@contextmanager
def get_db_connection():
    """
    Context Manager für sichere Datenbankverbindungen.
    Stellt sicher, dass die Verbindung immer geschlossen wird.
    Setzt automatisch row_factory auf sqlite3.Row.
    """
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row 
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    print("Datenbank wird initialisiert...")
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # --- Tabellen erstellen ---

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS items (
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
            FOREIGN KEY (parent_id) REFERENCES items(id) ON DELETE SET NULL
        )""")
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS clicks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            timestamp DATETIME DEFAULT (datetime('now', 'localtime')),
            referer TEXT,
            country_code TEXT,
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
        )""")
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY, 
            value TEXT
        )""")
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            subscribed_at DATETIME DEFAULT (datetime('now', 'localtime'))
        )""")
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            sent_at DATETIME DEFAULT (datetime('now', 'localtime'))
        )""")
        
        # --- Migrationen (Spalten hinzufügen falls fehlend) ---

        cursor.execute("PRAGMA table_info(items)")
        columns_items = [col[1] for col in cursor.fetchall()]
        
        migrations_items = {
            'parent_id': "ALTER TABLE items ADD COLUMN parent_id INTEGER DEFAULT NULL REFERENCES items(id) ON DELETE SET NULL",
            'click_count': "ALTER TABLE items ADD COLUMN click_count INTEGER DEFAULT 0",
            'is_featured': "ALTER TABLE items ADD COLUMN is_featured BOOLEAN DEFAULT 0",
            'is_active': "ALTER TABLE items ADD COLUMN is_active BOOLEAN DEFAULT 1",
            'is_affiliate': "ALTER TABLE items ADD COLUMN is_affiliate BOOLEAN DEFAULT 0",
            'publish_on': "ALTER TABLE items ADD COLUMN publish_on TEXT DEFAULT NULL",
            'expires_on': "ALTER TABLE items ADD COLUMN expires_on TEXT DEFAULT NULL",
            'price': "ALTER TABLE items ADD COLUMN price TEXT DEFAULT NULL"
        }
        
        for col, query in migrations_items.items():
            if col not in columns_items:
                cursor.execute(query)

        cursor.execute("PRAGMA table_info(clicks)")
        columns_clicks = [col[1] for col in cursor.fetchall()]
        if 'country_code' not in columns_clicks:
            cursor.execute("ALTER TABLE clicks ADD COLUMN country_code TEXT DEFAULT NULL")

        # --- Indizes ---
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_items_display_order ON items(display_order)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_clicks_item_id ON clicks(item_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_clicks_timestamp ON clicks(timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_clicks_country ON clicks(country_code)")

        # --- Defaults ---
        default_settings = {
            'title': 'Mein Link-in-Bio',
            'bio': 'Willkommen auf meiner Seite! Hier finden Sie alle wichtigen Links.',
            'image_url': '',
            'bg_image_url': '',
            'social_youtube': '', 'social_instagram': '', 'social_tiktok': '',
            'social_twitch': '', 'social_x': '', 'social_discord': '', 'social_email': '',
            'theme': 'theme-dark',
            'button_style': 'style-rounded',
            'custom_bg_color': '#111827',
            'custom_text_color': '#F9FAFB',
            'custom_button_color': '#1F2937',
            'custom_button_text_color': '#FFFFFF',
            'custom_html_head': '',
            'custom_html_body': ''
        }
        for key, value in default_settings.items():
            cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, value))
        
        conn.commit()
        
    print("Datenbank-Initialisierung abgeschlossen.")

def get_next_display_order() -> int:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(display_order) FROM items")
        result = cursor.fetchone()
        max_order = result[0] if result and result[0] is not None else 0
        return max_order + 1

def get_settings_from_db() -> Dict[str, Any]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM settings")
        rows = cursor.fetchall()
    
    settings_dict = {row['key']: row['value'] for row in rows}
    
    defaults = {
        'title': 'Mein Link-in-Bio',
        'bio': 'Willkommen auf meiner Seite!',
        'image_url': '',
        'bg_image_url': '',
        'social_youtube': '', 'social_instagram': '', 'social_tiktok': '',
        'social_twitch': '', 'social_x': '', 'social_discord': '', 'social_email': '',
        'theme': 'theme-dark',
        'button_style': 'style-rounded',
        'custom_bg_color': '#111827',
        'custom_text_color': '#F9FAFB',
        'custom_button_color': '#1F2937',
        'custom_button_text_color': '#FFFFFF',
        'custom_html_head': '',
        'custom_html_body': ''
    }
    for key, value in defaults.items():
        settings_dict.setdefault(key, value)
    
    return settings_dict

# --- CRUD Helper Funktionen ---

def create_item_in_db(item_data: tuple) -> dict:
    """Erstellt ein neues Item in der Datenbank."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO items (item_type, title, url, image_url, display_order, parent_id, 
                               click_count, is_featured, is_active, is_affiliate, 
                               publish_on, expires_on, price) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, item_data)
        new_id = cursor.lastrowid
        conn.commit()
        
        cursor.execute("SELECT * FROM items WHERE id = ?", (new_id,))
        return dict(cursor.fetchone())

def delete_item_from_db(item_id: int):
    """Löscht ein Item aus der Datenbank."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM items WHERE id = ?", (item_id,))
        conn.commit()

def update_item_in_db(item_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Aktualisiert ein Item dynamisch basierend auf dem Dictionary."""
    if not data:
        return None
        
    set_clauses = []
    params = []
    
    for key, value in data.items():
        set_clauses.append(f"{key} = ?")
        params.append(value)
        
    params.append(item_id)
    query = f"UPDATE items SET {', '.join(set_clauses)} WHERE id = ?"
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, tuple(params))
        conn.commit()
        
        cursor.execute("SELECT * FROM items WHERE id = ?", (item_id,))
        updated_item = cursor.fetchone()
        
        return dict(updated_item) if updated_item else None