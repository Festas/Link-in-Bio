import aiosqlite
import os
from typing import Dict, Any, Optional
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
DATABASE_FILE = "linktree.db"

@asynccontextmanager
async def get_db_connection():
    conn = await aiosqlite.connect(DATABASE_FILE)
    conn.row_factory = aiosqlite.Row 
    try: yield conn
    finally: await conn.close()

async def init_db():
    print("Initialisiere Datenbank...")
    async with get_db_connection() as conn:
        cursor = await conn.cursor()
        
        # Create Table (Updated)
        await cursor.execute("""CREATE TABLE IF NOT EXISTS items (
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
            FOREIGN KEY (parent_id) REFERENCES items(id) ON DELETE SET NULL
        )""")
        
        await cursor.execute("""CREATE TABLE IF NOT EXISTS clicks (id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER NOT NULL, timestamp DATETIME DEFAULT (datetime('now', 'localtime')), referer TEXT, country_code TEXT, FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE)""")
        await cursor.execute("""CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)""")
        await cursor.execute("""CREATE TABLE IF NOT EXISTS subscribers (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, subscribed_at DATETIME DEFAULT (datetime('now', 'localtime')))""")
        await cursor.execute("""CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL, sent_at DATETIME DEFAULT (datetime('now', 'localtime')))""")
        
        await cursor.execute("CREATE INDEX IF NOT EXISTS idx_items_display_order ON items(display_order)")
        await cursor.execute("CREATE INDEX IF NOT EXISTS idx_clicks_item_id ON clicks(item_id)")
        
        # Migrationen (Fix für grid_columns)
        await cursor.execute("PRAGMA table_info(items)")
        columns_items = [col[1] for col in await cursor.fetchall()]
        
        migrations = {
            'price': "ALTER TABLE items ADD COLUMN price TEXT DEFAULT NULL",
            'grid_columns': "ALTER TABLE items ADD COLUMN grid_columns INTEGER DEFAULT 2",
            'publish_on': "ALTER TABLE items ADD COLUMN publish_on TEXT DEFAULT NULL",
            'expires_on': "ALTER TABLE items ADD COLUMN expires_on TEXT DEFAULT NULL",
            'is_featured': "ALTER TABLE items ADD COLUMN is_featured BOOLEAN DEFAULT 0",
            'is_affiliate': "ALTER TABLE items ADD COLUMN is_affiliate BOOLEAN DEFAULT 0",
            'parent_id': "ALTER TABLE items ADD COLUMN parent_id INTEGER DEFAULT NULL REFERENCES items(id) ON DELETE SET NULL"
        }
        
        for col, sql in migrations.items():
            if col not in columns_items:
                try: await cursor.execute(sql)
                except: pass

        # Clicks Migration
        await cursor.execute("PRAGMA table_info(clicks)")
        click_cols = [c[1] for c in await cursor.fetchall()]
        if 'country_code' not in click_cols:
            await cursor.execute("ALTER TABLE clicks ADD COLUMN country_code TEXT DEFAULT NULL")

        default_settings = {'title': 'Mein Link-in-Bio', 'theme': 'theme-dark', 'button_style': 'style-rounded'}
        for key, value in default_settings.items():
            await cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, value))
        await conn.commit()

async def get_next_display_order() -> int:
    async with get_db_connection() as conn:
        cursor = await conn.cursor()
        await cursor.execute("SELECT MAX(display_order) FROM items")
        result = await cursor.fetchone()
        return (result[0] if result and result[0] else 0) + 1

async def get_settings_from_db() -> Dict[str, Any]:
    async with get_db_connection() as conn:
        cursor = await conn.cursor()
        await cursor.execute("SELECT key, value FROM settings")
        rows = await cursor.fetchall()
        return {row['key']: row['value'] for row in rows}

async def create_item_in_db(item_data: tuple) -> dict:
    async with get_db_connection() as conn:
        cursor = await conn.cursor()
        # 14 Parameter inkl grid_columns
        await cursor.execute("""INSERT INTO items (
            item_type, title, url, image_url, display_order, parent_id, 
            click_count, is_featured, is_active, is_affiliate, 
            publish_on, expires_on, price, grid_columns
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", item_data)
        await conn.commit()
        await cursor.execute("SELECT * FROM items WHERE id = ?", (cursor.lastrowid,))
        row = await cursor.fetchone()
        return dict(row)

async def update_item_in_db(item_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not data: return None
    set_clauses = [f"{key} = ?" for key in data.keys()]
    query = f"UPDATE items SET {', '.join(set_clauses)} WHERE id = ?"
    async with get_db_connection() as conn:
        cursor = await conn.cursor()
        await cursor.execute(query, list(data.values()) + [item_id])
        await conn.commit()
        await cursor.execute("SELECT * FROM items WHERE id = ?", (item_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None

async def delete_item_from_db(item_id: int):
    async with get_db_connection() as conn:
        await conn.execute("DELETE FROM items WHERE id = ?", (item_id,))
        await conn.commit()

