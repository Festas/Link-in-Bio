"""
Instagram Stats Fetcher using Meta Graph API
Fetches real Instagram Business Account data and handles token refresh
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
MIN_TOKEN_LENGTH = 50
PLACEHOLDER_TOKENS = {"your_instagram_access_token_here", "your_token_here"}


class InstagramAPIError(Exception):
    """Custom exception for Instagram API errors"""

    def __init__(self, message: str, status_code: int = None, error_code: int = None, is_retryable: bool = False):
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code
        self.is_retryable = is_retryable


class InstagramFetcher:
    """Fetches Instagram statistics using Meta Graph API with automatic token refresh."""

    def __init__(self, access_token: str, username: str, app_id: str = None, app_secret: str = None):
        """
        Initialize Instagram fetcher.

        Args:
            access_token: Long-lived Instagram access token
            username: Target Instagram username (e.g., 'festas_builds')
            app_id: Meta App ID (for token refresh)
            app_secret: Meta App Secret (for token refresh)
        """
        self.access_token = access_token
        self.username = username
        self.app_id = app_id
        self.app_secret = app_secret
        self.api_version = "v18.0"
        self.base_url = f"https://graph.facebook.com/{self.api_version}"
        self.timeout = 30.0

    async def _make_request_with_retry(
        self,
        method: str,
        url: str,
        params: Dict = None,
        data: Dict = None,
        headers: Dict = None,
    ) -> httpx.Response:
        """
        Make HTTP request with exponential backoff retry for transient errors.

        Args:
            method: HTTP method (GET, POST)
            url: Request URL
            params: Query parameters
            data: Request body data
            headers: Request headers

        Returns:
            httpx.Response object

        Raises:
            InstagramAPIError: If all retries fail
        """
        last_exception = None
        backoff = INITIAL_BACKOFF

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    if method.upper() == "GET":
                        response = await client.get(url, params=params, headers=headers)
                    else:
                        response = await client.post(url, data=data, params=params, headers=headers)

                    # Check for retryable HTTP errors
                    if response.status_code in RETRYABLE_STATUS_CODES:
                        logger.warning(
                            f"Retryable HTTP error {response.status_code} on attempt {attempt}/{MAX_RETRIES}"
                        )
                        if attempt < MAX_RETRIES:
                            await asyncio.sleep(backoff)
                            backoff = min(backoff * 2, MAX_BACKOFF)
                            continue
                        raise InstagramAPIError(
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

        raise InstagramAPIError(
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
            logger.info("🔍 Validating access token with Meta Graph API...")

            url = f"{self.base_url}/me"
            params = {"access_token": self.access_token, "fields": "id,name"}

            response = await self._make_request_with_retry("GET", url, params=params)

            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ Token is valid. Connected to: {data.get('name', 'Unknown')}")
                return True, ""

            # Parse error response
            error_data = response.json()
            error = error_data.get("error", {})
            error_message = error.get("message", "Unknown error")
            error_code = error.get("code", 0)

            if error_code == 190:
                return False, f"Token is expired or invalid: {error_message}"
            elif error_code == 4:
                return False, f"Rate limit exceeded: {error_message}"
            else:
                return False, f"API error ({error_code}): {error_message}"

        except Exception as e:
            return False, f"Token validation failed: {e}"

    async def refresh_long_lived_token(self) -> Optional[str]:
        """
        Refresh the long-lived access token.
        Long-lived tokens expire after 60 days, so this should be called regularly.

        Returns:
            New access token or None if refresh failed
        """
        if not self.app_id or not self.app_secret:
            logger.warning("Cannot refresh token: APP_ID and APP_SECRET not provided")
            logger.info("💡 To enable automatic token refresh, set INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET")
            return None

        try:
            logger.info("🔄 Attempting to refresh access token...")

            url = f"{self.base_url}/oauth/access_token"
            params = {
                "grant_type": "fb_exchange_token",
                "client_id": self.app_id,
                "client_secret": self.app_secret,
                "fb_exchange_token": self.access_token,
            }

            response = await self._make_request_with_retry("GET", url, params=params)

            if response.status_code != 200:
                error_data = response.json()
                error = error_data.get("error", {})
                logger.error(f"Token refresh failed: {error.get('message', response.text)}")
                return None

            data = response.json()
            new_token = data.get("access_token")
            expires_in = data.get("expires_in", 5184000)  # Default: 60 days

            logger.info(
                f"✅ Token refreshed successfully. Expires in {expires_in} seconds (~{expires_in / 86400:.0f} days)"
            )

            return new_token

        except Exception as e:
            logger.error(f"Error refreshing token: {e}")
            return None

    async def get_instagram_account_id(self) -> Optional[str]:
        """
        Get the Instagram Business Account ID for the configured username.

        Returns:
            Instagram account ID or None if not found
        """
        try:
            logger.info(f"🔍 Searching for Instagram ID for: @{self.username}")

            url = f"{self.base_url}/me/accounts"
            params = {"access_token": self.access_token, "fields": "instagram_business_account{id,username},name"}

            response = await self._make_request_with_retry("GET", url, params=params)

            if response.status_code != 200:
                error_data = response.json()
                error = error_data.get("error", {})
                error_message = error.get("message", response.text)
                error_code = error.get("code", 0)

                if error_code == 190:
                    logger.error(f"❌ Access token is expired or invalid: {error_message}")
                    logger.info("💡 Please regenerate your access token in Meta Developer Portal")
                elif error_code == 10:
                    logger.error(f"❌ Permission denied: {error_message}")
                    logger.info("💡 Ensure your app has 'pages_read_engagement' permission")
                else:
                    logger.error(f"❌ Failed to get account ID: {error_message}")

                return None

            data = response.json()
            pages = data.get("data", [])

            if not pages:
                logger.error("❌ No Facebook Pages found connected to this token")
                logger.info("")
                logger.info("💡 To fix this issue:")
                logger.info("   1. Go to https://business.facebook.com")
                logger.info("   2. Create a Facebook Page if you don't have one")
                logger.info("   3. Link your Instagram Business Account to the Facebook Page")
                logger.info("   4. Regenerate your access token with 'pages_read_engagement' permission")
                return None

            # Find the page with matching Instagram username
            for page in pages:
                ig_account = page.get("instagram_business_account")
                page_name = page.get("name", "Unknown")

                if ig_account:
                    ig_username = ig_account.get("username", "")
                    if ig_username.lower() == self.username.lower():
                        account_id = ig_account["id"]
                        logger.info(f"✅ Found Instagram account ID: {account_id} (via page: {page_name})")
                        return account_id
                    else:
                        logger.debug(f"Page '{page_name}' has different Instagram: @{ig_username}")
                else:
                    logger.debug(f"Page '{page_name}' has no Instagram Business Account linked")

            # If we get here, no matching account was found
            logger.error(f"❌ No Instagram Business Account found for username: @{self.username}")
            logger.info("")
            logger.info("💡 This can happen if:")
            logger.info("   1. Your Instagram account is a Personal account (not Business/Creator)")
            logger.info("   2. Your Instagram account is not linked to a Facebook Page")
            logger.info("   3. The username in INSTAGRAM_USERNAME doesn't match your account")
            logger.info("")
            logger.info("📋 To fix:")
            logger.info("   1. Open Instagram app → Settings → Account → Switch to Professional Account")
            logger.info("   2. Choose 'Business' or 'Creator' account type")
            logger.info("   3. Link to your Facebook Page when prompted")
            logger.info("   4. Verify INSTAGRAM_USERNAME matches your account (without @)")
            logger.info("")
            logger.info(f"   Found Facebook Pages: {[p.get('name') for p in pages]}")

            return None

        except Exception as e:
            logger.error(f"Error getting Instagram account ID: {e}")
            return None

    async def fetch_analytics(self, instagram_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch Instagram analytics for the given account ID.

        Args:
            instagram_id: Instagram Business Account ID

        Returns:
            Dict with profile info and insights or None if failed
        """
        try:
            logger.info("📊 Fetching Instagram analytics...")

            url = f"{self.base_url}/{instagram_id}"
            params = {
                "access_token": self.access_token,
                "fields": "followers_count,media_count,name,profile_picture_url,biography,username,insights.metric(impressions,reach,profile_views).period(day)",
            }

            response = await self._make_request_with_retry("GET", url, params=params)

            if response.status_code != 200:
                error_data = response.json()
                error = error_data.get("error", {})
                logger.error(f"Failed to fetch analytics: {error.get('message', response.text)}")
                return None

            data = response.json()
            logger.info("✅ Successfully fetched Instagram analytics")
            return data

        except Exception as e:
            logger.error(f"Error fetching Instagram analytics: {e}")
            return None

    def _get_metric_value(self, insights_data: Optional[Dict], metric_name: str) -> int:
        """
        Helper to safely extract metric value from insights data.

        Args:
            insights_data: The insights data from API response
            metric_name: Name of the metric (e.g., 'reach', 'impressions')

        Returns:
            Metric value or 0 if not found
        """
        if not insights_data or "data" not in insights_data:
            return 0

        for metric in insights_data["data"]:
            if metric.get("name") == metric_name:
                values = metric.get("values", [])
                if values:
                    # Get the most recent value (last in array)
                    return values[-1].get("value", 0)

        return 0

    def format_stats(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format raw API data into clean, structured stats.

        Args:
            raw_data: Raw data from Instagram API

        Returns:
            Formatted stats dictionary
        """
        insights = raw_data.get("insights")

        formatted = {
            "meta": {
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "source": "Meta Graph API",
                "api_version": self.api_version,
            },
            "profile": {
                "username": raw_data.get("username", self.username),
                "name": raw_data.get("name", ""),
                "avatar": raw_data.get("profile_picture_url", ""),
                "bio": raw_data.get("biography", ""),
                "url": f"https://instagram.com/{self.username}",
            },
            "stats": {
                "followers": raw_data.get("followers_count", 0),
                "posts": raw_data.get("media_count", 0),
                "reach_daily": self._get_metric_value(insights, "reach"),
                "impressions_daily": self._get_metric_value(insights, "impressions"),
                "profile_views": self._get_metric_value(insights, "profile_views"),
            },
            # For compatibility with existing social_stats system
            "platform": "instagram",
            "followers": raw_data.get("followers_count", 0),
            "following": None,  # Not available via Business API
            "posts": raw_data.get("media_count", 0),
            "engagement_rate": None,  # Would need post-level analysis
            "verified": False,  # Not in basic fields
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }

        return formatted

    async def fetch_stats(self) -> Optional[Dict[str, Any]]:
        """
        Main method to fetch Instagram statistics.
        Handles the full flow: validate token -> get account ID -> fetch analytics -> format data

        Returns:
            Formatted stats dictionary or None if failed
        """
        try:
            # Step 0: Validate token format
            if not self._validate_token():
                raise InstagramAPIError("Access token validation failed - check INSTAGRAM_ACCESS_TOKEN")

            # Step 1: Validate token with API (optional, for better error messages)
            is_valid, error_msg = await self.validate_token_with_api()
            if not is_valid:
                raise InstagramAPIError(f"Token validation failed: {error_msg}")

            # Step 2: Get Instagram account ID
            account_id = await self.get_instagram_account_id()
            if not account_id:
                raise InstagramAPIError("Could not retrieve Instagram account ID - see logs for details")

            # Step 3: Fetch analytics
            raw_data = await self.fetch_analytics(account_id)
            if not raw_data:
                raise InstagramAPIError("Could not fetch Instagram analytics")

            # Step 4: Format and return
            formatted_stats = self.format_stats(raw_data)

            logger.info(
                f"✅ Instagram stats fetched: {formatted_stats['stats']['followers']} followers, {formatted_stats['stats']['posts']} posts"
            )

            return formatted_stats

        except InstagramAPIError:
            raise
        except Exception as e:
            logger.error(f"Failed to fetch Instagram stats: {e}")
            return None

    async def fetch_and_refresh_token(self) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Fetch stats and optionally refresh token if needed.

        Returns:
            Tuple of (stats_dict, new_token) - new_token is None if not refreshed
        """
        stats = await self.fetch_stats()

        # Try to refresh token (good practice to do this regularly)
        new_token = None
        if self.app_id and self.app_secret:
            logger.info("Attempting to refresh access token...")
            new_token = await self.refresh_long_lived_token()
            if new_token:
                logger.info("✅ Token refreshed successfully")
                self._log_token_persistence_guidance(new_token)
            else:
                logger.warning("Token refresh failed, continuing with existing token")

        return stats, new_token

    def _log_token_persistence_guidance(self, new_token: str):
        """Log guidance for persisting refreshed tokens."""
        # Check if running in CI environment
        is_ci = os.getenv("CI") == "true" or os.getenv("GITHUB_ACTIONS") == "true"

        if is_ci:
            logger.info("")
            logger.info("=" * 60)
            logger.info("🔐 TOKEN REFRESH NOTICE (CI Environment)")
            logger.info("=" * 60)
            logger.info("The access token was refreshed but cannot be persisted in CI.")
            logger.info("")
            logger.info("The system will attempt to update GitHub Secrets automatically.")
            logger.info("If automatic update fails, you may need to manually update:")
            logger.info("  1. Go to Repository → Settings → Secrets → Actions")
            logger.info("  2. Update 'INSTAGRAM_SECRET' with the new token")
            logger.info("=" * 60)
        else:
            logger.info("")
            logger.info("💡 New token will be saved to .env.social automatically")


def get_instagram_fetcher_from_env() -> Optional[InstagramFetcher]:
    """
    Create InstagramFetcher instance from environment variables.
    Expects: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USERNAME, INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET

    Returns:
        InstagramFetcher instance or None if required vars missing
    """
    access_token = os.getenv("INSTAGRAM_ACCESS_TOKEN")
    username = os.getenv("INSTAGRAM_USERNAME")
    app_id = os.getenv("INSTAGRAM_APP_ID")
    app_secret = os.getenv("INSTAGRAM_APP_SECRET")

    if not access_token:
        logger.error("❌ INSTAGRAM_ACCESS_TOKEN environment variable is not set")
        logger.info("")
        logger.info("💡 To configure Instagram credentials:")
        logger.info("   1. Get a Long-Lived Access Token from Meta Developer Portal")
        logger.info("   2. Add to .env.social: INSTAGRAM_ACCESS_TOKEN=your_token_here")
        logger.info("   3. See docs/SOCIAL_TOKENS.md for detailed instructions")
        return None

    if not username:
        logger.error("❌ INSTAGRAM_USERNAME environment variable is not set")
        logger.info("   Add to .env.social: INSTAGRAM_USERNAME=your_username (without @)")
        return None

    if not app_id or not app_secret:
        logger.warning("⚠️ INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET not set")
        logger.info("   Token auto-refresh will be disabled")
        logger.info("   To enable, add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET to .env.social")

    return InstagramFetcher(access_token=access_token, username=username, app_id=app_id, app_secret=app_secret)
