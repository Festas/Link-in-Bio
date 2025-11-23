"""
Social Media Statistics Scraper
Automatically fetches follower counts and engagement metrics from social platforms.
"""

import asyncio
import json
import logging
import re
import httpx
from typing import Dict, Optional, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class SocialMediaStatsService:
    """Service to fetch social media statistics from various platforms."""
    
    def __init__(self):
        self.timeout = 30.0
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
        ]
    
    def _get_headers(self) -> Dict[str, str]:
        """Get HTTP headers for requests."""
        return {
            "User-Agent": self.user_agents[0],
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
        }
    
    async def fetch_instagram_stats(self, username: str) -> Optional[Dict[str, Any]]:
        """
        Fetch Instagram profile statistics.
        Returns dict with: followers, following, posts, engagement_rate
        """
        try:
            # Remove @ if present
            username = username.lstrip('@')
            
            # Try to fetch public profile data
            url = f"https://www.instagram.com/{username}/"
            
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(url, headers=self._get_headers())
                
                if response.status_code != 200:
                    logger.warning(f"Instagram request failed with status {response.status_code}")
                    return None
                
                html = response.text
                
                # Instagram embeds profile data in JSON within script tags
                # Look for shared_data pattern
                pattern = r'window\._sharedData\s*=\s*({.+?});'
                match = re.search(pattern, html)
                
                if match:
                    data = json.loads(match.group(1))
                    user_data = data.get('entry_data', {}).get('ProfilePage', [{}])[0].get('graphql', {}).get('user', {})
                    
                    if user_data:
                        followers = user_data.get('edge_followed_by', {}).get('count', 0)
                        following = user_data.get('edge_follow', {}).get('count', 0)
                        posts = user_data.get('edge_owner_to_timeline_media', {}).get('count', 0)
                        
                        return {
                            'platform': 'instagram',
                            'username': username,
                            'followers': followers,
                            'following': following,
                            'posts': posts,
                            'engagement_rate': None,  # Would need post-level data
                            'verified': user_data.get('is_verified', False),
                            'fetched_at': datetime.utcnow().isoformat(),
                        }
                
                # Try alternative pattern for newer Instagram format
                pattern2 = r'"edge_followed_by":\{"count":(\d+)\}'
                match2 = re.search(pattern2, html)
                if match2:
                    followers = int(match2.group(1))
                    
                    # Try to get posts count
                    posts_pattern = r'"edge_owner_to_timeline_media":\{"count":(\d+)\}'
                    posts_match = re.search(posts_pattern, html)
                    posts = int(posts_match.group(1)) if posts_match else 0
                    
                    return {
                        'platform': 'instagram',
                        'username': username,
                        'followers': followers,
                        'following': None,
                        'posts': posts,
                        'engagement_rate': None,
                        'verified': False,
                        'fetched_at': datetime.utcnow().isoformat(),
                    }
                
                logger.warning(f"Could not extract Instagram data for @{username}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching Instagram stats for @{username}: {e}")
            return None
    
    async def fetch_tiktok_stats(self, username: str) -> Optional[Dict[str, Any]]:
        """
        Fetch TikTok profile statistics.
        Returns dict with: followers, following, likes, videos
        """
        try:
            # Remove @ if present
            username = username.lstrip('@')
            
            url = f"https://www.tiktok.com/@{username}"
            
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(url, headers=self._get_headers())
                
                if response.status_code != 200:
                    logger.warning(f"TikTok request failed with status {response.status_code}")
                    return None
                
                html = response.text
                
                # TikTok embeds data in script tags
                # Look for SIGI_STATE or similar
                pattern = r'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">(.+?)</script>'
                match = re.search(pattern, html)
                
                if match:
                    data = json.loads(match.group(1))
                    user_detail = data.get('__DEFAULT_SCOPE__', {}).get('webapp.user-detail', {})
                    user_info = user_detail.get('userInfo', {}).get('stats', {})
                    
                    if user_info:
                        return {
                            'platform': 'tiktok',
                            'username': username,
                            'followers': user_info.get('followerCount', 0),
                            'following': user_info.get('followingCount', 0),
                            'likes': user_info.get('heartCount', 0),
                            'videos': user_info.get('videoCount', 0),
                            'verified': False,
                            'fetched_at': datetime.utcnow().isoformat(),
                        }
                
                # Try alternative pattern
                follower_pattern = r'"followerCount":(\d+)'
                match = re.search(follower_pattern, html)
                if match:
                    followers = int(match.group(1))
                    
                    likes_pattern = r'"heartCount":(\d+)'
                    likes_match = re.search(likes_pattern, html)
                    likes = int(likes_match.group(1)) if likes_match else 0
                    
                    videos_pattern = r'"videoCount":(\d+)'
                    videos_match = re.search(videos_pattern, html)
                    videos = int(videos_match.group(1)) if videos_match else 0
                    
                    return {
                        'platform': 'tiktok',
                        'username': username,
                        'followers': followers,
                        'following': None,
                        'likes': likes,
                        'videos': videos,
                        'verified': False,
                        'fetched_at': datetime.utcnow().isoformat(),
                    }
                
                logger.warning(f"Could not extract TikTok data for @{username}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching TikTok stats for @{username}: {e}")
            return None
    
    async def fetch_youtube_stats(self, channel_id_or_handle: str) -> Optional[Dict[str, Any]]:
        """
        Fetch YouTube channel statistics.
        Note: This is a simplified version. For accurate stats, YouTube Data API v3 is recommended.
        """
        try:
            # For now, return None as YouTube requires API key for reliable data
            # This is a placeholder for future implementation
            logger.info(f"YouTube stats fetching not yet implemented for {channel_id_or_handle}")
            return None
        except Exception as e:
            logger.error(f"Error fetching YouTube stats: {e}")
            return None
    
    async def fetch_all_stats(self, config: Dict[str, str]) -> Dict[str, Any]:
        """
        Fetch stats from all configured platforms.
        
        Args:
            config: Dict with platform keys (instagram_handle, tiktok_handle, etc.)
        
        Returns:
            Dict with platform stats and total metrics
        """
        results = {
            'platforms': {},
            'total_followers': 0,
            'last_updated': datetime.utcnow().isoformat(),
            'errors': [],
        }
        
        tasks = []
        platforms = []
        
        # Instagram
        if config.get('instagram_handle'):
            tasks.append(self.fetch_instagram_stats(config['instagram_handle']))
            platforms.append('instagram')
        
        # TikTok
        if config.get('tiktok_handle'):
            tasks.append(self.fetch_tiktok_stats(config['tiktok_handle']))
            platforms.append('tiktok')
        
        # YouTube
        if config.get('youtube_handle'):
            tasks.append(self.fetch_youtube_stats(config['youtube_handle']))
            platforms.append('youtube')
        
        # Fetch all concurrently
        if tasks:
            stats_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for platform, stats in zip(platforms, stats_results):
                if isinstance(stats, Exception):
                    results['errors'].append(f"{platform}: {str(stats)}")
                elif stats:
                    results['platforms'][platform] = stats
                    # Add to total followers
                    if 'followers' in stats and stats['followers']:
                        results['total_followers'] += stats['followers']
                else:
                    results['errors'].append(f"{platform}: Could not fetch data")
        
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
