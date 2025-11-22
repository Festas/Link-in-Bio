"""
Special domain handlers for well-known websites.
Each handler provides optimized extraction for specific domains.
"""

import re
import logging
from typing import Dict, Optional
from urllib.parse import urlparse, parse_qs

logger = logging.getLogger(__name__)


class SpecialDomainHandler:
    """Base class for special domain handlers."""
    
    def can_handle(self, url: str, parsed_url) -> bool:
        """Check if this handler can handle the URL."""
        raise NotImplementedError
    
    def handle(self, url: str, parsed_url) -> Dict[str, Optional[str]]:
        """Extract metadata for this domain. Returns dict with title, image_url."""
        raise NotImplementedError


class GitHubHandler(SpecialDomainHandler):
    """Handler for GitHub URLs."""
    
    def can_handle(self, url: str, parsed_url) -> bool:
        netloc = parsed_url.netloc.lower()
        return netloc == "github.com" or netloc == "www.github.com"
    
    def handle(self, url: str, parsed_url) -> Dict[str, Optional[str]]:
        data = {}
        path_parts = parsed_url.path.strip("/").split("/")
        
        # Repository: github.com/user/repo
        if len(path_parts) >= 2 and path_parts[0] and path_parts[1]:
            user = path_parts[0]
            repo = path_parts[1]
            data["title"] = f"{repo} by {user}"
            data["image_url"] = f"https://opengraph.githubassets.com/1/{user}/{repo}"
        
        # User profile: github.com/user
        elif len(path_parts) == 1 and path_parts[0]:
            user = path_parts[0]
            data["title"] = f"{user} on GitHub"
            data["image_url"] = f"https://github.com/{user}.png?size=400"
        
        return data


class LinkedInHandler(SpecialDomainHandler):
    """Handler for LinkedIn URLs."""
    
    def can_handle(self, url: str, parsed_url) -> bool:
        netloc = parsed_url.netloc.lower()
        return netloc == "linkedin.com" or netloc == "www.linkedin.com"
    
    def handle(self, url: str, parsed_url) -> Dict[str, Optional[str]]:
        data = {}
        
        # Profile: linkedin.com/in/username
        if "/in/" in parsed_url.path:
            username = parsed_url.path.split("/in/")[1].strip("/").split("/")[0]
            if username:
                data["title"] = f"LinkedIn Profile: {username}"
            else:
                data["title"] = "LinkedIn Profile"
            data["image_url"] = "https://static.licdn.com/sc/h/al2o9zrvru7aqj8e1x2rzsrca"
        
        # Company: linkedin.com/company/name
        elif "/company/" in parsed_url.path:
            company = parsed_url.path.split("/company/")[1].strip("/").split("/")[0]
            if company:
                data["title"] = f"LinkedIn: {company.replace('-', ' ').title()}"
            else:
                data["title"] = "LinkedIn Company"
            data["image_url"] = "https://static.licdn.com/sc/h/al2o9zrvru7aqj8e1x2rzsrca"
        
        return data


class TwitterHandler(SpecialDomainHandler):
    """Handler for Twitter/X URLs."""
    
    def can_handle(self, url: str, parsed_url) -> bool:
        netloc = parsed_url.netloc.lower()
        return netloc in ["twitter.com", "x.com", "www.twitter.com", "www.x.com"]
    
    def handle(self, url: str, parsed_url) -> Dict[str, Optional[str]]:
        data = {}
        path_parts = [p for p in parsed_url.path.strip("/").split("/") if p]
        
        # Profile: twitter.com/username or x.com/username
        if len(path_parts) >= 1 and path_parts[0] not in ["i", "intent", "share", "search"]:
            username = path_parts[0]
            data["title"] = f"@{username} on X"
            # Twitter doesn't provide a reliable profile image URL without API
            # We'll let the normal scraper get the OG image
        
        # Tweet: twitter.com/username/status/id
        elif len(path_parts) >= 3 and path_parts[1] == "status":
            username = path_parts[0]
            data["title"] = f"Tweet by @{username}"
        
        return data


class InstagramHandler(SpecialDomainHandler):
    """Handler for Instagram URLs."""
    
    def can_handle(self, url: str, parsed_url) -> bool:
        netloc = parsed_url.netloc.lower()
        return netloc == "instagram.com" or netloc == "www.instagram.com"
    
    def handle(self, url: str, parsed_url) -> Dict[str, Optional[str]]:
        data = {}
        path_parts = [p for p in parsed_url.path.strip("/").split("/") if p]
        
        # Profile: instagram.com/username
        if len(path_parts) >= 1 and path_parts[0] not in ["p", "reel", "tv", "explore"]:
            username = path_parts[0]
            data["title"] = f"@{username} on Instagram"
        
        # Post: instagram.com/p/id
        elif len(path_parts) >= 2 and path_parts[0] in ["p", "reel", "tv"]:
            data["title"] = "Instagram Post"
        
        return data


class YouTubeHandler(SpecialDomainHandler):
    """Handler for YouTube URLs."""
    
    def can_handle(self, url: str, parsed_url) -> bool:
        netloc = parsed_url.netloc.lower()
        return netloc in ["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"]
    
    def handle(self, url: str, parsed_url) -> Dict[str, Optional[str]]:
        data = {}
        
        video_id = None
        netloc = parsed_url.netloc.lower()
        
        # youtu.be/VIDEO_ID
        if netloc in ["youtu.be", "www.youtu.be"]:
            video_id = parsed_url.path.strip("/").split("/")[0]
        
        # youtube.com/watch?v=VIDEO_ID
        elif netloc in ["youtube.com", "www.youtube.com", "m.youtube.com"]:
            if "/watch" in parsed_url.path:
                query = parse_qs(parsed_url.query)
                if "v" in query:
                    video_id = query["v"][0]
            # youtube.com/embed/VIDEO_ID
            elif "/embed/" in parsed_url.path:
                video_id = parsed_url.path.split("/embed/")[1].split("/")[0]
            # Channel or user
            elif "/channel/" in parsed_url.path or "/user/" in parsed_url.path or "/@" in parsed_url.path:
                data["title"] = "YouTube Channel"
        
        if video_id:
            data["title"] = "YouTube Video"
            # Use high quality thumbnail
            data["image_url"] = f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"
        
        return data


class AmazonHandler(SpecialDomainHandler):
    """Handler for Amazon product URLs."""
    
    def can_handle(self, url: str, parsed_url) -> bool:
        netloc = parsed_url.netloc.lower()
        return "amazon." in netloc or "amzn." in netloc
    
    def handle(self, url: str, parsed_url) -> Dict[str, Optional[str]]:
        data = {}
        
        # Try to extract ASIN
        asin = self._extract_asin(url)
        
        if asin:
            data["title"] = "Amazon Product"
            data["image_url"] = f"https://images-na.ssl-images-amazon.com/images/P/{asin}.01.MAIN._SCLZZZZZZZ_.jpg"
        
        return data
    
    def _extract_asin(self, url: str) -> Optional[str]:
        """Extract Amazon ASIN from URL."""
        # Pattern: /dp/ASIN or /gp/product/ASIN
        match = re.search(r"/(dp|gp/product|d)/(B[A-Z0-9]{9})", url)
        if match:
            return match.group(2)
        
        # Pattern: /ASIN
        match = re.search(r"/([A-Z0-9]{10})(?:[/?]|$)", url)
        if match and match.group(1).startswith("B"):
            return match.group(1)
        
        return None


class RedditHandler(SpecialDomainHandler):
    """Handler for Reddit URLs."""
    
    def can_handle(self, url: str, parsed_url) -> bool:
        netloc = parsed_url.netloc.lower()
        return netloc in ["reddit.com", "www.reddit.com", "redd.it", "old.reddit.com"]
    
    def handle(self, url: str, parsed_url) -> Dict[str, Optional[str]]:
        data = {}
        path_parts = [p for p in parsed_url.path.strip("/").split("/") if p]
        
        # Subreddit: reddit.com/r/subreddit
        if len(path_parts) >= 2 and path_parts[0] == "r":
            subreddit = path_parts[1]
            data["title"] = f"r/{subreddit}"
        
        # User: reddit.com/u/user or reddit.com/user/user
        elif len(path_parts) >= 2 and path_parts[0] in ["u", "user"]:
            username = path_parts[1]
            data["title"] = f"u/{username} on Reddit"
        
        # Post will be handled by normal scraper
        
        return data


class SpotifyHandler(SpecialDomainHandler):
    """Handler for Spotify URLs."""
    
    def can_handle(self, url: str, parsed_url) -> bool:
        netloc = parsed_url.netloc.lower()
        return netloc == "open.spotify.com"
    
    def handle(self, url: str, parsed_url) -> Dict[str, Optional[str]]:
        data = {}
        path_parts = [p for p in parsed_url.path.strip("/").split("/") if p]
        
        # Track, album, playlist, artist
        if len(path_parts) >= 2:
            content_type = path_parts[0]
            if content_type == "track":
                data["title"] = "Spotify Track"
            elif content_type == "album":
                data["title"] = "Spotify Album"
            elif content_type == "playlist":
                data["title"] = "Spotify Playlist"
            elif content_type == "artist":
                data["title"] = "Spotify Artist"
        
        # Spotify OpenGraph tags are usually good, so we don't set image_url here
        
        return data


class StackOverflowHandler(SpecialDomainHandler):
    """Handler for Stack Overflow and Stack Exchange URLs."""
    
    def can_handle(self, url: str, parsed_url) -> bool:
        netloc = parsed_url.netloc.lower()
        # Exact match for stackoverflow.com and any *.stackexchange.com subdomain
        return (netloc == "stackoverflow.com" or 
                netloc == "www.stackoverflow.com" or 
                netloc.endswith(".stackexchange.com"))
    
    def handle(self, url: str, parsed_url) -> Dict[str, Optional[str]]:
        data = {}
        
        # Question page
        if "/questions/" in parsed_url.path:
            # Title is usually in the URL slug, but OG tags are better
            data["title"] = "Stack Overflow Question"
        
        # User profile
        elif "/users/" in parsed_url.path:
            data["title"] = "Stack Overflow User"
        
        return data


class SpecialDomainRouter:
    """Routes URLs to appropriate special handlers."""
    
    def __init__(self):
        self.handlers = [
            GitHubHandler(),
            LinkedInHandler(),
            TwitterHandler(),
            InstagramHandler(),
            YouTubeHandler(),
            AmazonHandler(),
            RedditHandler(),
            SpotifyHandler(),
            StackOverflowHandler(),
        ]
    
    def handle(self, url: str) -> Dict[str, Optional[str]]:
        """Try to handle URL with special handlers."""
        try:
            parsed = urlparse(url)
            
            for handler in self.handlers:
                if handler.can_handle(url, parsed):
                    result = handler.handle(url, parsed)
                    if result:
                        logger.debug(f"Special handler {handler.__class__.__name__} handled {url}")
                        return result
        
        except Exception as e:
            logger.warning(f"Special domain routing failed for {url}: {e}")
        
        return {}
