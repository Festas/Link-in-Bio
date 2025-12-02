"""
Routers package - contains all API route modules.
"""

from . import pages, items, media, settings, analytics, subscribers, public, tools
from . import admin_subdomain
from . import special_pages, mediakit

__all__ = [
    "pages",
    "items",
    "media",
    "settings",
    "analytics",
    "subscribers",
    "public",
    "tools",
    "admin_subdomain",
    "special_pages",
    "mediakit",
]
