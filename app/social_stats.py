"""
Social Media Statistics Service

DEPRECATION NOTICE:
-------------------
The web scraping methods in this module (fetch_instagram_stats, fetch_tiktok_stats)
are DEPRECATED and no longer work reliably due to:

Instagram Issues:
- The `window._sharedData` pattern was deprecated by Instagram years ago
- The `edge_followed_by` regex pattern no longer works - Instagram doesn't expose
  this data in public HTML anymore
- Instagram requires authentication and serves profile data via internal GraphQL
  API which blocks unauthenticated requests

TikTok Issues:
- TikTok has heavy bot detection and CAPTCHAs
- Data is loaded via JavaScript (not in initial HTML response)
- The `__UNIVERSAL_DATA_FOR_REHYDRATION__` pattern is unreliable and fails most of the time
- Rate limiting and IP blocking

RECOMMENDED APPROACH:
--------------------
Use the official API-based fetchers instead:
- app/instagram_fetcher.py - Uses Meta Graph API with OAuth tokens
- app/tiktok_fetcher.py - Uses TikTok's official API with proper authentication

These scripts are the primary way to update stats:
- fetch_instagram_stats.py (via GitHub Actions or cron)
- fetch_tiktok_stats.py (via GitHub Actions or cron)

For API setup, see:
- docs/INSTAGRAM_INTEGRATION.md
- docs/TIKTOK_INTEGRATION.md

Required environment variables in .env.social:
- Instagram: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USERNAME, INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET
- TikTok: TIKTOK_ACCESS_TOKEN, TIKTOK_REFRESH_TOKEN, TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
"""

import asyncio
import logging
import os
import warnings
from typing import Dict, Optional, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Deprecation warning message
SCRAPING_DEPRECATION_MSG = (
    "Web scraping for social media stats is deprecated and no longer works. "
    "Please use the official API fetchers (app/instagram_fetcher.py, app/tiktok_fetcher.py) "
    "and run fetch_instagram_stats.py / fetch_tiktok_stats.py scripts instead. "
    "See docs/INSTAGRAM_INTEGRATION.md and docs/TIKTOK_INTEGRATION.md for setup."
)


class SocialMediaStatsService:
    """
    Service to fetch social media statistics from various platforms.

    DEPRECATION WARNING:
    The scraping-based methods (fetch_instagram_stats, fetch_tiktok_stats) are deprecated
    and will return None with an error. Use the official API fetchers instead:
    - app/instagram_fetcher.py for Instagram (Meta Graph API)
    - app/tiktok_fetcher.py for TikTok (TikTok Official API)

    This service now primarily provides:
    - format_number(): Utility for formatting large numbers
    - fetch_all_stats(): Deprecated wrapper that logs warnings and returns cached data
    - Integration with official API fetchers when credentials are available
    """

    def __init__(self):
        self.timeout = 30.0
        # Keep for potential future use or compatibility
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
        ]

    async def fetch_instagram_stats(self, username: str) -> Optional[Dict[str, Any]]:
        """
        DEPRECATED: Web scraping for Instagram no longer works.

        This method previously attempted to scrape Instagram profile pages using
        regex patterns to extract follower counts. This approach has been broken
        since Instagram deprecated the window._sharedData pattern and moved to
        a JavaScript-rendered architecture with authentication requirements.

        Use instead:
        - app/instagram_fetcher.py with Meta Graph API
        - Run fetch_instagram_stats.py for automated updates

        See docs/INSTAGRAM_INTEGRATION.md for setup instructions.

        Returns:
            None - Always returns None with a deprecation warning logged.
        """
        warnings.warn(
            "fetch_instagram_stats() is deprecated. Use app/instagram_fetcher.py with Meta Graph API instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        username = username.lstrip("@")
        logger.warning(
            f"Instagram scraping for @{username} is deprecated and no longer works. "
            "Instagram requires authentication via Meta Graph API. "
            "Use fetch_instagram_stats.py script or app/instagram_fetcher.py instead. "
            "See docs/INSTAGRAM_INTEGRATION.md for setup."
        )
        return None

    async def fetch_tiktok_stats(self, username: str) -> Optional[Dict[str, Any]]:
        """
        DEPRECATED: Web scraping for TikTok no longer works.

        This method previously attempted to scrape TikTok profile pages using
        regex patterns to extract follower counts. This approach fails due to:
        - Heavy bot detection and CAPTCHAs
        - Data loaded via JavaScript (not in initial HTML)
        - Unreliable __UNIVERSAL_DATA_FOR_REHYDRATION__ pattern
        - Rate limiting and IP blocking

        Use instead:
        - app/tiktok_fetcher.py with TikTok Official API
        - Run fetch_tiktok_stats.py for automated updates

        See docs/TIKTOK_INTEGRATION.md for setup instructions.

        Returns:
            None - Always returns None with a deprecation warning logged.
        """
        warnings.warn(
            "fetch_tiktok_stats() is deprecated. Use app/tiktok_fetcher.py with TikTok Official API instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        username = username.lstrip("@")
        logger.warning(
            f"TikTok scraping for @{username} is deprecated and no longer works. "
            "TikTok requires authentication via TikTok Official API. "
            "Use fetch_tiktok_stats.py script or app/tiktok_fetcher.py instead. "
            "See docs/TIKTOK_INTEGRATION.md for setup."
        )
        return None

    async def fetch_youtube_stats(self, channel_id_or_handle: str) -> Optional[Dict[str, Any]]:
        """
        Fetch YouTube channel statistics.

        Note: This is not implemented. YouTube Data API v3 with an API key is required
        for reliable data fetching.

        Returns:
            None - Always returns None as YouTube API integration is not implemented.
        """
        logger.info(f"YouTube stats fetching not yet implemented for {channel_id_or_handle}")
        return None

    async def _try_fetch_from_api(self, platform: str, handle: str) -> Optional[Dict[str, Any]]:
        """
        Try to fetch stats using the official API fetchers if credentials are available.

        This method checks if API credentials are configured in environment variables
        and uses the proper API fetcher if available.

        Args:
            platform: Platform name ('instagram' or 'tiktok')
            handle: Username/handle for the platform

        Returns:
            Stats dict if successful, None otherwise
        """
        try:
            if platform == "instagram":
                # Check if Instagram API credentials are available
                if os.getenv("INSTAGRAM_ACCESS_TOKEN") and os.getenv("INSTAGRAM_USERNAME"):
                    from .instagram_fetcher import get_instagram_fetcher_from_env

                    fetcher = get_instagram_fetcher_from_env()
                    if fetcher:
                        logger.info(f"Using Instagram Graph API for @{handle}")
                        stats = await fetcher.fetch_stats()
                        return stats
                    else:
                        logger.warning("Instagram API credentials found but fetcher initialization failed")
                else:
                    logger.info(
                        "Instagram API credentials not configured. "
                        "Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USERNAME in .env.social"
                    )

            elif platform == "tiktok":
                # Check if TikTok API credentials are available
                if os.getenv("TIKTOK_ACCESS_TOKEN") and os.getenv("TIKTOK_REFRESH_TOKEN"):
                    from .tiktok_fetcher import get_tiktok_fetcher_from_env

                    fetcher = get_tiktok_fetcher_from_env()
                    if fetcher:
                        logger.info(f"Using TikTok Official API for @{handle}")
                        stats = await fetcher.fetch_stats()
                        return stats
                    else:
                        logger.warning("TikTok API credentials found but fetcher initialization failed")
                else:
                    logger.info(
                        "TikTok API credentials not configured. "
                        "Set TIKTOK_ACCESS_TOKEN and TIKTOK_REFRESH_TOKEN in .env.social"
                    )

        except ImportError as e:
            logger.error(f"Could not import {platform} fetcher: {e}")
        except Exception as e:
            logger.error(f"Error fetching {platform} stats via API: {e}")

        return None

    async def fetch_all_stats(self, config: Dict[str, str]) -> Dict[str, Any]:
        """
        Fetch stats from all configured platforms.

        DEPRECATION NOTICE:
        This method previously used web scraping which no longer works.
        It now attempts to use the official API fetchers if credentials are available.

        For reliable stats fetching, use the dedicated scripts:
        - fetch_instagram_stats.py (runs via GitHub Actions daily)
        - fetch_tiktok_stats.py (runs via GitHub Actions daily)

        Args:
            config: Dict with platform keys (instagram_handle, tiktok_handle, etc.)

        Returns:
            Dict with platform stats and total metrics. Platforms without API
            credentials will have deprecation errors logged.
        """
        results = {
            "platforms": {},
            "total_followers": 0,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "errors": [],
            "warnings": [],
        }

        tasks = []
        platforms = []
        handles = []

        # Instagram
        if config.get("instagram_handle"):
            handle = config["instagram_handle"].lstrip("@")
            tasks.append(self._try_fetch_from_api("instagram", handle))
            platforms.append("instagram")
            handles.append(handle)

        # TikTok
        if config.get("tiktok_handle"):
            handle = config["tiktok_handle"].lstrip("@")
            tasks.append(self._try_fetch_from_api("tiktok", handle))
            platforms.append("tiktok")
            handles.append(handle)

        # YouTube (not implemented)
        if config.get("youtube_handle"):
            handle = config["youtube_handle"]
            tasks.append(self.fetch_youtube_stats(handle))
            platforms.append("youtube")
            handles.append(handle)

        # Fetch all concurrently
        if tasks:
            stats_results = await asyncio.gather(*tasks, return_exceptions=True)

            for platform, handle, stats in zip(platforms, handles, stats_results):
                if isinstance(stats, Exception):
                    error_msg = f"{platform}: {str(stats)}"
                    results["errors"].append(error_msg)
                    logger.error(f"Error fetching {platform} stats: {stats}")
                elif stats:
                    results["platforms"][platform] = stats
                    # Add to total followers
                    if "followers" in stats and stats["followers"]:
                        results["total_followers"] += stats["followers"]
                else:
                    # Stats fetching failed - provide helpful error message
                    if platform in ("instagram", "tiktok"):
                        error_msg = (
                            f"{platform}: API credentials not configured or fetching failed. "
                            f"Run fetch_{platform}_stats.py or configure API credentials in .env.social. "
                            f"See docs/{platform.upper()}_INTEGRATION.md"
                        )
                        results["errors"].append(error_msg)
                        results["warnings"].append(SCRAPING_DEPRECATION_MSG)
                    else:
                        results["errors"].append(f"{platform}: Could not fetch data")

        # Add general warning if any scraping would have been attempted
        if not results["platforms"] and (config.get("instagram_handle") or config.get("tiktok_handle")):
            results["warnings"].append(SCRAPING_DEPRECATION_MSG)

        return results

    def format_number(self, num: int) -> str:
        """Format large numbers in a human-readable way (e.g., 104700 -> 104.7k)."""
        if num >= 1_000_000:
            return f"{num / 1_000_000:.1f}M"
        elif num >= 1_000:
            return f"{num / 1_000:.1f}k"
        return str(num)


# Singleton instance
_stats_service = None


def get_stats_service() -> SocialMediaStatsService:
    """Get or create the stats service singleton."""
    global _stats_service
    if _stats_service is None:
        _stats_service = SocialMediaStatsService()
    return _stats_service
