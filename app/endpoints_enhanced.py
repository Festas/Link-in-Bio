"""
Enhanced API Endpoints for New Features
Provides REST API for enhanced analytics, authentication, and caching.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr

from .auth_unified import (
    require_auth,
    hash_password,
    validate_password_strength,
    create_session,
    invalidate_session,
    validate_session,
    get_active_sessions_count,
    generate_2fa_secret,
    get_2fa_qr_code_url,
    verify_2fa_code,
)
from .cache_unified import cache as cache_enhanced
from .analytics_enhanced import (
    EnhancedAnalytics,
    AnalyticsEvent,
    EventType,
    ConversionGoal,
    Funnel,
    FunnelStep,
    extract_utm_params,
)
from .database import get_db_connection

# Initialize enhanced analytics
analytics = EnhancedAnalytics(get_db_connection)

router = APIRouter()


# ===== Authentication Endpoints =====

class LoginRequest(BaseModel):
    username: str
    password: str
    totp_code: Optional[str] = None
    remember_me: bool = False


class LoginResponse(BaseModel):
    success: bool
    session_token: Optional[str] = None
    requires_2fa: bool = False
    message: Optional[str] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class Setup2FAResponse(BaseModel):
    secret: str
    qr_code_url: str


@router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest, http_request: Request, response: Response):
    """Enhanced login with session management and 2FA support."""
    from .auth_enhanced import ADMIN_USERNAME, ADMIN_PASSWORD_HASH, REQUIRE_2FA, verify_password
    import os
    
    # Validate credentials
    if request.username != ADMIN_USERNAME:
        return LoginResponse(success=False, message="Ungültige Anmeldedaten")
    
    # Check password
    password_valid = False
    if ADMIN_PASSWORD_HASH:
        password_valid = verify_password(request.password, ADMIN_PASSWORD_HASH)
    else:
        # Fallback to plain password (migration period)
        plain_password = os.getenv("ADMIN_PASSWORD", "")
        password_valid = request.password == plain_password
    
    if not password_valid:
        return LoginResponse(success=False, message="Ungültige Anmeldedaten")
    
    # Check 2FA if enabled
    if REQUIRE_2FA:
        if not request.totp_code:
            return LoginResponse(success=False, requires_2fa=True, message="2FA Code erforderlich")
        
        if not verify_2fa_code(request.username, request.totp_code):
            return LoginResponse(success=False, requires_2fa=True, message="Ungültiger 2FA Code")
    
    # Create session
    session_token = create_session(request.username, request.remember_me)
    
    # Set session cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=86400 * 7 if request.remember_me else 86400,
    )
    
    return LoginResponse(success=True, session_token=session_token, message="Erfolgreich angemeldet")


@router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout and invalidate session."""
    session_token = request.cookies.get("session_token")
    if session_token:
        invalidate_session(session_token)
    
    response.delete_cookie("session_token")
    return {"success": True, "message": "Erfolgreich abgemeldet"}


@router.post("/auth/change-password")
async def change_password(
    req: PasswordChangeRequest,
    username: str = Depends(require_auth)
):
    """Change admin password."""
    from .auth_enhanced import ADMIN_PASSWORD_HASH, verify_password
    import os
    
    # Verify current password
    if ADMIN_PASSWORD_HASH:
        if not verify_password(req.current_password, ADMIN_PASSWORD_HASH):
            raise HTTPException(400, "Aktuelles Passwort ist falsch")
    else:
        plain_password = os.getenv("ADMIN_PASSWORD", "")
        if req.current_password != plain_password:
            raise HTTPException(400, "Aktuelles Passwort ist falsch")
    
    # Validate new password strength
    is_valid, error_msg = validate_password_strength(req.new_password)
    if not is_valid:
        raise HTTPException(400, error_msg)
    
    # Hash new password
    new_hash = hash_password(req.new_password)
    
    # In production, this should update the database or secure storage
    # For now, we'll return the hash for manual update
    return {
        "success": True,
        "message": "Passwort erfolgreich geändert",
        "new_hash": new_hash,
        "instructions": "Bitte ADMIN_PASSWORD_HASH in .env auf diesen Wert setzen und Server neu starten"
    }


@router.post("/auth/setup-2fa", response_model=Setup2FAResponse)
async def setup_2fa(username: str = Depends(require_auth)):
    """Setup 2FA for user."""
    secret = generate_2fa_secret(username)
    qr_url = get_2fa_qr_code_url(username)
    
    if not qr_url:
        raise HTTPException(500, "Fehler beim Generieren der QR-Code-URL")
    
    return Setup2FAResponse(secret=secret, qr_code_url=qr_url)


@router.post("/auth/verify-2fa")
async def verify_2fa(code: str, username: str = Depends(require_auth)):
    """Verify 2FA code."""
    is_valid = verify_2fa_code(username, code)
    return {"success": is_valid, "message": "Code ist gültig" if is_valid else "Code ist ungültig"}


@router.get("/auth/sessions")
async def get_sessions(username: str = Depends(require_auth)):
    """Get active sessions count."""
    count = get_active_sessions_count()
    return {"active_sessions": count}


# ===== Cache Management Endpoints =====

@router.get("/cache/stats")
async def get_cache_stats(username: str = Depends(require_auth)):
    """Get cache statistics."""
    stats = cache_enhanced.get_stats()
    return stats


@router.delete("/cache/clear")
async def clear_cache(username: str = Depends(require_auth)):
    """Clear all cache entries."""
    cache_enhanced.clear()
    return {"success": True, "message": "Cache erfolgreich geleert"}


@router.delete("/cache/invalidate/{pattern}")
async def invalidate_cache(pattern: str, username: str = Depends(require_auth)):
    """Invalidate cache entries matching pattern."""
    count = cache_enhanced.invalidate(pattern)
    return {"success": True, "invalidated": count}


# ===== Enhanced Analytics Endpoints =====

class TrackEventRequest(BaseModel):
    event_type: EventType
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    page_id: Optional[int] = None
    item_id: Optional[int] = None
    url: Optional[str] = None
    referer: Optional[str] = None
    country_code: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    properties: dict = {}
    conversion_goal_id: Optional[str] = None
    conversion_value: Optional[float] = None


@router.post("/analytics/track")
async def track_event(req: TrackEventRequest, request: Request):
    """Track an analytics event."""
    # Extract UTM parameters if URL is provided
    utm_params = {}
    if req.url:
        utm_params = extract_utm_params(req.url)
    
    # Auto-detect some fields if not provided
    if not req.referer:
        req.referer = request.headers.get("referer")
    
    if not req.device_type or not req.browser:
        user_agent = request.headers.get("user-agent", "")
        if "Mobile" in user_agent:
            req.device_type = "mobile"
        elif "Tablet" in user_agent:
            req.device_type = "tablet"
        else:
            req.device_type = "desktop"
    
    # Create event
    event = AnalyticsEvent(
        event_type=req.event_type,
        timestamp=datetime.utcnow(),
        session_id=req.session_id,
        user_id=req.user_id,
        page_id=req.page_id,
        item_id=req.item_id,
        url=req.url,
        referer=req.referer,
        country_code=req.country_code,
        device_type=req.device_type,
        browser=req.browser,
        utm_source=utm_params.get("utm_source"),
        utm_medium=utm_params.get("utm_medium"),
        utm_campaign=utm_params.get("utm_campaign"),
        utm_content=utm_params.get("utm_content"),
        utm_term=utm_params.get("utm_term"),
        properties=req.properties,
        conversion_goal_id=req.conversion_goal_id,
        conversion_value=req.conversion_value,
    )
    
    success = analytics.track_event(event)
    return {"success": success}


@router.get("/analytics/conversion-rate")
async def get_conversion_rate(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    conversion_goal_id: Optional[str] = None,
    username: str = Depends(require_auth)
):
    """Get conversion rate statistics."""
    start = datetime.fromisoformat(start_date) if start_date else None
    end = datetime.fromisoformat(end_date) if end_date else None
    
    stats = analytics.get_conversion_rate(start, end, conversion_goal_id)
    return stats


@router.get("/analytics/funnel/{funnel_id}")
async def get_funnel(
    funnel_id: str,
    days: int = 30,
    username: str = Depends(require_auth)
):
    """Get funnel analytics."""
    stats = analytics.get_funnel_analytics(funnel_id, days)
    return stats


@router.get("/analytics/utm-performance")
async def get_utm_performance(
    days: int = 30,
    username: str = Depends(require_auth)
):
    """Get UTM campaign performance."""
    stats = analytics.get_utm_performance(days)
    return stats


@router.get("/analytics/realtime")
async def get_realtime(
    minutes: int = 30,
    username: str = Depends(require_auth)
):
    """Get real-time analytics."""
    stats = analytics.get_realtime_stats(minutes)
    return stats


class ConversionGoalRequest(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    event_type: EventType
    value: Optional[float] = None
    url_pattern: Optional[str] = None


@router.post("/analytics/conversion-goals")
async def create_goal(
    req: ConversionGoalRequest,
    username: str = Depends(require_auth)
):
    """Create a conversion goal."""
    goal = ConversionGoal(**req.dict())
    success = analytics.create_conversion_goal(goal)
    return {"success": success}


# ===== Health & Monitoring Endpoints =====

@router.get("/system/health")
async def system_health():
    """Get system health status."""
    try:
        # Check database
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    # Check cache
    try:
        cache_stats = cache_enhanced.get_stats()
        cache_status = "healthy"
    except Exception as e:
        cache_status = f"unhealthy: {str(e)}"
        cache_stats = {}
    
    return {
        "status": "healthy" if db_status == "healthy" and cache_status == "healthy" else "degraded",
        "database": db_status,
        "cache": cache_status,
        "cache_stats": cache_stats,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/system/metrics")
async def system_metrics(username: str = Depends(require_auth)):
    """Get system metrics."""
    import psutil
    import sys
    
    # Get process info
    process = psutil.Process()
    
    return {
        "cpu_percent": process.cpu_percent(interval=0.1),
        "memory_mb": process.memory_info().rss / 1024 / 1024,
        "memory_percent": process.memory_percent(),
        "threads": process.num_threads(),
        "connections": len(process.connections()),
        "python_version": sys.version,
        "uptime_seconds": (datetime.utcnow() - datetime.fromtimestamp(process.create_time())).total_seconds(),
    }
