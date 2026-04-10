"""
CSRF Protection Middleware
Generates CSRF tokens and validates them on state-changing requests.
"""

import secrets
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

EXEMPT_PATHS = {
    "/api/auth/login",
    "/api/auth/check",
    "/api/click/",
    "/api/pageview",
    "/api/subscribe",
    "/api/contact",
    "/api/reactions/",
}

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def _is_exempt(path: str) -> bool:
    for exempt in EXEMPT_PATHS:
        if path == exempt or path.startswith(exempt):
            return True
    return False


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Generate CSRF token cookie on GET requests if not present
        if request.method == "GET":
            response = await call_next(request)
            if "csrf_token" not in request.cookies:
                token = secrets.token_urlsafe(32)
                response.set_cookie(
                    key="csrf_token",
                    value=token,
                    httponly=False,
                    secure=request.url.scheme == "https",
                    samesite="lax",
                    path="/",
                )
            return response

        # For non-safe methods to /api/ endpoints, validate CSRF
        if request.method not in SAFE_METHODS and request.url.path.startswith("/api/"):
            if not _is_exempt(request.url.path):
                cookie_token = request.cookies.get("csrf_token")
                header_token = request.headers.get("X-CSRF-Token")
                if not cookie_token or not header_token or cookie_token != header_token:
                    from fastapi.responses import JSONResponse
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "CSRF token missing or invalid"},
                    )

        return await call_next(request)
