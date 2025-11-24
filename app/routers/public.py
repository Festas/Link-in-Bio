"""
Public API Router
Handles public-facing endpoints (items, clicks, subscriptions, contact).
"""

import sqlite3
from urllib.parse import urlparse
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends, Request, Response

from ..models import Item, SubscribeRequest, ContactRequest
from ..database import get_db_connection
from ..auth_unified import check_auth
from ..services import get_country_from_ip
from ..rate_limit import limiter_standard, limiter_strict
from ..cache_unified import cache

router = APIRouter()


@router.get("/pages/public", dependencies=[Depends(limiter_standard)])
async def get_public_pages():
    """Get list of active pages for public use (e.g., newsletter redirect dropdown)."""
    with get_db_connection() as conn:
        pages = conn.execute("SELECT id, slug, title FROM pages WHERE is_active = 1 ORDER BY created_at ASC").fetchall()
        return [{"id": p[0], "slug": p[1], "title": p[2]} for p in pages]


@router.get("/items", response_model=List[Item], dependencies=[Depends(limiter_standard)])
async def get_public_items(request: Request, page_id: Optional[int] = None):
    """Get public items with caching."""
    user = await check_auth(request)
    cache_key = f"items_{'admin' if user else 'public'}_{page_id or 'all'}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    query = "SELECT * FROM items"
    params = []
    conditions = []

    if page_id is not None:
        conditions.append("page_id = ?")
        params.append(page_id)

    if user is None:
        conditions.append("is_active = 1")
        conditions.append("(publish_on IS NULL OR publish_on <= datetime('now', 'localtime'))")
        conditions.append("(expires_on IS NULL OR expires_on >= datetime('now', 'localtime'))")

    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY display_order ASC"

    with get_db_connection() as conn:
        rows = conn.execute(query, params).fetchall()

    items_dict = {}
    nested = []
    # Always create a new Item with a fresh children list
    for r in rows:
        item_data = dict(r)
        item_data["children"] = []
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
    """Track a link click."""
    try:
        referer = request.headers.get("referer")
        domain = urlparse(referer).netloc if referer else "(Direkt)"
        ip = request.client.host
        country = await get_country_from_ip(ip)
        with get_db_connection() as conn:
            conn.execute(
                "INSERT INTO clicks (item_id, referer, country_code) VALUES (?, ?, ?)", (item_id, domain, country)
            )
            conn.commit()
    except:
        pass
    return Response(status_code=204)


@router.post("/subscribe", dependencies=[Depends(limiter_strict)])
async def subscribe(req: SubscribeRequest):
    """Handle newsletter subscription."""
    if not req.privacy_agreed:
        raise HTTPException(400, "Datenschutz nicht akzeptiert")
    try:
        redirect_url = None
        with get_db_connection() as conn:
            # Validate redirect_page_id if provided
            if req.redirect_page_id:
                page = conn.execute(
                    "SELECT slug FROM pages WHERE id = ? AND is_active = 1", (req.redirect_page_id,)
                ).fetchone()
                if not page:
                    # Invalid or inactive page, ignore redirect
                    req.redirect_page_id = None
                else:
                    slug = page[0]
                    redirect_url = f"/{slug}" if slug else "/"

            conn.execute(
                "INSERT INTO subscribers (email, redirect_page_id) VALUES (?, ?)", (req.email, req.redirect_page_id)
            )
            conn.commit()

        return {"message": "Abonniert!", "redirect_url": redirect_url}
    except sqlite3.IntegrityError:
        return {"message": "Bereits registriert.", "redirect_url": None}


@router.post("/contact", dependencies=[Depends(limiter_strict)])
async def contact(req: ContactRequest):
    """Handle contact form submission."""
    if not req.privacy_agreed:
        raise HTTPException(400, "Datenschutz nicht akzeptiert")
    with get_db_connection() as conn:
        conn.execute("INSERT INTO messages (name, email, message) VALUES (?, ?, ?)", (req.name, req.email, req.message))
        conn.commit()
    return {"message": "Gesendet!"}
