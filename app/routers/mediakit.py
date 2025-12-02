"""
Media Kit Router

Handles API endpoints for media kit management including:
- Media kit data management
- Social stats integration
- Access control
- Block-based content
- Analytics and views tracking
"""

import json
import re
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse

from ..auth_unified import require_auth
from ..rate_limit import limiter_strict, limiter_standard
from ..services import get_country_from_ip
from ..social_stats import get_stats_service
from ..database import (
    get_settings_from_db,
    get_mediakit_data,
    update_mediakit_data,
    delete_mediakit_entry,
    save_social_stats_cache,
    get_social_stats_cache,
    get_mediakit_setting,
    update_mediakit_setting,
    get_all_mediakit_settings,
    track_mediakit_view,
    get_mediakit_views,
    get_mediakit_views_stats,
    create_access_request,
    get_access_requests,
    update_access_request_status,
    get_mediakit_blocks,
    create_mediakit_block,
    update_mediakit_block,
    delete_mediakit_block,
    reorder_mediakit_blocks,
    check_access_approved,
)

router = APIRouter(prefix="/mediakit", tags=["Media Kit"])
logger = logging.getLogger(__name__)


# --- Media Kit Data Endpoints ---
# Note: These use "-data" suffix (e.g., GET /api/mediakit-data) to maintain
# backward compatibility with the original API paths from endpoints.py.
# The router prefix is "/mediakit" so "-data" creates "/mediakit-data".


@router.get("-data", dependencies=[Depends(require_auth)])
async def get_mediakit_admin_data():
    """Get all media kit data for admin panel."""
    data = get_mediakit_data()
    return {"data": data}


@router.put("-data", dependencies=[Depends(require_auth)])
async def update_mediakit_admin_data(request: Request):
    """Update media kit data."""
    data = await request.json()
    section = data.get("section", "")
    key = data.get("key", "")
    value = data.get("value", "")
    display_order = data.get("display_order", 0)

    if not section or not key:
        raise HTTPException(400, "Section und Key sind erforderlich")

    update_mediakit_data(section, key, value, display_order)
    return {"message": "Media Kit Daten aktualisiert"}


@router.post("-data/batch", dependencies=[Depends(require_auth)])
async def update_mediakit_batch(request: Request):
    """Batch update media kit data."""
    data = await request.json()
    updates = data.get("updates", [])

    if not updates:
        raise HTTPException(400, "Keine Updates bereitgestellt")

    for update in updates:
        section = update.get("section", "")
        key = update.get("key", "")
        value = update.get("value", "")
        display_order = update.get("display_order", 0)

        if section and key:
            update_mediakit_data(section, key, value, display_order)

    return {"message": "Alle Media Kit Daten aktualisiert"}


@router.delete("-data", dependencies=[Depends(require_auth)])
async def delete_mediakit_admin_data(request: Request):
    """Delete media kit entry."""
    data = await request.json()
    section = data.get("section", "")
    key = data.get("key", "")

    if not section or not key:
        raise HTTPException(400, "Section und Key sind erforderlich")

    delete_mediakit_entry(section, key)
    return {"message": "Eintrag gelöscht"}


# --- Social Stats Endpoints ---


@router.post("/refresh-social-stats", dependencies=[Depends(require_auth)])
async def refresh_social_stats(request: Request):
    """Fetch fresh social media statistics from Profile tab handles and update cache."""
    settings = get_settings_from_db()

    config = {
        "instagram_handle": settings.get("social_instagram", ""),
        "tiktok_handle": settings.get("social_tiktok", ""),
        "youtube_handle": settings.get("social_youtube", ""),
        "twitch_handle": settings.get("social_twitch", ""),
        "x_handle": settings.get("social_x", ""),
    }

    config = {k: v for k, v in config.items() if v}

    if not config:
        raise HTTPException(
            400,
            "Keine Social Media Handles konfiguriert. Bitte zuerst im Profil-Tab Social Media Handles eingeben und speichern.",
        )

    stats_service = get_stats_service()
    results = await stats_service.fetch_all_stats(config)

    if not results.get("platforms"):
        error_msg = "Konnte keine Daten abrufen. "
        if results.get("errors"):
            error_msg += " Mögliche Gründe: " + ", ".join(results["errors"][:2])
        raise HTTPException(500, error_msg)

    for platform, stats in results.get("platforms", {}).items():
        save_social_stats_cache(platform, stats["username"], json.dumps(stats))

    if "instagram" in results["platforms"]:
        ig_stats = results["platforms"]["instagram"]
        followers = stats_service.format_number(ig_stats.get("followers", 0))
        update_mediakit_data("platforms", "instagram_followers", followers, 1)
        update_mediakit_data("platforms", "instagram_handle", f"@{ig_stats['username']}", 1)

    if "tiktok" in results["platforms"]:
        tt_stats = results["platforms"]["tiktok"]
        followers = stats_service.format_number(tt_stats.get("followers", 0))
        update_mediakit_data("platforms", "tiktok_followers", followers, 2)
        update_mediakit_data("platforms", "tiktok_handle", f"@{tt_stats['username']}", 2)

    total = stats_service.format_number(results.get("total_followers", 0))
    update_mediakit_data("analytics", "total_followers", total, 0)
    update_mediakit_data("analytics", "last_updated", datetime.now().strftime("%d.%m.%Y"), 99)

    return {
        "message": "Social Media Statistiken erfolgreich aktualisiert",
        "data": results,
        "total_followers": total,
        "total_followers_raw": results.get("total_followers", 0),
        "platforms_updated": list(results.get("platforms", {}).keys()),
    }


@router.get("/social-stats-cache")
async def get_cached_social_stats():
    """Get cached social media statistics (public endpoint for frontend)."""
    cache = get_social_stats_cache()
    return {"data": cache}


@router.get("/follower-summary")
async def get_follower_summary():
    """Get follower summary for platforms with 1000+ followers (public endpoint)."""
    cache = get_social_stats_cache()
    stats_service = get_stats_service()

    qualified_platforms = []
    total_qualified_followers = 0

    for platform, data in cache.items():
        stats = data.get("data", {})
        followers = stats.get("followers", 0)

        if followers >= 1000:
            qualified_platforms.append(
                {
                    "platform": platform,
                    "username": data.get("username", ""),
                    "followers": followers,
                    "followers_formatted": stats_service.format_number(followers),
                    "verified": stats.get("verified", False),
                    "fetched_at": data.get("fetched_at", ""),
                }
            )
            total_qualified_followers += followers

    return {
        "total_followers": total_qualified_followers,
        "total_followers_formatted": stats_service.format_number(total_qualified_followers),
        "platforms": qualified_platforms,
        "platform_count": len(qualified_platforms),
    }


@router.get("/analytics/{platform}")
async def get_platform_analytics(platform: str):
    """Get detailed analytics for a specific platform (public endpoint)."""
    cache = get_social_stats_cache(platform)

    if not cache:
        raise HTTPException(404, f"Keine Daten für Plattform '{platform}' gefunden")

    if platform not in cache:
        raise HTTPException(404, f"Keine Daten für Plattform '{platform}' gefunden")

    data = cache[platform]
    stats = data.get("data", {})

    analytics = {
        "platform": platform,
        "username": data.get("username", ""),
        "fetched_at": data.get("fetched_at", ""),
        "metrics": {},
    }

    if "followers" in stats:
        analytics["metrics"]["followers"] = stats["followers"]
    if "following" in stats:
        analytics["metrics"]["following"] = stats["following"]

    if platform == "instagram":
        analytics["metrics"]["posts"] = stats.get("posts", 0)
        analytics["metrics"]["engagement_rate"] = stats.get("engagement_rate")
        analytics["metrics"]["verified"] = stats.get("verified", False)
    elif platform == "tiktok":
        analytics["metrics"]["likes"] = stats.get("likes", 0)
        analytics["metrics"]["videos"] = stats.get("videos", 0)
    elif platform == "youtube":
        analytics["metrics"]["subscribers"] = stats.get("subscribers", 0)
        analytics["metrics"]["videos"] = stats.get("videos", 0)
        analytics["metrics"]["views"] = stats.get("views", 0)

    return analytics


# --- API Integration Endpoints ---


@router.post("/refresh-instagram-api", dependencies=[Depends(require_auth)])
async def refresh_instagram_api_stats():
    """Fetch fresh Instagram statistics using Meta Graph API."""
    from dotenv import load_dotenv
    from ..instagram_fetcher import get_instagram_fetcher_from_env

    social_env_path = Path(__file__).parent.parent.parent / ".env.social"
    if social_env_path.exists():
        load_dotenv(social_env_path)
    else:
        raise HTTPException(400, "Keine .env.social Datei gefunden. Bitte Instagram API Credentials konfigurieren.")

    fetcher = get_instagram_fetcher_from_env()
    if not fetcher:
        raise HTTPException(
            400, "Instagram API nicht konfiguriert. Prüfe INSTAGRAM_ACCESS_TOKEN und INSTAGRAM_USERNAME in .env.social"
        )

    try:
        stats, new_token = await fetcher.fetch_and_refresh_token()

        if not stats:
            raise HTTPException(500, "Konnte Instagram Daten nicht abrufen")

        save_social_stats_cache(
            platform="instagram", username=stats["profile"]["username"], stats_data=json.dumps(stats)
        )

        stats_service = get_stats_service()
        followers = stats_service.format_number(stats["stats"]["followers"])
        update_mediakit_data("platforms", "instagram_followers", followers, 1)
        update_mediakit_data("platforms", "instagram_handle", f"@{stats['profile']['username']}", 1)
        update_mediakit_data("analytics", "last_updated", datetime.now().strftime("%d.%m.%Y"), 99)

        response_data = {
            "message": "Instagram Statistiken erfolgreich über API aktualisiert",
            "data": {
                "username": stats["profile"]["username"],
                "followers": stats["stats"]["followers"],
                "followers_formatted": followers,
                "posts": stats["stats"]["posts"],
                "reach_daily": stats["stats"]["reach_daily"],
                "impressions_daily": stats["stats"]["impressions_daily"],
                "profile_views": stats["stats"]["profile_views"],
            },
            "source": "Meta Graph API",
            "updated_at": stats["meta"]["updated_at"],
        }

        if new_token:
            response_data["token_refreshed"] = True
            response_data["warning"] = (
                "Access Token wurde erneuert. Bitte GitHub Secret 'INSTAGRAM_SECRET' aktualisieren!"
            )

        return response_data

    except Exception as e:
        logger.error(f"Error fetching Instagram API stats: {e}")
        raise HTTPException(500, f"Fehler beim Abrufen der Instagram Daten: {str(e)}")


@router.post("/refresh-tiktok-api", dependencies=[Depends(require_auth)])
async def refresh_tiktok_api_stats():
    """Fetch fresh TikTok statistics using TikTok Official API."""
    from dotenv import load_dotenv
    from ..tiktok_fetcher import get_tiktok_fetcher_from_env

    social_env_path = Path(__file__).parent.parent.parent / ".env.social"
    if social_env_path.exists():
        load_dotenv(social_env_path)
    else:
        raise HTTPException(400, "Keine .env.social Datei gefunden. Bitte TikTok API Credentials konfigurieren.")

    fetcher = get_tiktok_fetcher_from_env()
    if not fetcher:
        raise HTTPException(
            400, "TikTok API nicht konfiguriert. Prüfe TIKTOK_ACCESS_TOKEN und TIKTOK_REFRESH_TOKEN in .env.social"
        )

    try:
        stats, new_tokens = await fetcher.fetch_and_refresh_token()

        if not stats:
            raise HTTPException(500, "Konnte TikTok Daten nicht abrufen")

        save_social_stats_cache(platform="tiktok", username=stats["profile"]["username"], stats_data=json.dumps(stats))

        stats_service = get_stats_service()
        followers = stats_service.format_number(stats["stats"]["followers"])
        update_mediakit_data("platforms", "tiktok_followers", followers, 2)
        update_mediakit_data("platforms", "tiktok_handle", f"@{stats['profile']['username']}", 2)
        update_mediakit_data("analytics", "last_updated", datetime.now().strftime("%d.%m.%Y"), 99)

        response_data = {
            "message": "TikTok Statistiken erfolgreich über API aktualisiert",
            "data": {
                "username": stats["profile"]["username"],
                "followers": stats["stats"]["followers"],
                "followers_formatted": followers,
                "likes": stats["stats"]["likes"],
                "videos": stats["stats"]["videos"],
            },
            "source": "TikTok Official API",
            "updated_at": stats["meta"]["updated_at"],
        }

        if new_tokens:
            response_data["token_refreshed"] = True
            response_data["warning"] = "Access Token wurde erneuert. Bitte GitHub Secret 'TIKTOK_SECRET' aktualisieren!"

        return response_data

    except Exception as e:
        logger.error(f"Error fetching TikTok API stats: {e}")
        raise HTTPException(500, f"Fehler beim Abrufen der TikTok Daten: {str(e)}")


# --- Settings Endpoints ---


@router.get("/settings", dependencies=[Depends(require_auth)])
async def get_mediakit_settings_endpoint():
    """Get all media kit settings."""
    settings = get_all_mediakit_settings()
    return {"settings": settings}


@router.put("/settings", dependencies=[Depends(require_auth)])
async def update_mediakit_settings_endpoint(request: Request):
    """Update media kit settings."""
    data = await request.json()

    for key, value in data.items():
        update_mediakit_setting(key, str(value) if value is not None else "")

    return {"message": "Media Kit Einstellungen aktualisiert"}


# --- Views Tracking Endpoints ---


@router.post("/track-view", dependencies=[Depends(limiter_standard)])
async def track_mediakit_view_endpoint(request: Request):
    """Track a media kit view (public endpoint)."""
    data = await request.json()

    viewer_email = data.get("email")
    viewer_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    viewer_country = None
    if viewer_ip:
        viewer_country = await get_country_from_ip(viewer_ip)

    track_mediakit_view(
        viewer_email=viewer_email, viewer_ip=viewer_ip, viewer_country=viewer_country, user_agent=user_agent
    )

    return {"message": "View tracked successfully"}


@router.get("/views", dependencies=[Depends(require_auth)])
async def get_mediakit_views_endpoint(limit: int = 100):
    """Get recent media kit views."""
    views = get_mediakit_views(limit)
    return {"views": views}


@router.get("/views/stats", dependencies=[Depends(require_auth)])
async def get_mediakit_views_stats_endpoint():
    """Get media kit views statistics."""
    stats = get_mediakit_views_stats()
    return stats


# --- Access Request Endpoints ---


@router.post("/request-access", dependencies=[Depends(limiter_strict)])
async def request_mediakit_access(request: Request):
    """Request access to view media kit (for gated access)."""
    data = await request.json()

    email = data.get("email", "").strip()
    name = data.get("name", "").strip()
    company = data.get("company", "").strip()
    message = data.get("message", "").strip()

    if not email:
        raise HTTPException(400, "Email ist erforderlich")

    email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if not re.match(email_pattern, email):
        raise HTTPException(400, "Ungültige E-Mail-Adresse")

    ip_address = request.client.host if request.client else None

    request_id = create_access_request(email=email, name=name, company=company, message=message, ip_address=ip_address)

    return {
        "message": "Zugriffsanfrage wurde gesendet. Sie erhalten eine E-Mail, sobald Ihre Anfrage genehmigt wurde.",
        "request_id": request_id,
    }


@router.get("/access-requests", dependencies=[Depends(require_auth)])
async def get_access_requests_endpoint(status: Optional[str] = None):
    """Get access requests."""
    requests = get_access_requests(status)
    return {"requests": requests}


@router.put("/access-requests/{request_id}", dependencies=[Depends(require_auth)])
async def update_access_request_endpoint(request_id: int, request: Request):
    """Update access request status."""
    data = await request.json()
    status = data.get("status", "").strip()

    if status not in ["approved", "rejected", "pending"]:
        raise HTTPException(400, "Ungültiger Status")

    update_access_request_status(request_id, status)

    return {"message": f"Zugriffsanfrage wurde {status}"}


@router.get("/check-access")
async def check_mediakit_access(email: str):
    """Check if an email has approved access."""
    has_access = check_access_approved(email)
    return {"has_access": has_access}


# --- PDF Export Endpoint ---


@router.get("/export/pdf", dependencies=[Depends(require_auth)])
async def export_mediakit_pdf():
    """Export media kit as PDF."""
    try:
        raise HTTPException(
            501,
            "PDF Export wird in Kürze verfügbar sein. Bitte verwenden Sie vorerst die Browser-Druckfunktion (Strg+P).",
        )
    except Exception as e:
        logger.error(f"Error exporting PDF: {e}")
        raise HTTPException(500, "Fehler beim Exportieren des PDFs")


# --- Block-based Content Endpoints ---


@router.get("/blocks", dependencies=[Depends(require_auth)])
async def get_all_mediakit_blocks():
    """Get all media kit blocks for admin."""
    try:
        blocks = get_mediakit_blocks()
        return {"blocks": blocks}
    except Exception as e:
        logger.error(f"Error getting media kit blocks: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})


@router.post("/blocks", dependencies=[Depends(require_auth)])
async def create_new_mediakit_block(request: Request):
    """Create a new media kit block."""
    try:
        data = await request.json()
        block_type = data.get("block_type")
        title = data.get("title")
        content = data.get("content")
        settings = data.get("settings", {})
        position = data.get("position")

        if not block_type:
            return JSONResponse(status_code=400, content={"detail": "block_type is required"})

        block_id = create_mediakit_block(block_type, title, content, settings, position)
        return {"success": True, "block_id": block_id}
    except Exception as e:
        logger.error(f"Error creating media kit block: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})


@router.put("/blocks/{block_id}", dependencies=[Depends(require_auth)])
async def update_existing_mediakit_block(block_id: int, request: Request):
    """Update a media kit block."""
    try:
        data = await request.json()
        title = data.get("title")
        content = data.get("content")
        settings = data.get("settings")
        is_visible = data.get("is_visible")

        update_mediakit_block(block_id, title, content, settings, is_visible)
        return {"success": True}
    except Exception as e:
        logger.error(f"Error updating media kit block: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})


@router.delete("/blocks/{block_id}", dependencies=[Depends(require_auth)])
async def delete_existing_mediakit_block(block_id: int):
    """Delete a media kit block."""
    try:
        delete_mediakit_block(block_id)
        return {"success": True}
    except Exception as e:
        logger.error(f"Error deleting media kit block: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})


@router.post("/blocks/reorder", dependencies=[Depends(require_auth)])
async def reorder_blocks(request: Request):
    """Reorder media kit blocks."""
    try:
        data = await request.json()
        block_positions = data.get("blocks", [])
        reorder_mediakit_blocks(block_positions)
        return {"success": True}
    except Exception as e:
        logger.error(f"Error reordering media kit blocks: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})
