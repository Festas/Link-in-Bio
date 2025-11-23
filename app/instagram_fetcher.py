"""
Instagram Stats Fetcher using Meta Graph API
Fetches real Instagram Business Account data and handles token refresh
"""

import os
import json
import logging
import httpx
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)


class InstagramAPIError(Exception):
    """Custom exception for Instagram API errors"""
    pass


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
        self.api_version = 'v18.0'
        self.base_url = f'https://graph.facebook.com/{self.api_version}'
        self.timeout = 30.0
    
    async def refresh_long_lived_token(self) -> Optional[str]:
        """
        Refresh the long-lived access token.
        Long-lived tokens expire after 60 days, so this should be called regularly.
        
        Returns:
            New access token or None if refresh failed
        """
        if not self.app_id or not self.app_secret:
            logger.warning("Cannot refresh token: APP_ID and APP_SECRET not provided")
            return None
        
        try:
            url = f"{self.base_url}/oauth/access_token"
            params = {
                'grant_type': 'fb_exchange_token',
                'client_id': self.app_id,
                'client_secret': self.app_secret,
                'fb_exchange_token': self.access_token
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params)
                
                if response.status_code != 200:
                    logger.error(f"Token refresh failed: {response.status_code} - {response.text}")
                    return None
                
                data = response.json()
                new_token = data.get('access_token')
                expires_in = data.get('expires_in', 5184000)  # Default: 60 days
                
                logger.info(f"Token refreshed successfully. Expires in {expires_in} seconds (~{expires_in/86400:.0f} days)")
                
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
            logger.info(f"🔍 Searching for Instagram ID for: {self.username}")
            
            url = f"{self.base_url}/me/accounts"
            params = {
                'access_token': self.access_token,
                'fields': 'instagram_business_account{id,username},name'
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params)
                
                if response.status_code != 200:
                    logger.error(f"Failed to get account ID: {response.status_code} - {response.text}")
                    return None
                
                data = response.json()
                pages = data.get('data', [])
                
                # Find the page with matching Instagram username
                for page in pages:
                    ig_account = page.get('instagram_business_account')
                    if ig_account and ig_account.get('username', '').lower() == self.username.lower():
                        account_id = ig_account['id']
                        logger.info(f"✅ Found Instagram account ID: {account_id}")
                        return account_id
                
                logger.error(f"No Instagram Business Account found for username: {self.username}")
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
                'access_token': self.access_token,
                'fields': 'followers_count,media_count,name,profile_picture_url,biography,username,insights.metric(impressions,reach,profile_views).period(day)'
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params)
                
                if response.status_code != 200:
                    logger.error(f"Failed to fetch analytics: {response.status_code} - {response.text}")
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
        if not insights_data or 'data' not in insights_data:
            return 0
        
        for metric in insights_data['data']:
            if metric.get('name') == metric_name:
                values = metric.get('values', [])
                if values:
                    # Get the most recent value (last in array)
                    return values[-1].get('value', 0)
        
        return 0
    
    def format_stats(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format raw API data into clean, structured stats.
        
        Args:
            raw_data: Raw data from Instagram API
            
        Returns:
            Formatted stats dictionary
        """
        insights = raw_data.get('insights')
        
        formatted = {
            'meta': {
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'source': 'Meta Graph API',
                'api_version': self.api_version
            },
            'profile': {
                'username': raw_data.get('username', self.username),
                'name': raw_data.get('name', ''),
                'avatar': raw_data.get('profile_picture_url', ''),
                'bio': raw_data.get('biography', ''),
                'url': f"https://instagram.com/{self.username}"
            },
            'stats': {
                'followers': raw_data.get('followers_count', 0),
                'posts': raw_data.get('media_count', 0),
                'reach_daily': self._get_metric_value(insights, 'reach'),
                'impressions_daily': self._get_metric_value(insights, 'impressions'),
                'profile_views': self._get_metric_value(insights, 'profile_views')
            },
            # For compatibility with existing social_stats system
            'platform': 'instagram',
            'followers': raw_data.get('followers_count', 0),
            'following': None,  # Not available via Business API
            'posts': raw_data.get('media_count', 0),
            'engagement_rate': None,  # Would need post-level analysis
            'verified': False,  # Not in basic fields
            'fetched_at': datetime.now(timezone.utc).isoformat()
        }
        
        return formatted
    
    async def fetch_stats(self) -> Optional[Dict[str, Any]]:
        """
        Main method to fetch Instagram statistics.
        Handles the full flow: get account ID -> fetch analytics -> format data
        
        Returns:
            Formatted stats dictionary or None if failed
        """
        try:
            # Step 1: Get Instagram account ID
            account_id = await self.get_instagram_account_id()
            if not account_id:
                raise InstagramAPIError("Could not retrieve Instagram account ID")
            
            # Step 2: Fetch analytics
            raw_data = await self.fetch_analytics(account_id)
            if not raw_data:
                raise InstagramAPIError("Could not fetch Instagram analytics")
            
            # Step 3: Format and return
            formatted_stats = self.format_stats(raw_data)
            
            logger.info(f"✅ Instagram stats fetched: {formatted_stats['stats']['followers']} followers, {formatted_stats['stats']['posts']} posts")
            
            return formatted_stats
            
        except Exception as e:
            logger.error(f"Failed to fetch Instagram stats: {e}")
            return None
    
    async def fetch_and_refresh_token(self) -> tuple[Optional[Dict[str, Any]], Optional[str]]:
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
            else:
                logger.warning("Token refresh failed, continuing with existing token")
        
        return stats, new_token


def get_instagram_fetcher_from_env() -> Optional[InstagramFetcher]:
    """
    Create InstagramFetcher instance from environment variables.
    Expects: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USERNAME, INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET
    
    Returns:
        InstagramFetcher instance or None if required vars missing
    """
    access_token = os.getenv('INSTAGRAM_ACCESS_TOKEN')
    username = os.getenv('INSTAGRAM_USERNAME')
    app_id = os.getenv('INSTAGRAM_APP_ID')
    app_secret = os.getenv('INSTAGRAM_APP_SECRET')
    
    if not access_token or not username:
        logger.error("Missing required environment variables: INSTAGRAM_ACCESS_TOKEN and/or INSTAGRAM_USERNAME")
        return None
    
    return InstagramFetcher(
        access_token=access_token,
        username=username,
        app_id=app_id,
        app_secret=app_secret
    )
