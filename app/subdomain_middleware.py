"""
Subdomain Detection Middleware
Detects admin subdomain and rewrites request paths accordingly.
Routes admin.domain.com/X to /__admin__/X internally.
"""

import os
from fastapi import Request
from typing import Optional
from starlette.datastructures import URL, Headers
from starlette.types import ASGIApp, Receive, Scope, Send
from .logging_config import get_logger

logger = get_logger(__name__)

# Get the main domain from environment
APP_DOMAIN = os.getenv("APP_DOMAIN", "127.0.0.1")


def get_subdomain(host: str) -> Optional[str]:
    """
    Extract subdomain from host.
    Examples:
        - admin.festas-builds.com -> admin
        - festas-builds.com -> None
        - www.festas-builds.com -> www
        - localhost:8000 -> None
        - admin.localhost:8000 -> admin
    """
    if not host:
        return None

    # Remove port if present
    host_without_port = host.split(":")[0]

    # Handle localhost and IP addresses
    if host_without_port == "localhost":
        return None

    # Check if it's an IP address using ipaddress module
    try:
        import ipaddress

        ipaddress.ip_address(host_without_port)
        return None  # It's a valid IP address, no subdomain
    except ValueError:
        pass  # Not an IP address, continue processing

    # Check for subdomain
    parts = host_without_port.split(".")

    # Need at least 3 parts for a subdomain (sub.domain.tld)
    # Or handle special cases like admin.localhost
    if len(parts) >= 3:
        subdomain = parts[0]
        # www is not a functional subdomain for our purposes
        if subdomain != "www":
            return subdomain
    elif len(parts) == 2 and parts[1] == "localhost":
        # Handle admin.localhost
        return parts[0]

    return None


def is_admin_subdomain(host: str) -> bool:
    """Check if the request is coming from the admin subdomain."""
    subdomain = get_subdomain(host)
    return subdomain == "admin"


# Admin subdomain path mappings
# When accessing admin subdomain, these paths map to internal routes
ADMIN_PATH_MAPPINGS = {
    "/": "/__admin__/dashboard",
    "/login": "/__admin__/login",
    "/analytics": "/__admin__/analytics",
    "/mediakit": "/__admin__/mediakit",
    "/impressum": "/__admin__/impressum",
    "/datenschutz": "/__admin__/datenschutz",
    "/ueber-mich": "/__admin__/ueber-mich",
    "/kontakt": "/__admin__/kontakt",
    "/status": "/__admin__/status",
}


class SubdomainMiddleware:
    """
    ASGI middleware to detect and handle subdomain routing.
    Rewrites paths for admin subdomain requests to internal routes.
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Get host from headers
        headers = Headers(scope=scope)
        host = headers.get("host", "")

        # Check for admin subdomain
        subdomain = get_subdomain(host)
        is_admin = subdomain == "admin"

        # Store subdomain info in scope for later use
        scope["subdomain"] = subdomain
        scope["is_admin_subdomain"] = is_admin

        # Rewrite path if admin subdomain
        if is_admin:
            path = scope.get("path", "/")

            # Check if path matches admin mappings
            if path in ADMIN_PATH_MAPPINGS:
                new_path = ADMIN_PATH_MAPPINGS[path]
                logger.debug(f"Admin subdomain: Rewriting {path} -> {new_path}")
                scope = dict(scope)
                scope["path"] = new_path

        await self.app(scope, receive, send)


async def subdomain_middleware(request: Request, call_next):
    """
    HTTP middleware wrapper for subdomain detection.
    Sets request.state.subdomain and request.state.is_admin_subdomain.
    """
    host = request.headers.get("host", "")

    # Extract subdomain info from scope (set by ASGI middleware) or calculate
    subdomain = request.scope.get("subdomain") or get_subdomain(host)
    is_admin = request.scope.get("is_admin_subdomain") or (subdomain == "admin")

    # Set state for use in routes
    request.state.subdomain = subdomain
    request.state.is_admin_subdomain = is_admin

    response = await call_next(request)
    return response
