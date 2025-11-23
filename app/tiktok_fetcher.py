"""
TikTok Stats Fetcher using TikTok Official API
Fetches real TikTok Business Account data and handles token refresh
"""

import os
import logging
import httpx
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class TikTokAPIError(Exception):
    """Custom exception for TikTok API errors"""
    pass


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
        self.base_url = 'https://open.tiktokapis.com/v2'
        self.timeout = 30.0
    
    async def refresh_access_token(self) -> Optional[Tuple[str, str]]:
        """
        Refresh the access token using the refresh token.
        TikTok access tokens expire after 24 hours, so this should be called daily.
        
        Returns:
            Tuple of (new_access_token, new_refresh_token) or None if refresh failed
        """
        if not self.client_key or not self.client_secret:
            logger.warning("Cannot refresh token: CLIENT_KEY and CLIENT_SECRET not provided")
            return None
        
        try:
            url = "https://open.tiktokapis.com/v2/oauth/token/"
            
            data = {
                'client_key': self.client_key,
                'client_secret': self.client_secret,
                'grant_type': 'refresh_token',
                'refresh_token': self.refresh_token
            }
            
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, data=data, headers=headers)
                
                if response.status_code != 200:
                    logger.error(f"Token refresh failed: {response.status_code} - {response.text}")
                    return None
                
                data = response.json()
                
                # TikTok returns new access_token and refresh_token
                new_access_token = data.get('access_token')
                new_refresh_token = data.get('refresh_token')
                expires_in = data.get('expires_in', 86400)  # Default: 24 hours
                
                logger.info(f"Token refreshed successfully. Expires in {expires_in} seconds (~{expires_in/3600:.0f} hours)")
                
                return (new_access_token, new_refresh_token)
                
        except Exception as e:
            logger.error(f"Error refreshing token: {e}")
            return None
    
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
                'fields': 'display_name,avatar_url,follower_count,likes_count,video_count,bio_description,profile_deep_link'
            }
            headers = {
                'Authorization': f'Bearer {self.access_token}'
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params, headers=headers)
                
                if response.status_code != 200:
                    logger.error(f"Failed to fetch user info: {response.status_code} - {response.text}")
                    return None
                
                data = response.json()
                
                # Check for API errors
                if data.get('error'):
                    logger.error(f"TikTok API error: {data['error']}")
                    return None
                
                logger.info("✅ Successfully fetched TikTok user info")
                return data.get('data', {}).get('user', {})
                
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
            params = {
                'fields': 'id,view_count,like_count,comment_count,share_count,create_time'
            }
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                'max_count': min(max_count, 20)  # API limit is 20
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, params=params, headers=headers, json=payload)
                
                if response.status_code != 200:
                    logger.error(f"Failed to fetch videos: {response.status_code} - {response.text}")
                    return None
                
                data = response.json()
                
                # Check for API errors
                if data.get('error'):
                    logger.error(f"TikTok API error: {data['error']}")
                    return None
                
                videos = data.get('data', {}).get('videos', [])
                logger.info(f"✅ Successfully fetched {len(videos)} videos")
                return videos
                
        except Exception as e:
            logger.error(f"Error fetching TikTok videos: {e}")
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
                video.get('like_count', 0) + 
                video.get('comment_count', 0) + 
                video.get('share_count', 0)
            )
            total_views += video.get('view_count', 0)
        
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
        
        total_views = sum(video.get('view_count', 0) for video in videos)
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
        username = user_data.get('display_name', '')
        profile_link = user_data.get('profile_deep_link', '')
        
        formatted = {
            'meta': {
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'source': 'TikTok Official API',
                'api_version': 'v2'
            },
            'profile': {
                'username': username,
                'name': username,
                'avatar': user_data.get('avatar_url', ''),
                'bio': user_data.get('bio_description', ''),
                'url': profile_link or f"https://www.tiktok.com/@{username}"
            },
            'stats': {
                'followers': user_data.get('follower_count', 0),
                'likes': user_data.get('likes_count', 0),
                'videos': user_data.get('video_count', 0),
                'engagement_rate': engagement_rate,
                'avg_views': avg_views
            },
            # For compatibility with existing social_stats system
            'platform': 'tiktok',
            'followers': user_data.get('follower_count', 0),
            'following': None,  # Not available via API
            'posts': user_data.get('video_count', 0),
            'engagement_rate': engagement_rate,
            'verified': False,  # Not in basic fields
            'fetched_at': datetime.now(timezone.utc).isoformat()
        }
        
        return formatted
    
    async def fetch_stats(self) -> Optional[Dict[str, Any]]:
        """
        Main method to fetch TikTok statistics.
        Handles the full flow: get user info -> fetch videos -> calculate metrics -> format data
        
        Returns:
            Formatted stats dictionary or None if failed
        """
        try:
            # Step 1: Fetch user info
            user_data = await self.fetch_user_info()
            if not user_data:
                raise TikTokAPIError("Could not retrieve TikTok user info")
            
            # Step 2: Fetch recent videos for engagement metrics
            videos = await self.fetch_videos(max_count=10)
            if videos is None:
                # If video fetch fails, continue with user data only
                logger.warning("Could not fetch videos, using user data only")
                videos = []
            
            # Step 3: Format and return
            formatted_stats = self.format_stats(user_data, videos)
            
            logger.info(f"✅ TikTok stats fetched: {formatted_stats['stats']['followers']} followers, {formatted_stats['stats']['videos']} videos")
            
            return formatted_stats
            
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
            else:
                logger.warning("Token refresh failed, continuing with existing token")
        
        # Fetch stats with current (or newly refreshed) token
        stats = await self.fetch_stats()
        
        return stats, new_tokens


def get_tiktok_fetcher_from_env() -> Optional[TikTokFetcher]:
    """
    Create TikTokFetcher instance from environment variables.
    Expects: TIKTOK_ACCESS_TOKEN, TIKTOK_REFRESH_TOKEN, TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
    
    Returns:
        TikTokFetcher instance or None if required vars missing
    """
    access_token = os.getenv('TIKTOK_ACCESS_TOKEN')
    refresh_token = os.getenv('TIKTOK_REFRESH_TOKEN')
    client_key = os.getenv('TIKTOK_CLIENT_KEY')
    client_secret = os.getenv('TIKTOK_CLIENT_SECRET')
    
    if not access_token or not refresh_token:
        logger.error("Missing required environment variables: TIKTOK_ACCESS_TOKEN and/or TIKTOK_REFRESH_TOKEN")
        return None
    
    return TikTokFetcher(
        access_token=access_token,
        refresh_token=refresh_token,
        client_key=client_key,
        client_secret=client_secret
    )
