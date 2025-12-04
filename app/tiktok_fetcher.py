"""
TikTok Stats Fetcher using TikTok Official API
Fetches real TikTok Business Account data and handles token refresh
"""

import os
import logging
import httpx
import asyncio
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Retry configuration
MAX_RETRIES = 3
INITIAL_BACKOFF = 1.0  # seconds
MAX_BACKOFF = 30.0  # seconds
RETRYABLE_STATUS_CODES = {408, 429, 500, 502, 503, 504}

# Token validation configuration
MIN_TOKEN_LENGTH = 20
PLACEHOLDER_TOKENS = {"your_tiktok_access_token_here", "your_token_here"}


class TikTokAPIError(Exception):
    """Custom exception for TikTok API errors"""

    def __init__(self, message: str, status_code: int = None, error_code: str = None, is_retryable: bool = False):
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code
        self.is_retryable = is_retryable


class TikTokFetcher:
    """Fetches TikTok statistics using TikTok Official API with automatic token refresh."""

    def __init__(self, access_token: str, refresh_token: str, client_key: str = None, client_secret: str = None):
        """
        Initialize TikTok fetcher.

        Args:
            access_token: TikTok access token (expires in 24 hours)
            refresh_token: TikTok refresh token (for daily refresh)
            client_key: TikTok App Client Key (for token refresh)
            client_secret: TikTok App Client Secret (for token refresh)
        """
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.client_key = client_key
        self.client_secret = client_secret
        self.base_url = "https://open.tiktokapis.com/v2"
        self.timeout = 30.0

    async def _make_request_with_retry(
        self,
        method: str,
        url: str,
        params: Dict = None,
        data: Dict = None,
        json_data: Dict = None,
        headers: Dict = None,
    ) -> httpx.Response:
        """
        Make HTTP request with exponential backoff retry for transient errors.

        Args:
            method: HTTP method (GET, POST)
            url: Request URL
            params: Query parameters
            data: Form data
            json_data: JSON body data
            headers: Request headers

        Returns:
            httpx.Response object

        Raises:
            TikTokAPIError: If all retries fail
        """
        last_exception = None
        backoff = INITIAL_BACKOFF

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    if method.upper() == "GET":
                        response = await client.get(url, params=params, headers=headers)
                    else:
                        response = await client.post(url, data=data, json=json_data, params=params, headers=headers)

                    # Check for retryable HTTP errors
                    if response.status_code in RETRYABLE_STATUS_CODES:
                        logger.warning(
                            f"Retryable HTTP error {response.status_code} on attempt {attempt}/{MAX_RETRIES}"
                        )
                        if attempt < MAX_RETRIES:
                            await asyncio.sleep(backoff)
                            backoff = min(backoff * 2, MAX_BACKOFF)
                            continue
                        raise TikTokAPIError(
                            f"HTTP {response.status_code} after {MAX_RETRIES} retries",
                            status_code=response.status_code,
                            is_retryable=True,
                        )

                    return response

            except httpx.TimeoutException as e:
                logger.warning(f"Request timeout on attempt {attempt}/{MAX_RETRIES}: {e}")
                last_exception = e
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(backoff)
                    backoff = min(backoff * 2, MAX_BACKOFF)
                    continue

            except httpx.RequestError as e:
                logger.warning(f"Request error on attempt {attempt}/{MAX_RETRIES}: {e}")
                last_exception = e
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(backoff)
                    backoff = min(backoff * 2, MAX_BACKOFF)
                    continue

        raise TikTokAPIError(
            f"Request failed after {MAX_RETRIES} retries: {last_exception}",
            is_retryable=True,
        )

    def _validate_token(self) -> bool:
        """
        Validate that the access token is present and has correct format.

        Returns:
            True if token appears valid, False otherwise
        """
        if not self.access_token:
            logger.error("❌ Access token is empty or not set")
            return False

        if len(self.access_token) < MIN_TOKEN_LENGTH:
            logger.error("❌ Access token appears too short - may be invalid")
            return False

        if self.access_token.startswith("your_") or self.access_token in PLACEHOLDER_TOKENS:
            logger.error("❌ Access token is a placeholder - please configure with real token")
            return False

        return True

    async def validate_token_with_api(self) -> Tuple[bool, str]:
        """
        Validate the access token by making a test API call.

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not self._validate_token():
            return False, "Token format validation failed"

        try:
            logger.info("🔍 Validating TikTok access token...")

            url = f"{self.base_url}/user/info/"
            params = {"fields": "display_name"}
            headers = {"Authorization": f"Bearer {self.access_token}"}

            response = await self._make_request_with_retry("GET", url, params=params, headers=headers)

            if response.status_code == 200:
                data = response.json()
                error = data.get("error", {})

                if error.get("code") == "ok":
                    user = data.get("data", {}).get("user", {})
                    display_name = user.get("display_name", "Unknown")
                    logger.info(f"✅ Token is valid. Connected to: {display_name}")
                    return True, ""
                else:
                    error_code = error.get("code", "unknown")
                    error_message = error.get("message", "Unknown error")
                    return False, f"API error ({error_code}): {error_message}"

            elif response.status_code == 401:
                return False, "Token is expired or invalid (401 Unauthorized)"
            else:
                return False, f"Unexpected status code: {response.status_code}"

        except Exception as e:
            return False, f"Token validation failed: {e}"

    async def refresh_access_token(self) -> Optional[Tuple[str, str]]:
        """
        Refresh the access token using the refresh token.
        TikTok access tokens expire after 24 hours, so this should be called daily.

        Returns:
            Tuple of (new_access_token, new_refresh_token) or None if refresh failed
        """
        if not self.client_key or not self.client_secret:
            logger.warning("Cannot refresh token: CLIENT_KEY and CLIENT_SECRET not provided")
            logger.info("💡 To enable automatic token refresh, set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET")
            return None

        if not self.refresh_token:
            logger.error("❌ Cannot refresh token: TIKTOK_REFRESH_TOKEN is not set")
            logger.info("💡 The refresh token is obtained during the initial OAuth flow")
            return None

        try:
            logger.info("🔄 Attempting to refresh TikTok access token...")

            url = "https://open.tiktokapis.com/v2/oauth/token/"

            data = {
                "client_key": self.client_key,
                "client_secret": self.client_secret,
                "grant_type": "refresh_token",
                "refresh_token": self.refresh_token,
            }

            headers = {"Content-Type": "application/x-www-form-urlencoded"}

            response = await self._make_request_with_retry("POST", url, data=data, headers=headers)

            if response.status_code != 200:
                logger.error(f"Token refresh failed with status {response.status_code}: {response.text}")
                self._log_refresh_troubleshooting(response.status_code, response.text)
                return None

            response_data = response.json()

            # Check for error in response body
            if "error" in response_data and response_data.get("error") != "":
                error = response_data.get("error", "unknown")
                error_desc = response_data.get("error_description", "No description")
                logger.error(f"Token refresh error: {error} - {error_desc}")
                self._log_refresh_troubleshooting_error(error)
                return None

            # TikTok returns new access_token and refresh_token
            new_access_token = response_data.get("access_token")
            new_refresh_token = response_data.get("refresh_token")
            expires_in = response_data.get("expires_in", 86400)  # Default: 24 hours

            if not new_access_token:
                logger.error("Token refresh response did not contain access_token")
                return None

            logger.info(
                f"✅ Token refreshed successfully. Expires in {expires_in} seconds (~{expires_in / 3600:.0f} hours)"
            )

            return (new_access_token, new_refresh_token)

        except TikTokAPIError as e:
            logger.error(f"Token refresh failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Error refreshing token: {e}")
            return None

    def _log_refresh_troubleshooting(self, status_code: int, response_text: str):
        """Log troubleshooting guidance for token refresh failures."""
        logger.info("")
        logger.info("💡 Troubleshooting token refresh failure:")

        if status_code == 401:
            logger.info("   • The refresh token may be expired (1 year lifetime)")
            logger.info("   • You need to re-authorize through the OAuth flow")
            logger.info("   • Visit TikTok Developer Portal to generate new tokens")
        elif status_code == 400:
            logger.info("   • Check that TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET are correct")
            logger.info("   • Verify the refresh_token is valid and not corrupted")
        else:
            logger.info(f"   • Unexpected error (status {status_code})")
            logger.info("   • Check TikTok API status page for outages")

    def _log_refresh_troubleshooting_error(self, error: str):
        """Log troubleshooting guidance for specific error codes."""
        logger.info("")
        logger.info("💡 Troubleshooting token refresh error:")

        if error == "invalid_grant":
            logger.info("   • The refresh token is invalid or expired")
            logger.info("   • Re-authorize through the TikTok OAuth flow")
        elif error == "invalid_client":
            logger.info("   • TIKTOK_CLIENT_KEY or TIKTOK_CLIENT_SECRET is incorrect")
            logger.info("   • Verify credentials in TikTok Developer Portal")
        elif error == "unauthorized_client":
            logger.info("   • Your app may not have the required scopes")
            logger.info("   • Check app permissions in TikTok Developer Portal")
        else:
            logger.info(f"   • Error: {error}")
            logger.info("   • Check TikTok API documentation for this error")

    async def fetch_user_info(self) -> Optional[Dict[str, Any]]:
        """
        Fetch TikTok user information.

        Returns:
            Dict with user profile info or None if failed
        """
        try:
            logger.info("📊 Fetching TikTok user info...")

            url = f"{self.base_url}/user/info/"
            params = {
                "fields": "display_name,avatar_url,follower_count,likes_count,video_count,bio_description,profile_deep_link"
            }
            headers = {"Authorization": f"Bearer {self.access_token}"}

            response = await self._make_request_with_retry("GET", url, params=params, headers=headers)

            if response.status_code == 401:
                logger.error("❌ 401 Unauthorized - Access token is expired or invalid")
                logger.info("")
                logger.info("💡 To fix this issue:")
                logger.info("   1. TikTok access tokens expire after 24 hours")
                logger.info("   2. Ensure TIKTOK_REFRESH_TOKEN is set for automatic renewal")
                logger.info("   3. Or regenerate tokens via TikTok Developer Portal")
                logger.info("   4. Update TIKTOK_SECRET in GitHub Secrets")
                return None

            if response.status_code != 200:
                logger.error(f"Failed to fetch user info: {response.status_code} - {response.text}")
                return None

            data = response.json()

            # Check for API errors
            error = data.get("error", {})
            if error and error.get("code") != "ok":
                error_code = error.get("code", "unknown")
                error_message = error.get("message", "Unknown error")
                logger.error(f"❌ TikTok API error ({error_code}): {error_message}")

                if error_code == "access_token_invalid":
                    logger.info("💡 The access token is invalid. Please refresh or regenerate.")
                elif error_code == "scope_not_authorized":
                    logger.info("💡 Missing required scope. Re-authorize with 'user.info.basic' scope.")

                return None

            logger.info("✅ Successfully fetched TikTok user info")
            return data.get("data", {}).get("user", {})

        except TikTokAPIError as e:
            logger.error(f"Error fetching TikTok user info: {e}")
            return None
        except Exception as e:
            logger.error(f"Error fetching TikTok user info: {e}")
            return None

    async def fetch_videos(self, max_count: int = 10) -> Optional[list]:
        """
        Fetch recent TikTok videos for engagement calculation.

        Args:
            max_count: Number of recent videos to fetch (max 20)

        Returns:
            List of video data or None if failed
        """
        try:
            logger.info(f"📹 Fetching last {max_count} TikTok videos...")

            url = f"{self.base_url}/video/list/"
            params = {"fields": "id,view_count,like_count,comment_count,share_count,create_time"}
            headers = {"Authorization": f"Bearer {self.access_token}", "Content-Type": "application/json"}

            payload = {"max_count": min(max_count, 20)}  # API limit is 20

            response = await self._make_request_with_retry("POST", url, params=params, headers=headers, json_data=payload)

            if response.status_code != 200:
                logger.warning(f"Failed to fetch videos: {response.status_code} - {response.text}")
                return None

            data = response.json()

            # Check for API errors
            error = data.get("error", {})
            if error and error.get("code") != "ok":
                error_code = error.get("code", "unknown")
                logger.warning(f"TikTok API error fetching videos ({error_code}): {error.get('message')}")
                return None

            videos = data.get("data", {}).get("videos", [])
            logger.info(f"✅ Successfully fetched {len(videos)} videos")
            return videos

        except Exception as e:
            logger.warning(f"Error fetching TikTok videos: {e}")
            return None

    def calculate_engagement_rate(self, videos: list) -> float:
        """
        Calculate engagement rate from recent videos.
        Engagement = (likes + comments + shares) / views * 100

        Args:
            videos: List of video data

        Returns:
            Engagement rate as percentage
        """
        if not videos:
            return 0.0

        total_engagements = 0
        total_views = 0

        for video in videos:
            total_engagements += (
                video.get("like_count", 0) + video.get("comment_count", 0) + video.get("share_count", 0)
            )
            total_views += video.get("view_count", 0)

        if total_views == 0:
            return 0.0

        engagement_rate = (total_engagements / total_views) * 100
        return round(engagement_rate, 2)

    def calculate_avg_views(self, videos: list) -> int:
        """
        Calculate average views from recent videos.

        Args:
            videos: List of video data

        Returns:
            Average view count
        """
        if not videos:
            return 0

        total_views = sum(video.get("view_count", 0) for video in videos)
        return round(total_views / len(videos))

    def format_stats(self, user_data: Dict[str, Any], videos: list) -> Dict[str, Any]:
        """
        Format raw API data into clean, structured stats.

        Args:
            user_data: Raw user data from TikTok API
            videos: List of recent videos

        Returns:
            Formatted stats dictionary
        """
        engagement_rate = self.calculate_engagement_rate(videos)
        avg_views = self.calculate_avg_views(videos)

        # Extract username from profile_deep_link if available
        username = user_data.get("display_name", "")
        profile_link = user_data.get("profile_deep_link", "")

        formatted = {
            "meta": {
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "source": "TikTok Official API",
                "api_version": "v2",
            },
            "profile": {
                "username": username,
                "name": username,
                "avatar": user_data.get("avatar_url", ""),
                "bio": user_data.get("bio_description", ""),
                "url": profile_link or f"https://www.tiktok.com/@{username}",
            },
            "stats": {
                "followers": user_data.get("follower_count", 0),
                "likes": user_data.get("likes_count", 0),
                "videos": user_data.get("video_count", 0),
                "engagement_rate": engagement_rate,
                "avg_views": avg_views,
            },
            # For compatibility with existing social_stats system
            "platform": "tiktok",
            "followers": user_data.get("follower_count", 0),
            "following": None,  # Not available via API
            "posts": user_data.get("video_count", 0),
            "engagement_rate": engagement_rate,
            "verified": False,  # Not in basic fields
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }

        return formatted

    async def fetch_stats(self) -> Optional[Dict[str, Any]]:
        """
        Main method to fetch TikTok statistics.
        Handles the full flow: validate token -> get user info -> fetch videos -> calculate metrics -> format data

        Returns:
            Formatted stats dictionary or None if failed
        """
        try:
            # Step 0: Validate token format
            if not self._validate_token():
                raise TikTokAPIError("Access token validation failed - check TIKTOK_ACCESS_TOKEN")

            # Step 1: Fetch user info
            user_data = await self.fetch_user_info()
            if not user_data:
                raise TikTokAPIError("Could not retrieve TikTok user info - see logs for details")

            # Step 2: Fetch recent videos for engagement metrics
            videos = await self.fetch_videos(max_count=10)
            if videos is None:
                # If video fetch fails, continue with user data only
                logger.warning("Could not fetch videos, using user data only")
                videos = []

            # Step 3: Format and return
            formatted_stats = self.format_stats(user_data, videos)

            logger.info(
                f"✅ TikTok stats fetched: {formatted_stats['stats']['followers']} followers, {formatted_stats['stats']['videos']} videos"
            )

            return formatted_stats

        except TikTokAPIError:
            raise
        except Exception as e:
            logger.error(f"Failed to fetch TikTok stats: {e}")
            return None

    async def fetch_and_refresh_token(self) -> Tuple[Optional[Dict[str, Any]], Optional[Tuple[str, str]]]:
        """
        Fetch stats and refresh token.
        TikTok tokens expire daily, so we always try to refresh.

        Returns:
            Tuple of (stats_dict, (new_access_token, new_refresh_token)) - tokens are None if not refreshed
        """
        # Try to refresh token first (tokens expire daily)
        new_tokens = None
        if self.client_key and self.client_secret:
            logger.info("Attempting to refresh TikTok access token...")
            new_tokens = await self.refresh_access_token()
            if new_tokens:
                logger.info("✅ TikTok token refreshed successfully")
                # Update access token for this session
                self.access_token = new_tokens[0]
                self.refresh_token = new_tokens[1]
                self._log_token_persistence_guidance()
            else:
                logger.warning("Token refresh failed, attempting with existing token")

        # Fetch stats with current (or newly refreshed) token
        stats = await self.fetch_stats()

        return stats, new_tokens

    def _log_token_persistence_guidance(self):
        """Log guidance for persisting refreshed tokens."""
        # Check if running in CI environment
        is_ci = os.getenv("CI") == "true" or os.getenv("GITHUB_ACTIONS") == "true"

        if is_ci:
            logger.info("")
            logger.info("=" * 60)
            logger.info("🔐 TOKEN REFRESH NOTICE (CI Environment)")
            logger.info("=" * 60)
            logger.info("TikTok tokens were refreshed but need to be persisted.")
            logger.info("")
            logger.info("The system will attempt to update GitHub Secrets automatically.")
            logger.info("If automatic update fails, you may need to manually update:")
            logger.info("  1. Go to Repository → Settings → Secrets → Actions")
            logger.info("  2. Update 'TIKTOK_SECRET' with the new tokens")
            logger.info("=" * 60)
        else:
            logger.info("")
            logger.info("💡 New tokens will be saved to .env.social automatically")


def get_tiktok_fetcher_from_env() -> Optional[TikTokFetcher]:
    """
    Create TikTokFetcher instance from environment variables.
    Expects: TIKTOK_ACCESS_TOKEN, TIKTOK_REFRESH_TOKEN, TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET

    Returns:
        TikTokFetcher instance or None if required vars missing
    """
    access_token = os.getenv("TIKTOK_ACCESS_TOKEN")
    refresh_token = os.getenv("TIKTOK_REFRESH_TOKEN")
    client_key = os.getenv("TIKTOK_CLIENT_KEY")
    client_secret = os.getenv("TIKTOK_CLIENT_SECRET")

    if not access_token:
        logger.error("❌ TIKTOK_ACCESS_TOKEN environment variable is not set")
        logger.info("")
        logger.info("💡 To configure TikTok credentials:")
        logger.info("   1. Create an app at https://developers.tiktok.com/")
        logger.info("   2. Complete the OAuth flow to get tokens")
        logger.info("   3. Add to .env.social: TIKTOK_ACCESS_TOKEN=your_token_here")
        logger.info("   4. See docs/SOCIAL_TOKENS.md for detailed instructions")
        return None

    if not refresh_token:
        logger.warning("⚠️ TIKTOK_REFRESH_TOKEN is not set")
        logger.info("   Token auto-refresh will not work")
        logger.info("   TikTok access tokens expire after 24 hours")
        logger.info("   Add TIKTOK_REFRESH_TOKEN to .env.social for automatic renewal")

    if not client_key or not client_secret:
        logger.warning("⚠️ TIKTOK_CLIENT_KEY or TIKTOK_CLIENT_SECRET not set")
        logger.info("   Token auto-refresh will be disabled")
        logger.info("   To enable, add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET to .env.social")

    return TikTokFetcher(
        access_token=access_token, refresh_token=refresh_token or "", client_key=client_key, client_secret=client_secret
    )
