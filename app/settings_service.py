"""
Settings and Configuration Service
Centralizes all settings management with caching support.
"""

from typing import Dict, Any, Optional
from .database import get_settings_from_db, get_db_connection
from .cache_unified import cache, SETTINGS_TTL
import json
import logging

logger = logging.getLogger(__name__)


class SettingsService:
    """Service for managing application settings."""

    @staticmethod
    def get_all_settings() -> Dict[str, Any]:
        """Get all settings with caching."""
        cache_key = "settings:all"
        cached = cache.get(cache_key)
        if cached:
            return cached

        settings = get_settings_from_db()
        cache.set(cache_key, settings, ttl=SETTINGS_TTL)
        return settings

    @staticmethod
    def get_setting(key: str, default: Any = None) -> Any:
        """Get a specific setting value."""
        settings = SettingsService.get_all_settings()
        return settings.get(key, default)

    @staticmethod
    def _execute_setting_update(cursor, key: str, value: Any):
        """Helper method to execute a single setting update."""
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, value))

    @staticmethod
    def update_setting(key: str, value: Any) -> bool:
        """Update a single setting."""
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                SettingsService._execute_setting_update(cursor, key, value)
                conn.commit()

            # Invalidate cache
            cache.invalidate("settings:*")
            return True
        except Exception as e:
            logger.error(f"Failed to update setting {key}: {e}")
            return False

    @staticmethod
    def update_settings(settings_dict: Dict[str, Any]) -> bool:
        """Update multiple settings at once."""
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                for key, value in settings_dict.items():
                    SettingsService._execute_setting_update(cursor, key, value)
                conn.commit()

            # Invalidate cache
            cache.invalidate("settings:*")
            return True
        except Exception as e:
            logger.error(f"Failed to update settings: {e}")
            return False

    @staticmethod
    def get_social_media_links() -> Dict[str, str]:
        """Get all social media links."""
        settings = SettingsService.get_all_settings()
        social_platforms = ["youtube", "instagram", "tiktok", "twitch", "x", "discord", "email"]
        return {platform: settings.get(f"social_{platform}", "") for platform in social_platforms}

    @staticmethod
    def invalidate_cache():
        """Invalidate all settings cache."""
        cache.invalidate("settings:*")


# Global instance
settings_service = SettingsService()
