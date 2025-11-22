import os
import uuid
from fastapi import Request
from logging_config import get_logger

logger = get_logger(__name__)


async def add_request_id(request: Request, call_next):
    """Add unique request ID to each request for tracing."""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    # Log request
    logger.info(
        "Request started",
        extra={
            "request_id": request_id,
            "method": request.method,
            "url": str(request.url),
            "client": request.client.host if request.client else None,
        },
    )

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id

    # Log response
    logger.info(
        "Request completed",
        extra={
            "request_id": request_id,
            "status_code": response.status_code,
        },
    )

    return response


async def add_security_headers(request: Request, call_next):
    """Add comprehensive security headers to all responses."""
    response = await call_next(request)

    # Basic security headers
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Content Security Policy
    # Note: Adjusted for TailwindCSS CDN and inline styles used in templates
    csp_directives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
        "img-src 'self' data: https: http:",  # Allow external images for link previews
        "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
        "connect-src 'self' https://api.github.com",  # Adjust based on your API calls
        "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://open.spotify.com https://player.twitch.tv",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
    ]

    # In development, we can be more permissive
    is_dev = os.getenv("APP_DOMAIN", "127.0.0.1") == "127.0.0.1"
    if not is_dev:
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)
        # Enable HSTS in production
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    return response
