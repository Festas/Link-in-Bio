"""
Special Pages Router

Handles API endpoints for special pages (impressum, datenschutz, ueber-mich, etc.)
and their block-based content management.
"""

import logging
from fastapi import APIRouter, HTTPException, Request, Depends

from ..auth_unified import require_auth
from ..database import (
    get_all_special_pages,
    get_special_page,
    get_special_page_blocks,
    update_special_page,
    save_special_page_blocks,
    update_special_page_block,
    delete_special_page_block,
)

router = APIRouter(prefix="/special-pages", tags=["Special Pages"])
logger = logging.getLogger(__name__)


@router.get("", dependencies=[Depends(require_auth)])
async def get_special_pages_list():
    """Get all special pages for admin panel."""
    pages = get_all_special_pages()
    return {"pages": pages}


@router.get("/{page_key}", dependencies=[Depends(require_auth)])
async def get_special_page_content(page_key: str):
    """Get specific special page content."""
    page = get_special_page(page_key)
    if not page:
        raise HTTPException(404, "Seite nicht gefunden")

    # Get blocks if they exist
    blocks = get_special_page_blocks(page_key)
    page["blocks"] = blocks

    return page


@router.put("/{page_key}", dependencies=[Depends(require_auth)])
async def update_special_page_content(page_key: str, request: Request):
    """Update special page content."""
    data = await request.json()
    title = data.get("title", "")
    subtitle = data.get("subtitle", "")
    content = data.get("content", "")

    if not title or not content:
        raise HTTPException(400, "Titel und Inhalt sind erforderlich")

    update_special_page(page_key, title, subtitle, content)
    return {"message": "Seite aktualisiert"}


# Special Page Blocks endpoints
@router.get("/{page_key}/blocks", dependencies=[Depends(require_auth)])
async def get_special_page_blocks_endpoint(page_key: str):
    """Get all blocks for a special page."""
    blocks = get_special_page_blocks(page_key)
    return {"blocks": blocks}


@router.post("/{page_key}/blocks", dependencies=[Depends(require_auth)])
async def save_special_page_blocks_endpoint(page_key: str, request: Request):
    """Save blocks for a special page."""
    data = await request.json()
    blocks = data.get("blocks", [])

    save_special_page_blocks(page_key, blocks)
    return {"message": "Blöcke gespeichert"}


# Separate router for block-specific operations (different prefix)
block_router = APIRouter(prefix="/special-page-blocks", tags=["Special Page Blocks"])


@block_router.put("/{block_id}", dependencies=[Depends(require_auth)])
async def update_special_page_block_endpoint(block_id: int, request: Request):
    """Update a specific block."""
    data = await request.json()
    content = data.get("content", "")
    settings = data.get("settings", {})

    update_special_page_block(block_id, content, settings)
    return {"message": "Block aktualisiert"}


@block_router.delete("/{block_id}", dependencies=[Depends(require_auth)])
async def delete_special_page_block_endpoint(block_id: int):
    """Delete a specific block."""
    delete_special_page_block(block_id)
    return {"message": "Block gelöscht"}
