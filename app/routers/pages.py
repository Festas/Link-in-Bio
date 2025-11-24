"""
Page Management Router
Handles CRUD operations for pages.
"""
import re
from fastapi import APIRouter, HTTPException, Depends, Response
from typing import List

from ..models import Page, PageCreate, PageUpdate
from ..database import (
    get_all_pages,
    get_page_by_id,
    get_page_by_slug,
    create_page,
    update_page,
    delete_page,
)
from ..auth_unified import require_auth
from ..cache_unified import cache

router = APIRouter()

# Slug validation pattern
SLUG_PATTERN = re.compile(r'^[a-z0-9-]+$')


@router.get("", response_model=List[Page])
async def get_pages(user=Depends(require_auth)):
    """Get all pages."""
    pages = get_all_pages()
    return [Page(**page) for page in pages]


@router.get("/{page_id}", response_model=Page)
async def get_page(page_id: int, user=Depends(require_auth)):
    """Get a specific page by ID."""
    page = get_page_by_id(page_id)
    if not page:
        raise HTTPException(404, "Page nicht gefunden")
    return Page(**page)


@router.post("", response_model=Page)
async def create_new_page(page_data: PageCreate, user=Depends(require_auth)):
    """Create a new page."""
    # Validate slug format
    if not SLUG_PATTERN.match(page_data.slug):
        raise HTTPException(400, "Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten")
    
    # Check if slug already exists
    existing = get_page_by_slug(page_data.slug)
    if existing:
        raise HTTPException(400, "Eine Seite mit diesem Slug existiert bereits")
    page = create_page(
        slug=page_data.slug,
        title=page_data.title,
        bio=page_data.bio or "",
        image_url=page_data.image_url or "",
        bg_image_url=page_data.bg_image_url or "",
    )
    cache.invalidate("items")
    return Page(**page)


@router.put("/{page_id}", response_model=Page)
async def update_existing_page(page_id: int, page_data: PageUpdate, user=Depends(require_auth)):
    """Update a page."""
    # If slug is being updated, validate and check it doesn't conflict
    if page_data.slug:
        if not SLUG_PATTERN.match(page_data.slug):
            raise HTTPException(400, "Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten")
        existing = get_page_by_slug(page_data.slug)
        if existing and existing["id"] != page_id:
            raise HTTPException(400, "Eine Seite mit diesem Slug existiert bereits")
    
    updated = update_page(page_id, page_data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(404, "Page nicht gefunden")
    cache.invalidate("items")
    return Page(**updated)


@router.delete("/{page_id}")
async def delete_existing_page(page_id: int, user=Depends(require_auth)):
    """Delete a page and all its items."""
    page = get_page_by_id(page_id)
    if not page:
        raise HTTPException(404, "Page nicht gefunden")
    # Don't allow deleting the default page (slug = '')
    if page["slug"] == "":
        raise HTTPException(400, "Die Hauptseite kann nicht gelöscht werden")
    delete_page(page_id)
    cache.invalidate("items")
    return Response(status_code=204)
