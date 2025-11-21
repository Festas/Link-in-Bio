from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Response
from fastapi.responses import StreamingResponse
from typing import List
from models import *
from database import create_item_in_db, update_item_in_db, delete_item_from_db, get_next_display_order, get_db_connection, get_settings_from_db
from auth import require_auth
from services import scrape_link_details, get_video_embed_url, save_optimized_image, generate_social_card, get_country_from_ip, APP_DOMAIN
from rate_limit import limiter_strict, limiter_standard
from cache import cache
from pathlib import Path
import csv, io, datetime
import qrcode

router = APIRouter()
UPLOAD_DIR = Path(__file__).resolve().parent / "static" / "uploads"

@router.get("/auth/check", dependencies=[Depends(limiter_strict)])
async def check_login(username: str = Depends(require_auth)): return {"status": "ok"}

def build_item_data(item_type, title, url=None, image_url=None, price=None, grid_columns=2):
    # Order: item_type, title, url, image_url, display_order, parent_id, click_count, is_featured, is_active, is_affiliate, publish_on, expires_on, price, grid_columns
    return (item_type, title, url, image_url, get_next_display_order(), None, 0, 0, 1, 0, None, None, price, grid_columns)

@router.post("/links", response_model=Item)
async def create_link(req: ItemCreate, user=Depends(require_auth)):
    details = await scrape_link_details(req.url)
    data = build_item_data("link", details.get("title", "?"), details.get("url", req.url), details.get("image_url"))
    cache.invalidate("items"); return Item(**create_item_in_db(data))

@router.post("/videos", response_model=Item)
async def create_video(req: ItemCreate, user=Depends(require_auth)):
    embed = get_video_embed_url(req.url) or req.url
    data = build_item_data("video", "Video", embed)
    cache.invalidate("items"); return Item(**create_item_in_db(data))

@router.post("/products", response_model=Item)
async def create_product(req: ItemCreate, user=Depends(require_auth)):
    details = await scrape_link_details(req.url)
    data = build_item_data("product", req.title or details.get("title"), req.url, details.get("image_url"), req.price)
    cache.invalidate("items"); return Item(**create_item_in_db(data))

@router.post("/headers", response_model=Item)
async def create_header(req: ItemCreate, user=Depends(require_auth)):
    # FIX: Cache Invalidation hinzugefügt
    cache.invalidate("items")
    return Item(**create_item_in_db(build_item_data("header", req.title)))

@router.post("/slider_groups", response_model=Item)
async def create_slider(req: ItemCreate, user=Depends(require_auth)):
    # FIX: Cache Invalidation hinzugefügt
    cache.invalidate("items")
    return Item(**create_item_in_db(build_item_data("slider_group", req.title)))

@router.post("/grids", response_model=Item)
async def create_grid(req: ItemCreate, user=Depends(require_auth)):
    # FIX: Cache Invalidation hinzugefügt
    cache.invalidate("items")
    return Item(**create_item_in_db(build_item_data("grid", req.title)))

@router.post("/faqs", response_model=Item)
async def create_faq(req: ItemCreate, user=Depends(require_auth)):
    # FIX: Cache Invalidation hinzugefügt
    cache.invalidate("items")
    return Item(**create_item_in_db(build_item_data("faq", req.title, "")))

@router.post("/dividers", response_model=Item)
async def create_divider(req: ItemCreate, user=Depends(require_auth)):
    # FIX: Cache Invalidation hinzugefügt
    cache.invalidate("items")
    return Item(**create_item_in_db(build_item_data("divider", req.title or "---")))

@router.post("/testimonials", response_model=Item)
async def create_testimonial(req: ItemCreate, user=Depends(require_auth)):
    # FIX: Cache Invalidation hinzugefügt
    cache.invalidate("items")
    return Item(**create_item_in_db(build_item_data("testimonial", req.name, req.text)))

@router.post("/contact_form", response_model=Item)
async def create_contact(req: ItemCreate, user=Depends(require_auth)):
    # FIX: Cache Invalidation hinzugefügt
    cache.invalidate("items")
    return Item(**create_item_in_db(build_item_data("contact_form", req.title)))

@router.post("/email_form", response_model=Item)
async def create_email(req: ItemCreate, user=Depends(require_auth)):
    # FIX: Cache Invalidation hinzugefügt
    cache.invalidate("items")
    return Item(**create_item_in_db(build_item_data("email_form", req.title)))

@router.post("/countdowns", response_model=Item)
async def create_countdown(req: ItemCreate, user=Depends(require_auth)):
    # FIX: Cache Invalidation hinzugefügt
    cache.invalidate("items")
    return Item(**create_item_in_db(build_item_data("countdown", req.title, req.target_datetime)))

@router.put("/items/{id}", response_model=Item)
async def update_item(id: int, item: ItemUpdate, user=Depends(require_auth)):
    updated = update_item_in_db(id, item.model_dump(exclude_unset=True))
    if not updated: raise HTTPException(404, "Nicht gefunden")
    cache.invalidate("items"); return Item(**updated)

@router.delete("/items/{id}")
async def delete_item(id: int, user=Depends(require_auth)):
    delete_item_from_db(id); cache.invalidate("items"); return Response(status_code=204)

@router.put("/items/{id}/toggle_visibility", response_model=Item)
async def toggle_visibility(id: int, user=Depends(require_auth)):
    with get_db_connection() as conn:
        conn.execute("UPDATE items SET is_active = NOT is_active WHERE id = ?", (id,))
        conn.commit()
        row = conn.execute("SELECT * FROM items WHERE id = ?", (id,)).fetchone()
    cache.invalidate("items"); return Item(**dict(row))

@router.post("/items/reorder")
async def reorder(req: ReorderRequest, user=Depends(require_auth)):
    with get_db_connection() as conn:
        for idx, iid in enumerate(req.ids):
            conn.execute("UPDATE items SET display_order = ? WHERE id = ?", (idx, iid))
        conn.commit()
    cache.invalidate("items"); return Response(status_code=204)

@router.post("/upload_image", response_model=ImageUploadResponse)
async def upload(f: UploadFile = File(...), user=Depends(require_auth)):
    return ImageUploadResponse(url=save_optimized_image(f, UPLOAD_DIR))

@router.get("/media/files")
async def list_media(user=Depends(require_auth)):
    files = []
    if os.path.exists(UPLOAD_DIR):
        for e in os.scandir(UPLOAD_DIR):
            if e.is_file(): files.append({"name": e.name, "url": f"/static/uploads/{e.name}", "size": e.stat().st_size})
    return files

@router.delete("/media/files/{filename}")
async def delete_media(filename: str, user=Depends(require_auth)):
    try: os.remove(UPLOAD_DIR / filename); return Response(status_code=204)
    except: raise HTTPException(404, "Datei nicht gefunden")

@router.get("/settings", response_model=Settings, dependencies=[Depends(limiter_standard)])
async def get_settings():
    cached = cache.get("settings"); if cached: return cached
    s = Settings(**get_settings_from_db()); cache.set("settings", s); return s

@router.put("/settings", response_model=Settings)
async def update_settings(s: Settings, user=Depends(require_auth)):
    with get_db_connection() as conn:
        for k, v in s.model_dump(exclude_unset=True).items():
            if v is not None: conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, v))
        conn.commit()
    cache.invalidate("settings"); return Settings(**get_settings_from_db())

@router.get("/analytics", response_model=AnalyticsData)
async def get_analytics(user=Depends(require_auth)):
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(id) FROM clicks"); clicks = cur.fetchone()[0] or 0
        cur.execute("SELECT COUNT(id) FROM subscribers"); subs = cur.fetchone()[0] or 0
        cur.execute("SELECT date(timestamp) as day, COUNT(id) as clicks FROM clicks GROUP BY day ORDER BY day ASC"); cpd = [dict(r) for r in cur.fetchall()]
        cur.execute("SELECT i.id, i.title, COUNT(c.id) as clicks FROM clicks c JOIN items i ON c.item_id = i.id GROUP BY i.id, i.title ORDER BY clicks DESC LIMIT 10"); top = [dict(r) for r in cur.fetchall()]
        cur.execute("SELECT referer, COUNT(id) as clicks FROM clicks GROUP BY referer ORDER BY clicks DESC LIMIT 10"); ref = [dict(r) for r in cur.fetchall()]
        cur.execute("SELECT country_code as country, COUNT(id) as clicks FROM clicks GROUP BY country ORDER BY clicks DESC LIMIT 10"); country = [dict(r) for r in cur.fetchall()]
        return AnalyticsData(total_clicks=clicks, clicks_per_day=cpd, top_links=top, top_referers=ref, top_countries=country, total_subscribers=subs)

@router.get("/subscribers")
async def get_subs(user=Depends(require_auth)):
    with get_db_connection() as conn: return [dict(r) for r in conn.execute("SELECT * FROM subscribers ORDER BY subscribed_at DESC").fetchall()]

@router.get("/messages")
async def get_msgs(user=Depends(require_auth)):
    with get_db_connection() as conn: return [dict(r) for r in conn.execute("SELECT * FROM messages ORDER BY sent_at DESC").fetchall()]

@router.delete("/messages/{id}")
async def delete_msg(id: int, user=Depends(require_auth)):
    with get_db_connection() as conn: conn.execute("DELETE FROM messages WHERE id = ?", (id,)); conn.commit()
    return Response(status_code=204)

@router.get("/items", response_model=List[Item], dependencies=[Depends(limiter_standard)])
async def get_items(request: Request):
    user = await check_auth(request); cached = cache.get(f"items_{'admin' if user else 'public'}")
    if cached: return cached
    q = "SELECT * FROM items"; 
    if not user: q += " WHERE is_active = 1 AND (publish_on IS NULL OR publish_on <= datetime('now'))"
    q += " ORDER BY display_order ASC"
    with get_db_connection() as conn: rows = conn.execute(q).fetchall()
    
    nested = []; children = {}
    for r in rows:
        i = Item(**dict(r))
        if i.parent_id: 
            if i.parent_id not in children: children[i.parent_id] = []
            children[i.parent_id].append(i)
        else: nested.append(i)
    for p in nested:
        if p.id in children: p.children = children[p.id]
        
    cache.set(f"items_{'admin' if user else 'public'}", nested); return nested

@router.post("/click/{id}", dependencies=[Depends(limiter_strict)])
async def click(id: int, req: Request):
    ip = req.client.host; country = await get_country_from_ip(ip)
    with get_db_connection() as conn: conn.execute("INSERT INTO clicks (item_id, referer, country_code) VALUES (?, ?, ?)", (id, req.headers.get('referer'), country)); conn.commit()
    return Response(status_code=204)

@router.post("/subscribe")
async def subscribe(req: SubscribeRequest):
    if not req.privacy_agreed: raise HTTPException(400)
    try: 
        with get_db_connection() as conn: conn.execute("INSERT INTO subscribers (email) VALUES (?)", (req.email,)); conn.commit()
        return {"message": "OK"}
    except: return {"message": "Error"}

@router.post("/contact")
async def contact(req: ContactRequest):
    if not req.privacy_agreed: raise HTTPException(400)
    with get_db_connection() as conn: conn.execute("INSERT INTO messages (name, email, message) VALUES (?, ?, ?)", (req.name, req.email, req.message)); conn.commit()
    return {"message": "OK"}

@router.get("/social/card.png")
async def social():
    s = get_settings_from_db(); img = await generate_social_card(s); return StreamingResponse(img, media_type="image/png")

@router.get("/qrcode")
async def qr():
    qr = qrcode.QRCode(box_size=10); qr.add_data(f"https://{APP_DOMAIN}"); qr.make(fit=True); img = qr.make_image(fill_color="black", back_color="white"); buf = io.BytesIO(); img.save(buf, "PNG"); buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")
