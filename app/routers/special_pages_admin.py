"""
Special Pages Admin Router
Provides admin panel routes for managing special pages (Media Kit, Impressum, Datenschutz, etc.)
Accessible under /admin/mediakit, /admin/impressum, /admin/datenschutz, /admin/ueber-mich, /admin/kontakt
"""

from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import HTMLResponse
from app.config import templates
from app.auth_unified import require_auth

router = APIRouter()

# Define all special pages that have admin interfaces
SPECIAL_PAGES = {
    "mediakit": {
        "title": "Media Kit",
        "description": "Verwalte dein Media Kit, Statistiken und Kooperationen",
        "icon": "briefcase",
    },
    "impressum": {
        "title": "Impressum",
        "description": "Bearbeite die Impressum-Seite",
        "icon": "file-text",
    },
    "datenschutz": {
        "title": "Datenschutz",
        "description": "Bearbeite die Datenschutzerklärung",
        "icon": "shield",
    },
    "ueber-mich": {
        "title": "Über mich",
        "description": "Bearbeite die Über-mich-Seite",
        "icon": "user",
    },
    "kontakt": {
        "title": "Kontakt",
        "description": "Bearbeite die Kontakt-Seite",
        "icon": "mail",
    },
}


@router.get("/admin", response_class=HTMLResponse)
async def get_special_pages_admin_index(request: Request, user=Depends(require_auth)):
    """Main admin panel for special pages - shows overview/dashboard"""
    context = {"special_pages": SPECIAL_PAGES}
    return templates.TemplateResponse(request=request, name="admin_special_pages_index.html", context=context)


@router.get("/admin/{page_key}", response_class=HTMLResponse)
async def get_special_page_admin(request: Request, page_key: str, user=Depends(require_auth)):
    """Admin panel for a specific special page"""
    if page_key not in SPECIAL_PAGES:
        raise HTTPException(404, "Seite nicht gefunden")

    page_info = SPECIAL_PAGES[page_key]
    context = {
        "page_key": page_key,
        "page_info": page_info,
        "all_special_pages": SPECIAL_PAGES,
    }
    return templates.TemplateResponse(request=request, name="admin_special_page.html", context=context)
