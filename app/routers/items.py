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
from ..audit_log import log_action, ACTION_CREATE, ACTION_UPDATE, ACTION_DELETE, RESOURCE_ITEM

router = APIRouter()


# --- Helper Functions ---


async def background_scrape_and_update(item_id: int, url: str):
    """Background task to scrape link details and update item."""
    import logging

    logger = logging.getLogger(__name__)
    try:
        details = await scrape_link_details(url)
        update_data = {"title": details.get("title", "?"), "image_url": details.get("image_url")}
        # Only update if we got meaningful data
        if update_data["title"] != "?":
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
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": "Loading...", "type": "link"})
    return Item(**item_dict)


@router.post("/videos", response_model=Item)
async def create_video(req: ItemCreate, user=Depends(require_auth)):
    """Create a video item."""
    if not req.url:
        raise HTTPException(400, "URL fehlt")
    embed = get_video_embed_url(req.url) or req.url
    data = build_item_data("video", "Video", embed, page_id=req.page_id)
    item_dict = create_item_in_db(data)
    cache.invalidate("items")
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": "Video", "type": "video"})
    return Item(**item_dict)


@router.post("/headers", response_model=Item)
async def create_header(req: ItemCreate, user=Depends(require_auth)):
    """Create a header item."""
    item_dict = create_item_in_db(build_item_data("header", req.title, page_id=req.page_id))
    cache.invalidate("items")
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": req.title, "type": "header"})
    return Item(**item_dict)


@router.post("/slider_groups", response_model=Item)
async def create_slider(req: ItemCreate, user=Depends(require_auth)):
    """Create a slider group item."""
    item_dict = create_item_in_db(build_item_data("slider_group", req.title, page_id=req.page_id))
    cache.invalidate("items")
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": req.title, "type": "slider_group"})
    return Item(**item_dict)


@router.post("/grids", response_model=Item)
async def create_grid(req: ItemCreate, user=Depends(require_auth)):
    """Create a grid item."""
    item_dict = create_item_in_db(build_item_data("grid", req.title, page_id=req.page_id))
    cache.invalidate("items")
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": req.title, "type": "grid"})
    return Item(**item_dict)


@router.post("/faqs", response_model=Item)
async def create_faq(req: ItemCreate, user=Depends(require_auth)):
    """Create a FAQ item."""
    item_dict = create_item_in_db(build_item_data("faq", req.title, "", page_id=req.page_id))
    cache.invalidate("items")
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": req.title, "type": "faq"})
    return Item(**item_dict)


@router.post("/dividers", response_model=Item)
async def create_divider(req: ItemCreate, user=Depends(require_auth)):
    """Create a divider item."""
    item_dict = create_item_in_db(build_item_data("divider", req.title or "---", page_id=req.page_id))
    cache.invalidate("items")
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": req.title or "---", "type": "divider"})
    return Item(**item_dict)


@router.post("/testimonials", response_model=Item)
async def create_testimonial(req: ItemCreate, user=Depends(require_auth)):
    """Create a testimonial item."""
    item_dict = create_item_in_db(build_item_data("testimonial", req.name, req.text, page_id=req.page_id))
    cache.invalidate("items")
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": req.name, "type": "testimonial"})
    return Item(**item_dict)


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
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": title, "type": "product"})
    return Item(**item_dict)


@router.post("/contact_form", response_model=Item)
async def create_contact_form(req: ItemCreate, user=Depends(require_auth)):
    """Create a contact form item."""
    item_dict = create_item_in_db(build_item_data("contact_form", req.title, page_id=req.page_id))
    cache.invalidate("items")
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": req.title, "type": "contact_form"})
    return Item(**item_dict)


@router.post("/email_form", response_model=Item)
async def create_email_form(req: ItemCreate, user=Depends(require_auth)):
    """Create an email form item."""
    item_dict = create_item_in_db(build_item_data("email_form", req.title, page_id=req.page_id))
    cache.invalidate("items")
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": req.title, "type": "email_form"})
    return Item(**item_dict)


@router.post("/countdowns", response_model=Item)
async def create_countdown(req: ItemCreate, user=Depends(require_auth)):
    """Create a countdown item."""
    item_dict = create_item_in_db(build_item_data("countdown", req.title, req.target_datetime, page_id=req.page_id))
    cache.invalidate("items")
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": req.title, "type": "countdown"})
    return Item(**item_dict)


@router.post("/music_embeds", response_model=Item)
async def create_music_embed(req: ItemCreate, user=Depends(require_auth)):
    """Create a music embed item (Spotify, Apple Music, SoundCloud)."""
    if not req.url:
        raise HTTPException(400, "URL fehlt")
    item_dict = create_item_in_db(build_item_data("music_embed", req.title or "Music", req.url, page_id=req.page_id))
    cache.invalidate("items")
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": req.title or "Music", "type": "music_embed"})
    return Item(**item_dict)


@router.post("/text_blocks", response_model=Item)
async def create_text_block(req: ItemCreate, user=Depends(require_auth)):
    """Create a text/bio block item."""
    item_dict = create_item_in_db(build_item_data("text_block", req.title or "", req.text or req.url or "", page_id=req.page_id))
    cache.invalidate("items")
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": req.title or "", "type": "text_block"})
    return Item(**item_dict)


@router.post("/social_embeds", response_model=Item)
async def create_social_embed(req: ItemCreate, user=Depends(require_auth)):
    """Create a social media embed item (YouTube, Instagram, TikTok)."""
    if not req.url:
        raise HTTPException(400, "URL fehlt")
    item_dict = create_item_in_db(build_item_data("social_embed", req.title or "Social", req.url, page_id=req.page_id))
    cache.invalidate("items")
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": req.title or "Social", "type": "social_embed"})
    return Item(**item_dict)


@router.post("/map_embeds", response_model=Item)
async def create_map_embed(req: ItemCreate, user=Depends(require_auth)):
    """Create a map embed item."""
    if not req.url:
        raise HTTPException(400, "URL fehlt")
    item_dict = create_item_in_db(build_item_data("map_embed", req.title or "Location", req.url, page_id=req.page_id))
    cache.invalidate("items")
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": req.title or "Location", "type": "map_embed"})
    return Item(**item_dict)


@router.post("/embeds", response_model=Item)
async def create_embed(req: ItemCreate, user=Depends(require_auth)):
    """Create an embed item (YouTube, Spotify, TikTok)."""
    if not req.url:
        raise HTTPException(400, "URL fehlt")
    item_dict = create_item_in_db(build_item_data("embed", req.title or "Embed", req.url, page_id=req.page_id))
    cache.invalidate("items")
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": req.title or "Embed", "type": "embed"})
    return Item(**item_dict)


@router.post("/rich_texts", response_model=Item)
async def create_rich_text(req: ItemCreate, user=Depends(require_auth)):
    """Create a rich text block."""
    item_dict = create_item_in_db(build_item_data("rich_text", req.title or "", req.text or req.url or "", page_id=req.page_id))
    cache.invalidate("items")
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": req.title or "", "type": "rich_text"})
    return Item(**item_dict)


@router.post("/spacers", response_model=Item)
async def create_spacer(req: ItemCreate, user=Depends(require_auth)):
    """Create a spacer block."""
    item_dict = create_item_in_db(build_item_data("spacer", req.title or "md", page_id=req.page_id))
    cache.invalidate("items")
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": req.title or "md", "type": "spacer"})
    return Item(**item_dict)


@router.post("/image_carousels", response_model=Item)
async def create_image_carousel(req: ItemCreate, user=Depends(require_auth)):
    """Create an image carousel block."""
    item_dict = create_item_in_db(build_item_data("image_carousel", req.title or "Gallery", req.url or "", page_id=req.page_id))
    cache.invalidate("items")
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": req.title or "Gallery", "type": "image_carousel"})
    return Item(**item_dict)


@router.post("/button_groups", response_model=Item)
async def create_button_group(req: ItemCreate, user=Depends(require_auth)):
    """Create a button group block."""
    item_dict = create_item_in_db(build_item_data("button_group", req.title or "Buttons", req.url or "", page_id=req.page_id))
    cache.invalidate("items")
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": req.title or "Buttons", "type": "button_group"})
    return Item(**item_dict)


@router.post("/banners", response_model=Item)
async def create_banner(req: ItemCreate, user=Depends(require_auth)):
    """Create a banner block."""
    item_dict = create_item_in_db(build_item_data("banner", req.title or "Announcement", req.text or req.url or "", req.image_url, page_id=req.page_id))
    cache.invalidate("items")
    log_action(ACTION_CREATE, RESOURCE_ITEM, str(item_dict["id"]), user, {"title": req.title or "Announcement", "type": "banner"})
    return Item(**item_dict)


# --- Item Management ---


@router.put("/{id}", response_model=Item)
async def update_item(id: int, item: ItemUpdate, user=Depends(require_auth)):
    """Update an existing item."""
    updated = update_item_in_db(id, item.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(404, "Item nicht gefunden")
    cache.invalidate("items")
    log_action(ACTION_UPDATE, RESOURCE_ITEM, str(id), user, item.model_dump(exclude_unset=True))
    return Item(**updated)


@router.delete("/{id}")
async def delete_item(id: int, user=Depends(require_auth)):
    """Delete an item."""
    delete_item_from_db(id)
    cache.invalidate("items")
    log_action(ACTION_DELETE, RESOURCE_ITEM, str(id), user)
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
    log_action(ACTION_UPDATE, RESOURCE_ITEM, str(id), user, {"action": "toggle_visibility"})
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
