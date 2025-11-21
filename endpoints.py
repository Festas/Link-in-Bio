import os
import zipfile
import aiosqlite
import csv
import io
from pathlib import Path
# KORREKTUR: datetime Klasse direkt importieren
from datetime import datetime
from urllib.parse import urlparse
from fastapi import APIRouter, HTTPException, Request, Depends, Response, File, UploadFile
from fastapi.responses import StreamingResponse
from typing import List
import qrcode

from models import *
from database import (
    create_item_in_db, 
    update_item_in_db, 
    delete_item_from_db, 
    get_next_display_order, 
    get_db_connection,
    get_settings_from_db
)
from auth import require_auth, check_auth
from services import (
    scrape_link_details, 
    get_video_embed_url, 
    save_optimized_image, 
    generate_social_card, 
    get_country_from_ip, 
    APP_DOMAIN
)
from rate_limit import limiter_strict, limiter_standard
from cache import cache

router = APIRouter()
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "static" / "uploads"

# --- Auth Check ---

@router.get("/auth/check", dependencies=[Depends(limiter_strict)])
async def check_login(username: str = Depends(require_auth)):
    return {"status": "ok"}

# --- Helper ---

async def build_item_data(item_type, title, url=None, image_url=None, price=None, grid_columns=2):
    # Reihenfolge muss exakt zur DB-Tabelle passen:
    # item_type, title, url, image_url, display_order, parent_id, click_count, is_featured, is_active, is_affiliate, publish_on, expires_on, price, grid_columns
    return (item_type, title, url, image_url, await get_next_display_order(), None, 0, 0, 1, 0, None, None, price, grid_columns)

# --- Item Creation Endpoints ---

@router.post("/links", response_model=Item)
async def create_link(req: ItemCreate, user=Depends(require_auth)):
    if not req.url: raise HTTPException(400, "URL fehlt")
    details = await scrape_link_details(req.url)
    data = await build_item_data("link", details.get("title", "?"), details.get("url", req.url), details.get("image_url"))
    cache.invalidate("items")
    return Item(**await create_item_in_db(data))

@router.post("/videos", response_model=Item)
async def create_video(req: ItemCreate, user=Depends(require_auth)):
    if not req.url: raise HTTPException(400, "URL fehlt")
    embed = get_video_embed_url(req.url) or req.url
    data = await build_item_data("video", "Video", embed)
    cache.invalidate("items")
    return Item(**await create_item_in_db(data))

@router.post("/headers", response_model=Item)
async def create_header(req: ItemCreate, user=Depends(require_auth)):
    # Cache Invalidation hinzugefügt
    cache.invalidate("items")
    return Item(**await create_item_in_db(await build_item_data("header", req.title)))

@router.post("/slider_groups", response_model=Item)
async def create_slider(req: ItemCreate, user=Depends(require_auth)):
    cache.invalidate("items")
    return Item(**await create_item_in_db(await build_item_data("slider_group", req.title)))

@router.post("/grids", response_model=Item)
async def create_grid(req: ItemCreate, user=Depends(require_auth)):
    cache.invalidate("items")
    return Item(**await create_item_in_db(await build_item_data("grid", req.title)))

@router.post("/faqs", response_model=Item)
async def create_faq(req: ItemCreate, user=Depends(require_auth)):
    cache.invalidate("items")
    return Item(**await create_item_in_db(await build_item_data("faq", req.title, ""))) 

@router.post("/dividers", response_model=Item)
async def create_divider(req: ItemCreate, user=Depends(require_auth)):
    cache.invalidate("items")
    return Item(**await create_item_in_db(await build_item_data("divider", req.title or "---")))

@router.post("/testimonials", response_model=Item)
async def create_testimonial(req: ItemCreate, user=Depends(require_auth)):
    cache.invalidate("items")
    return Item(**await create_item_in_db(await build_item_data("testimonial", req.name, req.text))) 

@router.post("/products", response_model=Item)
async def create_product(req: ItemCreate, user=Depends(require_auth)):
    if not req.url: raise HTTPException(400, "URL fehlt")
    details = await scrape_link_details(req.url)
    title = req.title if req.title else details.get("title", "Produkt")
    data = await build_item_data("product", title, req.url, details.get("image_url"), req.price)
    cache.invalidate("items")
    return Item(**await create_item_in_db(data))

@router.post("/contact_form", response_model=Item)
async def create_contact_form(req: ItemCreate, user=Depends(require_auth)):
    cache.invalidate("items")
    return Item(**await create_item_in_db(await build_item_data("contact_form", req.title)))

@router.post("/email_form", response_model=Item)
async def create_email_form(req: ItemCreate, user=Depends(require_auth)):
    cache.invalidate("items")
    return Item(**await create_item_in_db(await build_item_data("email_form", req.title)))

@router.post("/countdowns", response_model=Item)
async def create_countdown(req: ItemCreate, user=Depends(require_auth)):
    cache.invalidate("items")
    return Item(**await create_item_in_db(await build_item_data("countdown", req.title, req.target_datetime)))

# --- Item Management ---

@router.put("/items/{id}", response_model=Item)
async def update_item(id: int, item: ItemUpdate, user=Depends(require_auth)):
    updated = await update_item_in_db(id, item.model_dump(exclude_unset=True))
    if not updated: raise HTTPException(404, "Item nicht gefunden")
    cache.invalidate("items")
    return Item(**updated)

@router.delete("/items/{id}")
async def delete_item(id: int, user=Depends(require_auth)):
    await delete_item_from_db(id)
    cache.invalidate("items")
    return Response(status_code=204)

@router.put("/items/{id}/toggle_visibility", response_model=Item)
async def toggle_visibility(id: int, user=Depends(require_auth)):
    async with get_db_connection() as conn:
        cursor = await conn.cursor()
        await cursor.execute("UPDATE items SET is_active = NOT is_active WHERE id = ?", (id,))
        await conn.commit()
        await cursor.execute("SELECT * FROM items WHERE id = ?", (id,))
        updated = await cursor.fetchone()
    if not updated: raise HTTPException(404, "Item nicht gefunden")
    cache.invalidate("items")
    return Item(**dict(updated))

@router.post("/items/reorder")
async def reorder(req: ReorderRequest, user=Depends(require_auth)):
    async with get_db_connection() as conn:
        for idx, iid in enumerate(req.ids):
            await conn.execute("UPDATE items SET display_order = ? WHERE id = ?", (idx, iid))
        await conn.commit()
    cache.invalidate("items")
    return Response(status_code=204)

# --- Uploads & Media ---

@router.post("/upload_image", response_model=ImageUploadResponse)
async def upload_image(file: UploadFile = File(...), user=Depends(require_auth)):
    if not file.content_type.startswith("image/"): raise HTTPException(400, "Ungültiger Dateityp.")
    try:
        url = save_optimized_image(file, UPLOAD_DIR)
        return ImageUploadResponse(url=url)
    except Exception as e: raise HTTPException(500, f"Upload Fehler: {e}")

@router.get("/media/files")
async def list_media_files(user=Depends(require_auth)):
    files = []
    if os.path.exists(UPLOAD_DIR):
        try:
            entries = sorted(os.scandir(UPLOAD_DIR), key=lambda e: e.stat().st_mtime, reverse=True)
            for entry in entries:
                if entry.is_file() and entry.name.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg')):
                    files.append({"name": entry.name, "url": f"/static/uploads/{entry.name}", "size": entry.stat().st_size})
        except: pass
    return files

@router.delete("/media/files/{filename}")
async def delete_media_file(filename: str, user=Depends(require_auth)):
    safe_name = os.path.basename(filename)
    path = UPLOAD_DIR / safe_name
    if not path.exists(): raise HTTPException(404, "Datei nicht gefunden")
    try:
        os.remove(path)
        return Response(status_code=204)
    except Exception as e: raise HTTPException(500, f"Löschfehler: {e}")

# --- Settings & Backup ---

@router.get("/settings", response_model=Settings, dependencies=[Depends(limiter_standard)])
async def get_settings():
    cached = cache.get("settings")
    if cached: return cached
    settings = Settings(**await get_settings_from_db())
    cache.set("settings", settings, ttl=300)
    return settings

@router.put("/settings", response_model=Settings)
async def update_settings(settings: Settings, user=Depends(require_auth)):
    async with get_db_connection() as conn:
        cursor = await conn.cursor()
        for k, v in settings.model_dump(exclude_unset=True).items():
            if v is not None: await cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, v))
        await conn.commit()
    cache.invalidate("settings")
    return Settings(**await get_settings_from_db())

@router.get("/backup/download")
async def download_backup(user=Depends(require_auth)):
    try:
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
            if os.path.exists("linktree.db"): zf.write("linktree.db")
            if os.path.exists(UPLOAD_DIR):
                for root, _, files in os.walk(UPLOAD_DIR):
                    for f in files: zf.write(os.path.join(root, f), os.path.relpath(os.path.join(root, f), UPLOAD_DIR.parent))
        buf.seek(0)
        filename = f"backup_{datetime.now().strftime('%Y%m%d_%H%M')}.zip"
        return StreamingResponse(buf, media_type="application/zip", headers={"Content-Disposition": f"attachment; filename={filename}"})
    except Exception as e: raise HTTPException(500, f"Backup Fehler: {e}")

# --- Analytics & Community ---

@router.get("/analytics", response_model=AnalyticsData)
async def get_analytics(user=Depends(require_auth)):
    async with get_db_connection() as conn:
        cur = await conn.cursor()
        await cur.execute("SELECT COUNT(id) FROM clicks")
        total_clicks = (await cur.fetchone())[0] or 0
        await cur.execute("SELECT COUNT(id) FROM subscribers")
        total_subs = (await cur.fetchone())[0] or 0
        
        await cur.execute("SELECT date(timestamp) as day, COUNT(id) as clicks FROM clicks WHERE timestamp >= date('now', '-30 days') GROUP BY day ORDER BY day ASC")
        clicks_per_day = [dict(r) for r in await cur.fetchall()]
        
        await cur.execute("SELECT i.id, i.title, COUNT(c.id) as clicks FROM clicks c JOIN items i ON c.item_id = i.id GROUP BY i.id, i.title ORDER BY clicks DESC LIMIT 10")
        top_links = [dict(r) for r in await cur.fetchall()]
        
        await cur.execute("SELECT CASE WHEN referer IS NULL OR referer = '' THEN '(Direkt)' ELSE referer END as referer_domain, COUNT(id) as clicks FROM clicks GROUP BY referer_domain ORDER BY clicks DESC LIMIT 10")
        top_referers = [dict(r) for r in await cur.fetchall()]
        
        await cur.execute("SELECT CASE WHEN country_code IS NULL THEN 'Unbekannt' ELSE country_code END as country, COUNT(id) as clicks FROM clicks GROUP BY country ORDER BY clicks DESC LIMIT 10")
        top_countries = [dict(r) for r in await cur.fetchall()]
        
        return AnalyticsData(total_clicks=total_clicks, clicks_per_day=clicks_per_day, top_links=top_links, top_referers=top_referers, top_countries=top_countries, total_subscribers=total_subs)

@router.get("/subscribers", response_model=List[Subscriber])
async def get_subscribers(user=Depends(require_auth)):
    async with get_db_connection() as conn:
        cursor = await conn.cursor()
        await cursor.execute("SELECT id, email, subscribed_at FROM subscribers ORDER BY subscribed_at DESC")
        return [dict(r) for r in await cursor.fetchall()]

@router.delete("/subscribers/{id}")
async def delete_subscriber(id: int, user=Depends(require_auth)):
    async with get_db_connection() as conn:
        await conn.execute("DELETE FROM subscribers WHERE id = ?", (id,))
        await conn.commit()
    return Response(status_code=204)

@router.get("/subscribers/export")
async def export_subscribers(user=Depends(require_auth)):
    async with get_db_connection() as conn:
        cursor = await conn.execute("SELECT email, subscribed_at FROM subscribers ORDER BY subscribed_at DESC")
        subs = await cursor.fetchall()
    
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(["email", "subscribed_at"])
    for s in subs: writer.writerow(s)
    
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=subscribers_{datetime.now().strftime('%Y%m%d')}.csv"
    return response

@router.get("/messages", response_model=List[Message])
async def get_messages(user=Depends(require_auth)):
    async with get_db_connection() as conn:
        cursor = await conn.cursor()
        await cursor.execute("SELECT id, name, email, message, sent_at FROM messages ORDER BY sent_at DESC")
        return [dict(r) for r in await cursor.fetchall()]

@router.delete("/messages/{id}")
async def delete_message(id: int, user=Depends(require_auth)):
    async with get_db_connection() as conn:
        await conn.execute("DELETE FROM messages WHERE id = ?", (id,))
        await conn.commit()
    return Response(status_code=204)

# --- Public Endpoints ---

@router.get("/items", response_model=List[Item], dependencies=[Depends(limiter_standard)])
async def get_public_items(request: Request):
    user = await check_auth(request)
    cache_key = f"items_{'admin' if user else 'public'}"
    cached = cache.get(cache_key)
    if cached: return cached

    query = "SELECT * FROM items"
    if user is None:
        query += " WHERE is_active = 1 AND (publish_on IS NULL OR publish_on <= datetime('now', 'localtime')) AND (expires_on IS NULL OR expires_on >= datetime('now', 'localtime'))"
    query += " ORDER BY display_order ASC"
    
    async with get_db_connection() as conn:
        cursor = await conn.execute(query)
        rows = await cursor.fetchall()
    
    items_dict = {}
    nested = []
    # Always create a new Item with a fresh children list
    for r in rows:
        item_data = dict(r)
        item_data['children'] = []
        item = Item(**item_data)
        items_dict[item.id] = item
        if item.parent_id is None:
            nested.append(item)

    for item in items_dict.values():
        if item.parent_id in items_dict:
            if item in nested:
                nested.remove(item)
            items_dict[item.parent_id].children.append(item)

    cache.set(cache_key, nested, ttl=300)
    return nested

@router.post("/click/{item_id}", dependencies=[Depends(limiter_strict)])
async def track_click(item_id: int, request: Request):
    try:
        referer = request.headers.get("referer")
        domain = urlparse(referer).netloc if referer else "(Direkt)"
        ip = request.client.host
        country = await get_country_from_ip(ip)
        async with get_db_connection() as conn:
            await conn.execute("INSERT INTO clicks (item_id, referer, country_code) VALUES (?, ?, ?)", (item_id, domain, country))
            await conn.commit()
    except: pass
    return Response(status_code=204)

@router.post("/subscribe", dependencies=[Depends(limiter_strict)])
async def subscribe(req: SubscribeRequest):
    if not req.privacy_agreed: raise HTTPException(400, "Datenschutz nicht akzeptiert")
    try:
        async with get_db_connection() as conn:
            await conn.execute("INSERT INTO subscribers (email) VALUES (?)", (req.email,))
            await conn.commit()
        return {"message": "Abonniert!"}
    except aiosqlite.IntegrityError: return {"message": "Bereits registriert."}

@router.post("/contact", dependencies=[Depends(limiter_strict)])
async def contact(req: ContactRequest):
    if not req.privacy_agreed: raise HTTPException(400, "Datenschutz nicht akzeptiert")
    async with get_db_connection() as conn:
        await conn.execute("INSERT INTO messages (name, email, message) VALUES (?, ?, ?)", (req.name, req.email, req.message))
        await conn.commit()
    return {"message": "Gesendet!"}

# --- Tools ---

@router.get("/social/card.png")
async def social_card():
    settings = await get_settings_from_db()
    img = await generate_social_card(settings)
    return StreamingResponse(img, media_type="image/png")

@router.get("/contact.vcf", dependencies=[Depends(limiter_standard)])
async def vcard():
    s = await get_settings_from_db()
    vcf = f"BEGIN:VCARD\nVERSION:3.0\nFN:{s.get('title')}\nEMAIL:{s.get('social_email')}\nURL:https://{APP_DOMAIN}\nNOTE:{s.get('bio')}\nEND:VCARD"
    return Response(content=vcf, media_type="text/vcard", headers={"Content-Disposition": "attachment; filename=contact.vcf"})

@router.get("/qrcode", dependencies=[Depends(limiter_standard)])
async def get_qr():
    try: 
        # Import hier lokal, damit Fehler abgefangen werden kann
        import qrcode
        qr = qrcode.QRCode(box_size=10, border=4)
        qr.add_data(f"https://{APP_DOMAIN}")
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, "PNG")
        buf.seek(0)
        return StreamingResponse(buf, media_type="image/png")
    except ImportError: 
        raise HTTPException(501, "QR-Code Modul fehlt. Bitte 'pip install qrcode[pil]' ausführen.")
