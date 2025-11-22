"""
Special domain handlers for well-known websites.
Each handler provides optimized extraction for specific domains.
"""

import re
import logging
import urllib.parse
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
    """Handler for Amazon product URLs with enhanced title and image extraction."""
    
    def can_handle(self, url: str, parsed_url) -> bool:
        netloc = parsed_url.netloc.lower()
        return "amazon." in netloc or "amzn." in netloc
    
    def handle(self, url: str, parsed_url) -> Dict[str, Optional[str]]:
        data = {}
        
        # Try to extract ASIN
        asin = self._extract_asin(url)
        
        if asin:
            # Try to extract product title from URL slug
            title = self._extract_title_from_url(url, parsed_url)
            if title:
                data["title"] = title
            else:
                data["title"] = "Amazon Product"
            
            # Provide multiple image URL options - the scraper will validate them
            # Try high-res first, then medium-res as fallback
            data["image_url"] = f"https://images-na.ssl-images-amazon.com/images/P/{asin}.01.LZZZZZZZ.jpg"
            # Alternative formats stored as metadata for potential fallback
            data["_amazon_image_alternatives"] = [
                f"https://images-na.ssl-images-amazon.com/images/P/{asin}.01.MAIN._SCLZZZZZZZ_.jpg",
                f"https://m.media-amazon.com/images/I/{asin}.jpg",
                f"https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN={asin}&Format=_SL250_",
            ]
        
        return data
    
    def _extract_asin(self, url: str) -> Optional[str]:
        """Extract Amazon ASIN from URL.
        
        Amazon Standard Identification Numbers (ASINs) are 10-character alphanumeric IDs.
        Product ASINs typically start with 'B' followed by 9 alphanumeric characters.
        Examples: B08N5WRWNW, B0CL61F39G
        """
        # Pattern: /dp/ASIN or /gp/product/ASIN or /d/ASIN
        # Matches common Amazon URL formats with ASIN after path segment
        match = re.search(r"/(dp|gp/product|d)/(B[A-Z0-9]{9})", url)
        if match:
            return match.group(2)
        
        # Pattern: /ASIN in path (for shorter URLs)
        # Verifies it starts with 'B' and is exactly 10 characters
        match = re.search(r"/([A-Z0-9]{10})(?:[/?]|$)", url)
        if match and match.group(1).startswith("B"):
            return match.group(1)
        
        return None
    
    def _extract_title_from_url(self, url: str, parsed_url) -> Optional[str]:
        """Extract product title from URL slug.
        
        Amazon URLs often contain the product name in the path:
        https://www.amazon.com/Product-Name-Here/dp/B08N5WRWNW
        """
        path = parsed_url.path
        
        # Split path and look for the product name segment before /dp/ or /gp/
        # Common patterns:
        # /Product-Name/dp/ASIN
        # /Product-Name-Here/dp/ASIN/ref=...
        # /gp/product/ASIN?keywords=Product+Name
        
        # Try to find the segment before /dp/ or /gp/
        match = re.search(r'/([^/]+)/(dp|gp/product|d)/', path)
        if match:
            slug = match.group(1)
            # Clean up the slug
            title = self._clean_product_slug(slug)
            if title and len(title) > 3:
                return title
        
        # Alternative: look for product name in the first path segment after domain
        parts = [p for p in path.split('/') if p and p not in ['dp', 'gp', 'product', 'd']]
        if parts and len(parts) > 0:
            # First non-ASIN part is likely the product name
            first_part = parts[0]
            # Check if it's not an ASIN itself
            if not re.match(r'^B[A-Z0-9]{9}$', first_part):
                title = self._clean_product_slug(first_part)
                if title and len(title) > 3:
                    return title
        
        return None
    
    def _clean_product_slug(self, slug: str) -> str:
        """Clean Amazon product URL slug to make it readable.
        
        Amazon slugs use hyphens to separate words.
        Example: 'PlayStation-5-Console' -> 'PlayStation 5 Console'
        """
        # Replace hyphens with spaces
        title = slug.replace('-', ' ')
        
        # Replace underscores with spaces
        title = title.replace('_', ' ')
        
        # Remove URL encoding artifacts
        title = title.replace('+', ' ')
        
        # Decode common URL encodings
        try:
            title = urllib.parse.unquote(title)
        except (UnicodeDecodeError, ValueError, AttributeError):
            # If URL decoding fails, use the title as-is
            pass
        
        # Remove multiple spaces
        title = re.sub(r'\s+', ' ', title)
        
        # Capitalize appropriately - title case for better readability
        # But preserve all-caps words (like brand names)
        words = title.split()
        cleaned_words = []
        for word in words:
            if word.isupper() and len(word) > 1:
                # Keep all-caps words as is (likely acronyms or brand names)
                cleaned_words.append(word)
            elif len(word) > 0:
                # Title case for normal words
                cleaned_words.append(word[0].upper() + word[1:].lower())
        
        title = ' '.join(cleaned_words)
        
        # Truncate if too long
        if len(title) > 100:
            title = title[:97] + "..."
        
        return title.strip()


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


class EbayHandler(SpecialDomainHandler):
    """Handler for eBay product URLs."""
    
    def can_handle(self, url: str, parsed_url) -> bool:
        netloc = parsed_url.netloc.lower()
        return "ebay." in netloc
    
    def handle(self, url: str, parsed_url) -> Dict[str, Optional[str]]:
        data = {}
        path = parsed_url.path
        
        # Try to extract title from URL slug
        # eBay URLs often have format: /itm/Product-Name-Here/itemId
        match = re.search(r'/itm/([^/]+)', path)
        if match:
            slug = match.group(1)
            # Clean the slug (similar to Amazon)
            title = self._clean_slug(slug)
            if title and len(title) > 3:
                data["title"] = title
            else:
                data["title"] = "eBay Listing"
        else:
            data["title"] = "eBay Listing"
        
        return data
    
    def _clean_slug(self, slug: str) -> str:
        """Clean eBay product slug."""
        # Remove item ID if present (usually numeric)
        slug = re.sub(r'/?\d{10,}.*$', '', slug)
        
        # Replace hyphens and underscores with spaces
        title = slug.replace('-', ' ').replace('_', ' ')
        title = title.replace('+', ' ')
        
        # Decode URL encoding
        try:
            title = urllib.parse.unquote(title)
        except (UnicodeDecodeError, ValueError, AttributeError):
            # If URL decoding fails, use the title as-is
            pass
        
        # Remove multiple spaces
        title = re.sub(r'\s+', ' ', title)
        
        # Title case
        title = title.title()
        
        # Truncate if too long
        if len(title) > 100:
            title = title[:97] + "..."
        
        return title.strip()


class EtsyHandler(SpecialDomainHandler):
    """Handler for Etsy product URLs."""
    
    def can_handle(self, url: str, parsed_url) -> bool:
        netloc = parsed_url.netloc.lower()
        return "etsy.com" in netloc
    
    def handle(self, url: str, parsed_url) -> Dict[str, Optional[str]]:
        data = {}
        path = parsed_url.path
        
        # Etsy URLs: /listing/listingId/product-name-here
        match = re.search(r'/listing/\d+/([^/?]+)', path)
        if match:
            slug = match.group(1)
            title = self._clean_slug(slug)
            if title and len(title) > 3:
                data["title"] = title
            else:
                data["title"] = "Etsy Listing"
        else:
            data["title"] = "Etsy Listing"
        
        return data
    
    def _clean_slug(self, slug: str) -> str:
        """Clean Etsy product slug."""
        # Replace hyphens with spaces
        title = slug.replace('-', ' ').replace('_', ' ')
        
        # Decode URL encoding
        try:
            title = urllib.parse.unquote(title)
        except (UnicodeDecodeError, ValueError, AttributeError):
            # If URL decoding fails, use the title as-is
            pass
        
        # Remove multiple spaces
        title = re.sub(r'\s+', ' ', title)
        
        # Title case
        title = title.title()
        
        # Truncate if too long
        if len(title) > 100:
            title = title[:97] + "..."
        
        return title.strip()


class AliExpressHandler(SpecialDomainHandler):
    """Handler for AliExpress product URLs."""
    
    def can_handle(self, url: str, parsed_url) -> bool:
        netloc = parsed_url.netloc.lower()
        return "aliexpress" in netloc or "1688.com" in netloc
    
    def handle(self, url: str, parsed_url) -> Dict[str, Optional[str]]:
        data = {}
        
        # Try to extract from URL parameters (AliExpress often uses query params)
        from urllib.parse import parse_qs
        query = parse_qs(parsed_url.query)
        
        # Look for title in SearchText or keywords parameter
        for param in ['SearchText', 'keywords', 'title']:
            if param in query and query[param]:
                title = query[param][0]
                if title and len(title) > 3:
                    data["title"] = title[:100]
                    return data
        
        # Fallback to generic title
        data["title"] = "AliExpress Product"
        
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
            EbayHandler(),
            EtsyHandler(),
            AliExpressHandler(),
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
