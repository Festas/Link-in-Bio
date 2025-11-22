"""
Modular metadata extractors for the web scraper.
Each extractor is responsible for one specific metadata format.
"""

import json
import logging
from typing import Dict, Optional, List, Any
from bs4 import BeautifulSoup
from urllib.parse import urljoin

logger = logging.getLogger(__name__)


class BaseExtractor:
    """Base class for all metadata extractors."""
    
    def extract(self, soup: BeautifulSoup, base_url: str) -> Dict[str, Any]:
        """Extract metadata from the page. Returns dict with title, image_url, description."""
        raise NotImplementedError


class JSONLDExtractor(BaseExtractor):
    """Extract structured data from JSON-LD scripts."""
    
    SUPPORTED_TYPES = [
        "Product", "Article", "NewsArticle", "BlogPosting",
        "WebPage", "WebSite", "Organization", "Person",
        "VideoObject", "ImageObject", "Event", "Recipe",
        "Book", "Movie", "MusicRecording", "SoftwareApplication"
    ]
    
    def extract(self, soup: BeautifulSoup, base_url: str) -> Dict[str, Any]:
        """Extract all JSON-LD structured data with comprehensive type support."""
        data = {}
        scripts = soup.find_all("script", type="application/ld+json")
        
        for script in scripts:
            try:
                if not script.string:
                    continue
                    
                content = json.loads(script.string)
                items = content if isinstance(content, list) else [content]
                
                for item in items:
                    extracted = self._extract_from_item(item, base_url)
                    
                    # Update data if we got better info
                    if extracted.get("title") and not data.get("title"):
                        data["title"] = extracted["title"]
                    if extracted.get("image_url") and not data.get("image_url"):
                        data["image_url"] = extracted["image_url"]
                    if extracted.get("description") and not data.get("description"):
                        data["description"] = extracted["description"]
                    
                    # Prioritize Product and Article types
                    item_type = item.get("@type", "")
                    if isinstance(item_type, list):
                        item_type = item_type[0]
                    if item_type in ["Product", "Article"] and data.get("title"):
                        return data
                        
            except (json.JSONDecodeError, KeyError, TypeError, AttributeError) as e:
                logger.debug(f"Error parsing JSON-LD: {e}")
                continue
                
        return data
    
    def _extract_from_item(self, item: Dict, base_url: str) -> Dict[str, Any]:
        """Extract data from a single JSON-LD item."""
        data = {}
        
        # Check if this is a supported type
        item_type = item.get("@type", "")
        if isinstance(item_type, list):
            item_type = item_type[0]
        
        if item_type not in self.SUPPORTED_TYPES:
            return data
        
        # Extract title (multiple possible fields)
        for title_field in ["name", "headline", "title", "alternateName"]:
            title = item.get(title_field)
            if title and isinstance(title, str):
                data["title"] = title.strip()
                break
        
        # Extract image with comprehensive handling
        img = item.get("image") or item.get("logo") or item.get("thumbnail")
        if img:
            image_url = self._extract_image_url(img, base_url)
            if image_url:
                data["image_url"] = image_url
        
        # Extract description
        for desc_field in ["description", "abstract", "summary"]:
            desc = item.get(desc_field)
            if desc and isinstance(desc, str):
                data["description"] = desc.strip()
                break
        
        return data
    
    def _extract_image_url(self, img: Any, base_url: str) -> Optional[str]:
        """Extract image URL from various JSON-LD image formats."""
        if isinstance(img, str):
            return urljoin(base_url, img)
        elif isinstance(img, list) and img:
            # Get first valid image
            first_img = img[0]
            if isinstance(first_img, str):
                return urljoin(base_url, first_img)
            elif isinstance(first_img, dict):
                url = first_img.get("url") or first_img.get("contentUrl")
                if url:
                    return urljoin(base_url, url)
        elif isinstance(img, dict):
            url = img.get("url") or img.get("contentUrl") or img.get("@id")
            if url:
                return urljoin(base_url, url)
        return None


class OpenGraphExtractor(BaseExtractor):
    """Extract Open Graph protocol metadata."""
    
    def extract(self, soup: BeautifulSoup, base_url: str) -> Dict[str, Any]:
        """Extract all Open Graph tags."""
        data = {}
        
        # Primary OG tags
        og_title = soup.find("meta", property="og:title")
        og_image = soup.find("meta", property="og:image")
        og_desc = soup.find("meta", property="og:description")
        og_site_name = soup.find("meta", property="og:site_name")
        
        if og_title and og_title.get("content"):
            data["title"] = og_title["content"].strip()
        
        if og_image and og_image.get("content"):
            data["image_url"] = urljoin(base_url, og_image["content"])
        
        if og_desc and og_desc.get("content"):
            data["description"] = og_desc["content"].strip()
        
        if og_site_name and og_site_name.get("content"):
            data["site_name"] = og_site_name["content"].strip()
        
        # Try alternative image tags if main one is missing
        if not data.get("image_url"):
            for prop in ["og:image:url", "og:image:secure_url"]:
                img_tag = soup.find("meta", property=prop)
                if img_tag and img_tag.get("content"):
                    data["image_url"] = urljoin(base_url, img_tag["content"])
                    break
        
        return data


class TwitterCardExtractor(BaseExtractor):
    """Extract Twitter Card metadata."""
    
    def extract(self, soup: BeautifulSoup, base_url: str) -> Dict[str, Any]:
        """Extract all Twitter Card tags."""
        data = {}
        
        # Try both name and property attributes (some sites use both)
        for attr in ["name", "property"]:
            if not data.get("title"):
                tw_title = soup.find("meta", attrs={attr: "twitter:title"})
                if tw_title and tw_title.get("content"):
                    data["title"] = tw_title["content"].strip()
            
            if not data.get("image_url"):
                tw_image = soup.find("meta", attrs={attr: "twitter:image"})
                if tw_image and tw_image.get("content"):
                    data["image_url"] = urljoin(base_url, tw_image["content"])
            
            if not data.get("description"):
                tw_desc = soup.find("meta", attrs={attr: "twitter:description"})
                if tw_desc and tw_desc.get("content"):
                    data["description"] = tw_desc["content"].strip()
        
        # Try alternative image tags
        if not data.get("image_url"):
            for name in ["twitter:image:src", "twitter:image0"]:
                for attr in ["name", "property"]:
                    img_tag = soup.find("meta", attrs={attr: name})
                    if img_tag and img_tag.get("content"):
                        data["image_url"] = urljoin(base_url, img_tag["content"])
                        break
                if data.get("image_url"):
                    break
        
        return data


class HTMLMetaExtractor(BaseExtractor):
    """Extract standard HTML meta tags."""
    
    def extract(self, soup: BeautifulSoup, base_url: str) -> Dict[str, Any]:
        """Extract standard meta tags and HTML elements."""
        data = {}
        
        # Title tag
        if soup.title and soup.title.string:
            data["title"] = soup.title.string.strip()
        
        # Meta description
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and meta_desc.get("content"):
            data["description"] = meta_desc["content"].strip()
        
        # Alternative description sources
        if not data.get("description"):
            for name in ["Description", "DESCRIPTION", "abstract"]:
                meta = soup.find("meta", attrs={"name": name})
                if meta and meta.get("content"):
                    data["description"] = meta["content"].strip()
                    break
        
        # Try to find images from various sources
        images = []
        
        # Apple touch icon (often high quality)
        apple_icon = soup.find("link", rel="apple-touch-icon")
        if apple_icon and apple_icon.get("href"):
            images.append(urljoin(base_url, apple_icon["href"]))
        
        # Favicon (larger versions)
        for size in ["192x192", "180x180", "152x152", "144x144", "120x120"]:
            icon = soup.find("link", rel="icon", attrs={"sizes": size})
            if icon and icon.get("href"):
                images.append(urljoin(base_url, icon["href"]))
                break
        
        # Look for meta image tags
        for name in ["image", "thumbnail", "msapplication-TileImage"]:
            meta_img = soup.find("meta", attrs={"name": name})
            if meta_img and meta_img.get("content"):
                images.append(urljoin(base_url, meta_img["content"]))
        
        # Look for link image tags
        for rel in ["image_src", "image"]:
            link_img = soup.find("link", rel=rel)
            if link_img and link_img.get("href"):
                images.append(urljoin(base_url, link_img["href"]))
        
        if images:
            data["image_url"] = images[0]
        
        return data


class ContentImageExtractor(BaseExtractor):
    """Extract images from page content intelligently."""
    
    def extract(self, soup: BeautifulSoup, base_url: str) -> Dict[str, Any]:
        """Find the best image from page content."""
        data = {}
        
        # Skip patterns (icons, logos, tracking pixels, etc.)
        skip_patterns = [
            "icon", "logo", "pixel", "tracking", "1x1", "badge", "button",
            "avatar", "profile", "thumbnail", "sprite", "spacer", "blank",
            "ad", "banner", "header", "footer", "sidebar"
        ]
        
        # Prioritized selectors for finding main images
        selectors = [
            # Article/content images
            'article img[src]',
            '[role="main"] img[src]',
            '.content img[src]',
            '.article img[src]',
            '.post img[src]',
            # Featured images
            '.featured-image img[src]',
            '.hero-image img[src]',
            '[class*="hero"] img[src]',
            '[class*="featured"] img[src]',
            # OG image in body (some sites do this)
            'img[property="og:image"]',
            # Any large images
            'img[src]'
        ]
        
        for selector in selectors:
            images = soup.select(selector)
            
            for img in images:
                src = img.get("src") or img.get("data-src") or img.get("data-lazy-src")
                if not src:
                    continue
                
                # Skip if matches skip patterns
                if any(pattern in src.lower() for pattern in skip_patterns):
                    continue
                
                # Check image size if available
                width = img.get("width")
                height = img.get("height")
                
                if width and height:
                    try:
                        w = int(str(width).replace("px", ""))
                        h = int(str(height).replace("px", ""))
                        # Skip small images (likely icons/logos)
                        if w < 200 or h < 200:
                            continue
                        # Skip very wide/tall images (likely banners)
                        if w / h > 4 or h / w > 4:
                            continue
                    except (ValueError, TypeError, ZeroDivisionError):
                        # Can't parse dimensions, continue anyway
                        pass
                
                # Found a good candidate
                data["image_url"] = urljoin(base_url, src)
                return data
        
        return data


class MicrodataExtractor(BaseExtractor):
    """Extract HTML5 Microdata."""
    
    def extract(self, soup: BeautifulSoup, base_url: str) -> Dict[str, Any]:
        """Extract microdata from itemscope elements."""
        data = {}
        
        # Find all itemscope elements
        items = soup.find_all(attrs={"itemscope": True})
        
        for item in items:
            item_type = item.get("itemtype", "")
            
            # Look for Product, Article, etc.
            if any(t in item_type for t in ["Product", "Article", "WebPage", "Organization"]):
                # Extract name
                name_elem = item.find(attrs={"itemprop": "name"})
                if name_elem and not data.get("title"):
                    data["title"] = name_elem.get_text(strip=True) or name_elem.get("content")
                
                # Extract image
                img_elem = item.find(attrs={"itemprop": "image"})
                if img_elem and not data.get("image_url"):
                    img_url = img_elem.get("src") or img_elem.get("content") or img_elem.get("href")
                    if img_url:
                        data["image_url"] = urljoin(base_url, img_url)
                
                # Extract description
                desc_elem = item.find(attrs={"itemprop": "description"})
                if desc_elem and not data.get("description"):
                    data["description"] = desc_elem.get_text(strip=True) or desc_elem.get("content")
        
        return data


class ExtractorChain:
    """Chains multiple extractors to get the best possible metadata."""
    
    def __init__(self):
        self.extractors = [
            JSONLDExtractor(),
            OpenGraphExtractor(),
            TwitterCardExtractor(),
            MicrodataExtractor(),
            HTMLMetaExtractor(),
            ContentImageExtractor(),
        ]
    
    def extract(self, soup: BeautifulSoup, base_url: str) -> Dict[str, Any]:
        """Run all extractors and merge results intelligently."""
        result = {
            "title": None,
            "image_url": None,
            "description": None,
        }
        
        for extractor in self.extractors:
            try:
                extracted = extractor.extract(soup, base_url)
                
                # Update fields if we don't have them yet
                if not result.get("title") and extracted.get("title"):
                    result["title"] = extracted["title"]
                    logger.debug(f"Title extracted by {extractor.__class__.__name__}: {result['title']}")
                
                if not result.get("image_url") and extracted.get("image_url"):
                    result["image_url"] = extracted["image_url"]
                    logger.debug(f"Image extracted by {extractor.__class__.__name__}: {result['image_url']}")
                
                if not result.get("description") and extracted.get("description"):
                    result["description"] = extracted["description"]
                    logger.debug(f"Description extracted by {extractor.__class__.__name__}")
                
                # If we have all three, we can stop early
                if result.get("title") and result.get("image_url") and result.get("description"):
                    break
                    
            except Exception as e:
                logger.warning(f"Extractor {extractor.__class__.__name__} failed for {base_url}: {e}")
                continue
        
        return result
