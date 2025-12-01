"""
Admin Subdomain Router
Handles all internal routes for the admin subdomain.

These routes are accessed via path rewriting:
- admin.domain.com/ -> /__admin__/dashboard
- admin.domain.com/login -> /__admin__/login
- admin.domain.com/analytics -> /__admin__/analytics
- admin.domain.com/mediakit -> /__admin__/mediakit
- etc.

All routes require authentication except /login.
"""

import os
from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse
from app.config import templates
from app.auth_unified import require_auth

router = APIRouter(prefix="/__admin__")

# Get main domain for public page links
APP_DOMAIN = os.getenv("APP_DOMAIN", "127.0.0.1")

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


def get_main_domain_url() -> str:
    """Get the main domain URL for public page links."""
    if APP_DOMAIN == "127.0.0.1":
        return f"http://{APP_DOMAIN}"
    return f"https://{APP_DOMAIN}"


def render_special_page_admin(request: Request, page_key: str):
    """Helper to render a special page admin template."""
    page_info = SPECIAL_PAGES[page_key]
    context = {
        "page_key": page_key,
        "page_info": page_info,
        "all_special_pages": SPECIAL_PAGES,
        "is_subdomain": True,
        "main_domain_url": get_main_domain_url(),
    }
    return templates.TemplateResponse(request=request, name="admin_special_page.html", context=context)


@router.get("/dashboard", response_class=HTMLResponse)
async def admin_subdomain_dashboard(request: Request, user=Depends(require_auth)):
    """Main admin dashboard - accessed via admin subdomain root."""
    return templates.TemplateResponse(request=request, name="admin.html")


@router.get("/login", response_class=HTMLResponse)
async def admin_subdomain_login(request: Request):
    """Login page - accessible on admin subdomain without auth."""
    return templates.TemplateResponse(request=request, name="login.html")


@router.get("/analytics", response_class=HTMLResponse)
async def admin_subdomain_analytics(request: Request, user=Depends(require_auth)):
    """Analytics page - accessed via admin subdomain."""
    return templates.TemplateResponse(request=request, name="analytics.html")


@router.get("/mediakit", response_class=HTMLResponse)
async def admin_subdomain_mediakit(request: Request, user=Depends(require_auth)):
    """Media Kit admin - accessed via admin subdomain."""
    return render_special_page_admin(request, "mediakit")


@router.get("/impressum", response_class=HTMLResponse)
async def admin_subdomain_impressum(request: Request, user=Depends(require_auth)):
    """Impressum admin - accessed via admin subdomain."""
    return render_special_page_admin(request, "impressum")


@router.get("/datenschutz", response_class=HTMLResponse)
async def admin_subdomain_datenschutz(request: Request, user=Depends(require_auth)):
    """Datenschutz admin - accessed via admin subdomain."""
    return render_special_page_admin(request, "datenschutz")


@router.get("/ueber-mich", response_class=HTMLResponse)
async def admin_subdomain_ueber_mich(request: Request, user=Depends(require_auth)):
    """Über mich admin - accessed via admin subdomain."""
    return render_special_page_admin(request, "ueber-mich")


@router.get("/kontakt", response_class=HTMLResponse)
async def admin_subdomain_kontakt(request: Request, user=Depends(require_auth)):
    """Kontakt admin - accessed via admin subdomain."""
    return render_special_page_admin(request, "kontakt")
