"""
Utility functions for the web scraper.
Handles URL normalization, validation, and cleaning.
"""

import re
import logging
from typing import Optional
from urllib.parse import urlparse, urlunparse, urljoin

logger = logging.getLogger(__name__)


class URLNormalizer:
    """Handles URL normalization and cleaning."""
    
    @staticmethod
    def normalize(url: str) -> str:
        """Normalize URL to ensure consistency."""
        if not url:
            return url
        
        # Strip whitespace
        url = url.strip()
        
        # Add https:// if no scheme
        if not url.startswith(('http://', 'https://', 'ftp://')):
            url = 'https://' + url
        
        try:
            parsed = urlparse(url)
            
            # Convert to lowercase domain
            netloc = parsed.netloc.lower()
            
            # Remove default ports
            if netloc.endswith(':80') or netloc.endswith(':443'):
                netloc = netloc.rsplit(':', 1)[0]
            
            # Remove trailing slash from path if it's just "/"
            path = parsed.path
            if path == '/':
                path = ''
            
            # Rebuild URL
            normalized = urlunparse((
                parsed.scheme,
                netloc,
                path,
                parsed.params,
                parsed.query,
                parsed.fragment
            ))
            
            return normalized
            
        except Exception as e:
            logger.warning(f"URL normalization failed for {url}: {e}")
            return url
    
    @staticmethod
    def is_valid(url: str) -> bool:
        """Check if URL is valid and accessible."""
        if not url:
            return False
        
        try:
            parsed = urlparse(url)
            
            # Must have scheme and netloc
            if not parsed.scheme or not parsed.netloc:
                return False
            
            # Must be http or https
            if parsed.scheme not in ['http', 'https']:
                return False
            
            # Basic domain validation
            if '.' not in parsed.netloc:
                return False
            
            return True
            
        except Exception:
            return False
    
    @staticmethod
    def get_domain(url: str) -> str:
        """Extract domain from URL."""
        try:
            parsed = urlparse(url)
            # Remove www. and get first part
            domain = parsed.netloc.replace("www.", "")
            # Get first part before TLD
            parts = domain.split('.')
            if parts:
                return parts[0].capitalize()
            return domain.capitalize()
        except Exception:
            return "Unknown"


class TitleCleaner:
    """Handles title cleaning and normalization."""
    
    # Common separators used in titles
    SEPARATORS = [" | ", " - ", " – ", " — ", " :: ", " • ", " / "]
    
    # Patterns to remove from titles
    REMOVE_PATTERNS = [
        r"(?i)^\s*steam workshop:+\s*",  # Steam Workshop prefix
        r"\s*[\|\-–—]\s*$",  # Trailing separators
    ]
    
    # Common site names to remove (when appearing after separator)
    COMMON_SITES = [
        "facebook", "twitter", "instagram", "linkedin", "youtube",
        "reddit", "pinterest", "tumblr", "medium", "github",
        "stackoverflow", "amazon", "ebay", "wikipedia"
    ]
    
    @staticmethod
    def clean(title: str) -> str:
        """Clean and normalize title."""
        if not title or not isinstance(title, str):
            return title
        
        # Remove known patterns
        for pattern in TitleCleaner.REMOVE_PATTERNS:
            title = re.sub(pattern, "", title)
        
        # Remove site names after separators
        for separator in TitleCleaner.SEPARATORS:
            if separator in title:
                parts = title.split(separator)
                
                # If we have multiple parts, try to identify the best one
                if len(parts) > 1:
                    # Check if last part is a common site name
                    if any(site in parts[-1].lower() for site in TitleCleaner.COMMON_SITES):
                        # Remove last part
                        title = separator.join(parts[:-1])
                    else:
                        # Take the longest part (usually the actual title)
                        title = max(parts, key=len)
                    break
        
        # Trim whitespace
        title = title.strip()
        
        # Remove multiple spaces
        title = re.sub(r'\s+', ' ', title)
        
        # Truncate very long titles
        if len(title) > 200:
            title = title[:197] + "..."
        
        # Decode HTML entities
        try:
            import html
            title = html.unescape(title)
        except Exception:
            pass
        
        return title
    
    @staticmethod
    def is_bad_title(title: str, domain: str) -> bool:
        """Check if title is likely a bad/generic title."""
        if not title:
            return True
        
        title_lower = title.lower()
        
        # Bad title indicators
        bad_indicators = [
            "robot check", "captcha", "access denied", "error",
            "404", "not found", "forbidden", "503", "500",
            "attention required", "challenge", "please wait",
            "just a moment", "checking your browser"
        ]
        
        # Check if title matches domain only
        if title.lower() == domain.lower():
            return True
        
        # Check for bad indicators
        if any(indicator in title_lower for indicator in bad_indicators):
            return True
        
        # Check if title is too short (likely not meaningful)
        if len(title.strip()) < 3:
            return True
        
        return False


class ImageURLValidator:
    """Validates and filters image URLs."""
    
    # Skip patterns for images
    SKIP_PATTERNS = [
        "data:image",  # Data URIs (too long, not useful)
        "icon", "logo", "pixel", "tracking", "1x1",
        "badge", "button", "avatar", "sprite", "spacer",
        "blank", "placeholder", "loading"
    ]
    
    # Trusted domains that don't need validation
    TRUSTED_DOMAINS = [
        'opengraph.githubassets.com',
        'images-na.ssl-images-amazon.com',
        'og.image',
        'graph.facebook.com',
        'pbs.twimg.com',
        'i.ytimg.com',
        'www.google.com/s2/favicons',
        'cdn.discordapp.com',
        'steamcdn-a.akamaihd.net',
    ]
    
    @staticmethod
    def should_skip(url: str) -> bool:
        """Check if image URL should be skipped."""
        if not url:
            return True
        
        url_lower = url.lower()
        
        # Check skip patterns
        if any(pattern in url_lower for pattern in ImageURLValidator.SKIP_PATTERNS):
            return True
        
        # Data URIs are too long and not useful
        if url.startswith('data:'):
            return True
        
        return False
    
    @staticmethod
    def is_trusted_domain(url: str) -> bool:
        """Check if URL is from a trusted domain."""
        try:
            parsed = urlparse(url)
            return any(domain in parsed.netloc for domain in ImageURLValidator.TRUSTED_DOMAINS)
        except Exception:
            return False
    
    @staticmethod
    def get_fallback_image(url: str) -> str:
        """Get fallback image (Google favicon) for a URL."""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc
            return f"https://www.google.com/s2/favicons?domain={domain}&sz=128"
        except Exception:
            return "https://www.google.com/s2/favicons?domain=example.com&sz=128"
