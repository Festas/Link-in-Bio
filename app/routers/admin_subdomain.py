"""
Admin Subdomain Router
Handles all internal routes for the admin subdomain.

These routes are accessed via path rewriting:
- admin.domain.com/ -> /__admin__/dashboard
- admin.domain.com/login -> /__admin__/login
- admin.domain.com/analytics -> /__admin__/analytics
- admin.domain.com/mediakit -> /__admin__/mediakit
- admin.domain.com/status -> /__admin__/status
- etc.

All routes require authentication except /login and /status.
"""

import os
from pathlib import Path
from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from app.config import templates, BASE_DIR
from app.auth_unified import require_auth
from app.subdomain_middleware import ADMIN_PATH_MAPPINGS

router = APIRouter(prefix="/__admin__")

# Get main domain for public page links
APP_DOMAIN = os.getenv("APP_DOMAIN", "127.0.0.1")

# Path to the built React admin SPA
ADMIN_SPA_DIR = BASE_DIR / "static" / "admin"


def get_main_domain_url() -> str:
    """Get the main domain URL for public page links."""
    if APP_DOMAIN == "127.0.0.1":
        return f"http://{APP_DOMAIN}"
    return f"https://{APP_DOMAIN}"


@router.get("/editor", response_class=HTMLResponse)
async def admin_subdomain_editor(request: Request, user=Depends(require_auth)):
    """New React-based visual editor — the modern admin experience."""
    spa_index = ADMIN_SPA_DIR / "index.html"
    if spa_index.exists():
        return FileResponse(spa_index, media_type="text/html")
    # Fallback to legacy admin if SPA not built
    return templates.TemplateResponse(request=request, name="admin.html")


@router.get("/dashboard", response_class=HTMLResponse)
async def admin_subdomain_dashboard(request: Request, user=Depends(require_auth)):
    """Main admin dashboard - redirects to new editor if available, falls back to legacy."""
    spa_index = ADMIN_SPA_DIR / "index.html"
    if spa_index.exists():
        return FileResponse(spa_index, media_type="text/html")
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
    """Media Kit admin - standalone admin panel with social stats, access control, and analytics."""
    context = {
        "main_domain_url": get_main_domain_url(),
    }
    return templates.TemplateResponse(request=request, name="admin_mediakit.html", context=context)


@router.get("/impressum", response_class=HTMLResponse)
async def admin_subdomain_impressum(request: Request, user=Depends(require_auth)):
    """Impressum admin - standalone admin panel with legal information form and preview."""
    context = {
        "main_domain_url": get_main_domain_url(),
    }
    return templates.TemplateResponse(request=request, name="admin_impressum.html", context=context)


@router.get("/datenschutz", response_class=HTMLResponse)
async def admin_subdomain_datenschutz(request: Request, user=Depends(require_auth)):
    """Datenschutz admin - standalone admin panel with GDPR settings and privacy policy editor."""
    context = {
        "main_domain_url": get_main_domain_url(),
    }
    return templates.TemplateResponse(request=request, name="admin_datenschutz.html", context=context)


@router.get("/ueber-mich", response_class=HTMLResponse)
async def admin_subdomain_ueber_mich(request: Request, user=Depends(require_auth)):
    """Über mich admin - standalone admin panel with bio, profile, and timeline settings."""
    context = {
        "main_domain_url": get_main_domain_url(),
    }
    return templates.TemplateResponse(request=request, name="admin_ueber_mich.html", context=context)


@router.get("/kontakt", response_class=HTMLResponse)
async def admin_subdomain_kontakt(request: Request, user=Depends(require_auth)):
    """Kontakt admin - standalone admin panel with contact form and email settings."""
    context = {
        "main_domain_url": get_main_domain_url(),
    }
    return templates.TemplateResponse(request=request, name="admin_kontakt.html", context=context)


@router.get("/status", response_class=JSONResponse)
async def admin_subdomain_status(request: Request):
    """
    Admin subdomain status endpoint - accessible without authentication.
    Used to verify that the admin subdomain is correctly configured and reachable.
    Access via: https://admin.festas-builds.com/status
    """
    host = request.headers.get("host", "unknown")
    subdomain = request.scope.get("subdomain", "none")
    is_admin = request.scope.get("is_admin_subdomain", False)

    # Get available routes from the middleware mappings to avoid duplication
    available_routes = list(ADMIN_PATH_MAPPINGS.keys()) if is_admin else []

    return JSONResponse(
        {
            "status": "ok",
            "subdomain_detected": subdomain,
            "is_admin_subdomain": is_admin,
            "host": host,
            "message": "Admin subdomain is correctly configured!" if is_admin else "Not accessed via admin subdomain",
            "available_routes": available_routes,
            "main_domain": get_main_domain_url(),
        }
    )
