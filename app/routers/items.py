"""
Item Management Router
Handles CRUD operations for items (links, videos, headers, etc.).
"""
from fastapi import APIRouter, HTTPException, Depends, Response, BackgroundTasks
from typing import Optional, List

from ..models import Item, ItemCreate, ItemUpdate, ReorderRequest
from ..database import (
    create_item_in_db,
    update_item_in_db,
    delete_item_from_db,
    get_next_display_order,
    get_db_connection,
)
from ..auth_unified import require_auth
from ..services import get_video_embed_url, scrape_link_details, save_optimized_image
from ..cache_unified import cache

router = APIRouter()


# --- Helper Functions ---

async def background_scrape_and_update(item_id: int, url: str):
    """Background task to scrape link details and update item."""
    import logging
    logger = logging.getLogger(__name__)
    try:
        details = await scrape_link_details(url)
        image_url = None
        if details.get("image"):
            image_url = await save_optimized_image(details["image"])
        update_data = {"title": details["title"], "image_url": image_url}
        update_item_in_db(item_id, update_data)
        cache.invalidate("items")
    except Exception as e:
        logger.error(f"Failed to scrape link details: {e}")


def build_item_data(item_type, title, url=None, image_url=None, price=None, grid_columns=2, page_id=None):
    """Build item data tuple for database insertion."""
    # Order must match the DB table schema exactly:
    # item_type, title, url, image_url, display_order, parent_id, click_count, is_featured, is_active, is_affiliate, publish_on, expires_on, price, grid_columns, page_id
    return (
        item_type,
        title,
        url,
        image_url,
        get_next_display_order(page_id),
        None,
        0,
        0,
        1,
        0,
        None,
        None,
        price,
        grid_columns,
        page_id,
    )


# --- Item Creation Endpoints ---


@router.post("/links", response_model=Item)
async def create_link(req: ItemCreate, background_tasks: BackgroundTasks, user=Depends(require_auth)):
    """Create a link item with background scraping."""
    if not req.url:
        raise HTTPException(400, "URL fehlt")
    # Create item immediately with placeholder
    data = build_item_data("link", "Loading...", req.url, None, page_id=req.page_id)
    item_dict = create_item_in_db(data)
    # Schedule background scraping
    background_tasks.add_task(background_scrape_and_update, item_dict["id"], req.url)
    cache.invalidate("items")
    return Item(**item_dict)


@router.post("/videos", response_model=Item)
async def create_video(req: ItemCreate, user=Depends(require_auth)):
    """Create a video item."""
    if not req.url:
        raise HTTPException(400, "URL fehlt")
    embed = get_video_embed_url(req.url) or req.url
    data = build_item_data("video", "Video", embed, page_id=req.page_id)
    cache.invalidate("items")
    return Item(**create_item_in_db(data))


@router.post("/headers", response_model=Item)
async def create_header(req: ItemCreate, user=Depends(require_auth)):
    """Create a header item."""
    cache.invalidate("items")
    return Item(**create_item_in_db(build_item_data("header", req.title, page_id=req.page_id)))


@router.post("/slider_groups", response_model=Item)
async def create_slider(req: ItemCreate, user=Depends(require_auth)):
    """Create a slider group item."""
    cache.invalidate("items")
    return Item(**create_item_in_db(build_item_data("slider_group", req.title, page_id=req.page_id)))


@router.post("/grids", response_model=Item)
async def create_grid(req: ItemCreate, user=Depends(require_auth)):
    """Create a grid item."""
    cache.invalidate("items")
    return Item(**create_item_in_db(build_item_data("grid", req.title, page_id=req.page_id)))


@router.post("/faqs", response_model=Item)
async def create_faq(req: ItemCreate, user=Depends(require_auth)):
    """Create a FAQ item."""
    cache.invalidate("items")
    return Item(**create_item_in_db(build_item_data("faq", req.title, "", page_id=req.page_id)))


@router.post("/dividers", response_model=Item)
async def create_divider(req: ItemCreate, user=Depends(require_auth)):
    """Create a divider item."""
    cache.invalidate("items")
    return Item(**create_item_in_db(build_item_data("divider", req.title or "---", page_id=req.page_id)))


@router.post("/testimonials", response_model=Item)
async def create_testimonial(req: ItemCreate, user=Depends(require_auth)):
    """Create a testimonial item."""
    cache.invalidate("items")
    return Item(**create_item_in_db(build_item_data("testimonial", req.name, req.text, page_id=req.page_id)))


@router.post("/products", response_model=Item)
async def create_product(req: ItemCreate, background_tasks: BackgroundTasks, user=Depends(require_auth)):
    """Create a product item with optional background scraping."""
    if not req.url:
        raise HTTPException(400, "URL fehlt")
    # Create item immediately with placeholder
    title = req.title if req.title else "Loading..."
    data = build_item_data("product", title, req.url, None, req.price, page_id=req.page_id)
    item_dict = create_item_in_db(data)
    # Schedule background scraping if no custom title was provided
    if not req.title:
        background_tasks.add_task(background_scrape_and_update, item_dict["id"], req.url)
    cache.invalidate("items")
    return Item(**item_dict)


@router.post("/contact_form", response_model=Item)
async def create_contact_form(req: ItemCreate, user=Depends(require_auth)):
    """Create a contact form item."""
    cache.invalidate("items")
    return Item(**create_item_in_db(build_item_data("contact_form", req.title, page_id=req.page_id)))


@router.post("/email_form", response_model=Item)
async def create_email_form(req: ItemCreate, user=Depends(require_auth)):
    """Create an email form item."""
    cache.invalidate("items")
    return Item(**create_item_in_db(build_item_data("email_form", req.title, page_id=req.page_id)))


@router.post("/countdowns", response_model=Item)
async def create_countdown(req: ItemCreate, user=Depends(require_auth)):
    """Create a countdown item."""
    cache.invalidate("items")
    return Item(**create_item_in_db(build_item_data("countdown", req.title, req.target_datetime, page_id=req.page_id)))


# --- Item Management ---


@router.put("/{id}", response_model=Item)
async def update_item(id: int, item: ItemUpdate, user=Depends(require_auth)):
    """Update an existing item."""
    updated = update_item_in_db(id, item.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(404, "Item nicht gefunden")
    cache.invalidate("items")
    return Item(**updated)


@router.delete("/{id}")
async def delete_item(id: int, user=Depends(require_auth)):
    """Delete an item."""
    delete_item_from_db(id)
    cache.invalidate("items")
    return Response(status_code=204)


@router.put("/{id}/toggle_visibility", response_model=Item)
async def toggle_visibility(id: int, user=Depends(require_auth)):
    """Toggle item visibility."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE items SET is_active = NOT is_active WHERE id = ?", (id,))
        conn.commit()
        cursor.execute("SELECT * FROM items WHERE id = ?", (id,))
        updated = cursor.fetchone()
    if not updated:
        raise HTTPException(404, "Item nicht gefunden")
    cache.invalidate("items")
    return Item(**dict(updated))


@router.post("/reorder")
async def reorder(req: ReorderRequest, user=Depends(require_auth)):
    """Reorder items."""
    with get_db_connection() as conn:
        for idx, iid in enumerate(req.ids):
            conn.execute("UPDATE items SET display_order = ? WHERE id = ?", (idx, iid))
        conn.commit()
    cache.invalidate("items")
    return Response(status_code=204)
