import re
import httpx
import json
import random
import asyncio
import os
import logging
import warnings
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse, urlunparse

try:
    from ddgs import DDGS
except ImportError:
    # Fallback to old package name if ddgs not available
    from duckduckgo_search import DDGS

# Warnung unterdrücken
warnings.filterwarnings("ignore", category=RuntimeWarning, module="duckduckgo_search")
warnings.filterwarnings("ignore", category=RuntimeWarning, module="ddgs")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- SAFE IMPORT für curl_cffi ---
# Verhindert Server-Absturz, falls die Library im Container zickt
HAS_CURL_CFFI = False
try:
    from curl_cffi.requests import AsyncSession

    HAS_CURL_CFFI = True
except ImportError:
    logger.warning("curl_cffi konnte nicht geladen werden. Nutze Standard-HTTP.")
except Exception as e:
    logger.warning(f"curl_cffi Fehler: {e}. Nutze Standard-HTTP.")


class SmartScraper:
    def __init__(self):
        self.impersonate = "chrome120"
        # Expanded UA pool for better rotation
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
            "Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Mobile Safari/537.36",
        ]
        # Configurable values via env
        self.max_retries = int(os.getenv("SCRAPER_MAX_RETRIES", "5"))
        self.backoff_base = float(os.getenv("SCRAPER_BACKOFF_BASE", "0.5"))
        self.backoff_cap = float(os.getenv("SCRAPER_BACKOFF_CAP", "10"))
        # whether to verify TLS certs (default True) - some containers disable verify
        self.verify_tls = os.getenv("SCRAPER_VERIFY_TLS", "true").lower() not in ("0", "false", "no")
        # Simple in-memory cache for scrape results
        self._cache = {}
        self._cache_ttl = int(os.getenv("SCRAPER_CACHE_TTL", "3600"))  # 1 hour default

    def get_headers(self):
        return {
            "User-Agent": random.choice(self.user_agents),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            # Some sites look for a plausible viewport origin
            "Sec-CH-UA-Mobile": "?0",
        }

    def clean_url(self, url: str) -> str:
        try:
            return url.strip()
        except:
            return url

    def _get_cache_key(self, url: str) -> str:
        """Generate cache key for URL."""
        return url.strip().lower()

    def _get_from_cache(self, url: str) -> dict | None:
        """Get cached scrape result if still valid."""
        import time
        key = self._get_cache_key(url)
        if key in self._cache:
            cached_data, timestamp = self._cache[key]
            if time.time() - timestamp < self._cache_ttl:
                logger.info(f"[scraper] cache hit for {url}")
                return cached_data.copy()
            else:
                # Expired, remove it
                del self._cache[key]
        return None

    def _save_to_cache(self, url: str, data: dict):
        """Save scrape result to cache."""
        import time
        key = self._get_cache_key(url)
        self._cache[key] = (data.copy(), time.time())
        # Simple cache size limit - keep only last 1000 entries
        if len(self._cache) > 1000:
            # Remove oldest entries
            sorted_items = sorted(self._cache.items(), key=lambda x: x[1][1])
            for old_key, _ in sorted_items[:100]:
                del self._cache[old_key]

    def extract_asin(self, text: str) -> str | None:
        match = re.search(r"/(dp|gp/product|d)/(B[A-Z0-9]{9})", text)
        if match:
            return match.group(2)
        match = re.search(r"/([A-Z0-9]{10})(?:[/?]|$)", text)
        if match and match.group(1).startswith("B"):
            return match.group(1)
        match = re.search(r'(?:name|id)="ASIN" value="(B[A-Z0-9]{9})"', text)
        if match:
            return match.group(1)
        return None

    def extract_json_ld(self, soup) -> dict:
        """Extract structured data from JSON-LD scripts with improved handling."""
        data = {}
        scripts = soup.find_all("script", type="application/ld+json")
        for script in scripts:
            try:
                if not script.string:
                    continue
                content = json.loads(script.string)
                items = content if isinstance(content, list) else [content]
                for item in items:
                    item_type = item.get("@type", "")
                    if isinstance(item_type, list):
                        item_type = item_type[0]
                    if item_type in ["Product", "Article", "NewsArticle", "WebPage", "WebSite"]:
                        # Extract title/name/headline
                        title = item.get("name") or item.get("headline") or item.get("title")
                        if title and not data.get("title"):
                            data["title"] = title
                        # Extract image with better handling
                        img = item.get("image")
                        if img and not data.get("image_url"):
                            if isinstance(img, str):
                                data["image_url"] = img
                            elif isinstance(img, list) and img:
                                # Get first valid image
                                first_img = img[0]
                                if isinstance(first_img, str):
                                    data["image_url"] = first_img
                                elif isinstance(first_img, dict):
                                    data["image_url"] = first_img.get("url") or first_img.get("contentUrl")
                            elif isinstance(img, dict):
                                data["image_url"] = img.get("url") or img.get("contentUrl")
                        # Extract description if available
                        desc = item.get("description")
                        if desc and not data.get("description"):
                            data["description"] = desc
                        # Prioritize Product type
                        if item_type == "Product" and data.get("title"):
                            return data
            except Exception as e:
                logger.debug(f"Error parsing JSON-LD: {e}")
                continue
        return data

    def search_duckduckgo_title(self, query_url: str) -> str | None:
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query_url, max_results=1))
                if results:
                    title = results[0].get("title", "")
                    return re.split(r" [:|] ", title)[0]
        except:
            pass
        return None

    def get_google_favicon(self, domain: str) -> str:
        return f"https://www.google.com/s2/favicons?domain={domain}&sz=128"

    async def validate_image_url(self, url: str) -> bool:
        """Check if image URL is valid and accessible."""
        if not url:
            return False
        try:
            # Quick HEAD request to check if image exists
            async with httpx.AsyncClient(timeout=5.0, follow_redirects=True, verify=self.verify_tls) as client:
                response = await client.head(url, headers=self.get_headers())
                # Check if response is successful and content-type is an image
                if response.status_code == 200:
                    content_type = response.headers.get("content-type", "").lower()
                    if any(img_type in content_type for img_type in ["image/", "application/octet-stream"]):
                        return True
        except Exception as e:
            logger.debug(f"Image validation failed for {url}: {e}")
        return False

    def extract_metadata(self, soup, base_url: str) -> dict:
        """Extract all available metadata from HTML with comprehensive fallbacks."""
        data = {}
        
        # Try Open Graph tags first (most reliable for social media sites)
        og_title = soup.find("meta", property="og:title")
        og_image = soup.find("meta", property="og:image")
        og_desc = soup.find("meta", property="og:description")
        
        if og_title and og_title.get("content"):
            data["title"] = og_title["content"].strip()
        if og_image and og_image.get("content"):
            data["image_url"] = urljoin(base_url, og_image["content"])
        if og_desc and og_desc.get("content"):
            data["description"] = og_desc["content"].strip()
        
        # Try Twitter Card tags as fallback
        if not data.get("title"):
            tw_title = soup.find("meta", attrs={"name": "twitter:title"}) or soup.find("meta", property="twitter:title")
            if tw_title and tw_title.get("content"):
                data["title"] = tw_title["content"].strip()
        
        if not data.get("image_url"):
            tw_image = soup.find("meta", attrs={"name": "twitter:image"}) or soup.find("meta", property="twitter:image")
            if tw_image and tw_image.get("content"):
                data["image_url"] = urljoin(base_url, tw_image["content"])
        
        # Try standard meta description
        if not data.get("description"):
            meta_desc = soup.find("meta", attrs={"name": "description"})
            if meta_desc and meta_desc.get("content"):
                data["description"] = meta_desc["content"].strip()
        
        # Try title tag as last resort
        if not data.get("title") and soup.title and soup.title.string:
            data["title"] = soup.title.string.strip()
        
        # Try to find a good image from various sources
        if not data.get("image_url"):
            # Try apple-touch-icon
            apple_icon = soup.find("link", rel="apple-touch-icon")
            if apple_icon and apple_icon.get("href"):
                data["image_url"] = urljoin(base_url, apple_icon["href"])
            # Try first large image in content
            elif soup.find("img"):
                for img in soup.find_all("img", limit=10):
                    src = img.get("src") or img.get("data-src")
                    if src:
                        # Skip small images, icons, tracking pixels
                        width = img.get("width")
                        height = img.get("height")
                        if width and height:
                            try:
                                if int(width) < 200 or int(height) < 200:
                                    continue
                            except:
                                pass
                        # Skip common icon/logo/tracking patterns
                        if any(x in src.lower() for x in ["icon", "logo", "pixel", "tracking", "1x1"]):
                            continue
                        data["image_url"] = urljoin(base_url, src)
                        break
        
        return data

    async def scrape(self, raw_url: str) -> dict:
        """Main scraping method with comprehensive fallbacks and error handling."""
        url = self.clean_url(raw_url)
        
        # Check cache first
        cached = self._get_from_cache(url)
        if cached:
            return cached
        
        parsed = urlparse(url)
        domain = parsed.netloc.replace("www.", "").split(".")[0].capitalize()
        data = {"title": domain, "image_url": None, "url": url}

        # Check for special domain handling
        special_data = self._handle_special_domains(url, parsed, domain)
        if special_data:
            data.update(special_data)
            # Still try to scrape for better data, but we have fallback
        
        # Entscheidung: High-End oder Standard?
        if HAS_CURL_CFFI:
            try:
                async with AsyncSession(impersonate=self.impersonate) as s:
                    r = await s.get(url, allow_redirects=True, timeout=15)
                    await self._process_response(r, data, domain)
            except Exception as e:
                logger.error(f"Browser-Scraping Fehler: {e}. Versuche Fallback...")
                await self._scrape_fallback(url, data, domain)
        else:
            await self._scrape_fallback(url, data, domain)

        # Fallbacks - now async
        await self._apply_fallbacks(data, domain)
        
        # Cache the result
        self._save_to_cache(url, data)
        
        return data

    def _handle_special_domains(self, url: str, parsed, domain: str) -> dict:
        """Handle special cases for well-known domains."""
        data = {}
        netloc = parsed.netloc.lower()
        
        # GitHub repositories
        if "github.com" in netloc:
            path_parts = parsed.path.strip("/").split("/")
            if len(path_parts) >= 2:
                data["title"] = f"{path_parts[1]} by {path_parts[0]}"
                data["image_url"] = f"https://opengraph.githubassets.com/1/{path_parts[0]}/{path_parts[1]}"
        
        # LinkedIn profiles
        elif "linkedin.com" in netloc and "/in/" in parsed.path:
            data["title"] = "LinkedIn Profile"
            data["image_url"] = "https://static.licdn.com/sc/h/al2o9zrvru7aqj8e1x2rzsrca"
        
        # Twitter/X profiles
        elif netloc in ["twitter.com", "x.com"] and parsed.path.count("/") == 1:
            username = parsed.path.strip("/")
            if username:
                data["title"] = f"@{username} on X"
        
        # Instagram profiles
        elif "instagram.com" in netloc:
            username = parsed.path.strip("/").split("/")[0]
            if username:
                data["title"] = f"@{username} on Instagram"
        
        return data

    async def _scrape_fallback(self, url, data, domain):
        """Standard httpx Scraper als Backup"""
        try:
            # polite jitter before starting
            await asyncio.sleep(random.uniform(0.1, 0.6))
            r = await self._fetch_with_retries(url)
            if r:
                await self._process_response(r, data, domain)
            else:
                logger.warning(f"Fallback scraping failed for {url}: all retries exhausted")
        except Exception as e:
            logger.error(f"Fallback scraping error for {url}: {e}", exc_info=True)

    async def _fetch_with_retries(self, url: str, max_retries: int = 4):
        """Fetch URL with retries, UA rotation, optional proxies and simple Cloudflare detection.

        - Reads `SCRAPER_PROXIES` env var (comma-separated) to try proxies if set.
        - Switches user-agent and headers each attempt.
        - Exponential backoff with jitter on transient errors and common anti-bot responses.
        Returns an httpx-like response object or None if all attempts fail.
        """
        proxies_env = os.getenv("SCRAPER_PROXIES", "")
        proxy_list = [p.strip() for p in proxies_env.split(",") if p.strip()] if proxies_env else []

        # Use configured max_retries unless overridden
        max_tries = max_retries or self.max_retries

        # Keep a local copy so we can rotate/remove failing proxies during a single fetch
        available_proxies = list(proxy_list)

        for attempt in range(1, max_tries + 1):
            headers = self.get_headers()
            parsed = urlparse(url)
            headers["Referer"] = f"{parsed.scheme}://{parsed.netloc}/"
            headers.setdefault("DNT", "1")
            headers.setdefault("Sec-Fetch-Mode", "navigate")

            proxy = None
            if available_proxies:
                proxy = random.choice(available_proxies)

            try:
                timeout = 15 + (attempt - 1) * 5
                async with httpx.AsyncClient(
                    headers=headers, trust_env=True, timeout=timeout, follow_redirects=True, verify=self.verify_tls
                ) as client:
                    if proxy:
                        # httpx accepts mapping for proxies; support both http:// and https:// proxies
                        proxy_map = {"http://": proxy, "https://": proxy}
                        r = await client.get(url, proxies=proxy_map)
                    else:
                        r = await client.get(url)

                status = getattr(r, "status_code", None) or getattr(r, "status", None)
                text = r.text or ""

                # detect common anti-bot or challenge pages using content and headers
                lowered = text.lower()
                server_hdr = (r.headers.get("server") or "").lower()
                cf_ray = r.headers.get("cf-ray") or r.headers.get("x-cf-ray")
                bot_hits = any(
                    x in lowered
                    for x in [
                        "cloudflare",
                        "attention required",
                        "captcha",
                        "are you human",
                        "robot check",
                        "please enable javascript",
                    ]
                )
                header_bot = any(x in server_hdr for x in ["cloudflare", "cloudflare-nginx"]) or bool(cf_ray)

                if status in (403, 429, 503) or bot_hits or header_bot:
                    logger.warning(
                        f"[scraper] attempt {attempt}/{max_tries} for {url} returned status {status} or bot-challenge (bot_hits={bot_hits}, header_bot={header_bot})."
                    )
                    # If proxy was used and likely flagged, drop it for this run
                    if proxy and available_proxies:
                        try:
                            available_proxies.remove(proxy)
                            logger.info(f"[scraper] removed failing proxy {proxy} from rotation (temporary)")
                        except ValueError:
                            pass

                    # Backoff with jitter
                    delay = min(self.backoff_cap, self.backoff_base * (2 ** (attempt - 1)))
                    delay = delay * (0.5 + random.random() * 0.5)
                    await asyncio.sleep(delay)
                    continue

                # successful-looking response
                logger.info(f"[scraper] success for {url} (status={status}) on attempt {attempt}")
                return r

            except Exception as e:
                logger.warning(f"[scraper] attempt {attempt}/{max_tries} for {url} failed: {e}")
                # If proxy was used, assume it might be bad and remove from available for next try
                if proxy and available_proxies:
                    try:
                        available_proxies.remove(proxy)
                        logger.info(f"[scraper] removed proxy {proxy} after exception")
                    except ValueError:
                        pass

                delay = min(self.backoff_cap, self.backoff_base * (2 ** (attempt - 1)))
                delay = delay * (0.5 + random.random() * 0.5)
                await asyncio.sleep(delay)
                continue

        logger.error(f"[scraper] all {max_tries} attempts failed for {url}")
        return None

    async def _process_response(self, r, data, domain):
        """Process HTTP response and extract all available metadata."""
        data["url"] = str(r.url)
        html = r.text

        # Amazon ASIN - special handling for Amazon
        if "amazon" in data["url"] or "amzn" in data["url"]:
            asin = self.extract_asin(data["url"]) or self.extract_asin(html)
            if asin:
                data["image_url"] = f"https://images-na.ssl-images-amazon.com/images/P/{asin}.01.MAIN._SCLZZZZZZZ_.jpg"
                data["title"] = "Amazon Produkt"

        soup = BeautifulSoup(html, "html.parser")
        
        # Try JSON-LD structured data first (most reliable)
        json_data = self.extract_json_ld(soup)
        if json_data.get("title"):
            data["title"] = json_data["title"]
        if json_data.get("image_url"):
            data["image_url"] = json_data["image_url"]
        if json_data.get("description"):
            data["description"] = json_data.get("description")

        # Extract comprehensive metadata (Open Graph, Twitter Cards, meta tags)
        metadata = self.extract_metadata(soup, data["url"])
        
        # Use metadata if we don't have good data yet
        if not data.get("title") or data["title"] in [domain, "Amazon Produkt"]:
            if metadata.get("title"):
                data["title"] = metadata["title"]
        
        if not data.get("image_url"):
            if metadata.get("image_url"):
                data["image_url"] = metadata["image_url"]
        
        if not data.get("description") and metadata.get("description"):
            data["description"] = metadata["description"]

    async def _apply_fallbacks(self, data, domain):
        """Apply intelligent fallbacks to ensure we always have usable data."""
        bad_titles = [domain, "Amazon Produkt", "Robot Check", "Captcha", "Access Denied", "Error", "404"]
        
        # Fallback for bad titles - try DuckDuckGo search
        if not data.get("title") or any(bt.lower() in data["title"].lower() for bt in bad_titles):
            ddg = self.search_duckduckgo_title(data["url"])
            if ddg:
                data["title"] = ddg
            elif not data.get("title"):
                # Last resort: use domain name as title
                data["title"] = domain

        # Validate and fallback for images
        if data.get("image_url"):
            # Validate the image URL
            is_valid = await self.validate_image_url(data["image_url"])
            if not is_valid:
                logger.info(f"Image URL validation failed for {data['image_url']}, using favicon")
                data["image_url"] = None
        
        # If no valid image, use Google favicon
        if not data["image_url"]:
            data["image_url"] = self.get_google_favicon(urlparse(data["url"]).netloc)

        # Normalize title: strip Steam Workshop prefix if present
        if data.get("title"):
            data["title"] = self._strip_steam_prefix(data["title"])
            # Also clean up common title suffixes
            data["title"] = self._clean_title(data["title"])

    def _strip_steam_prefix(self, title: str) -> str:
        """Remove leading 'Steam Workshop::' (or variants like single/double colons) from titles.

        Case-insensitive and tolerant of surrounding whitespace. Examples:
        - 'Steam Workshop:: Cool Mod' -> 'Cool Mod'
        - 'steam workshop: Another Mod' -> 'Another Mod'
        """
        if not title or not isinstance(title, str):
            return title
        # Remove leading 'Steam Workshop' followed by one or more colons and optional whitespace
        new_title = re.sub(r"(?i)^\s*steam workshop:+\s*", "", title)
        return new_title.strip()

    def _clean_title(self, title: str) -> str:
        """Clean up common title patterns and noise."""
        if not title or not isinstance(title, str):
            return title
        
        # Remove common separators and site names from end
        # e.g., "Page Title | Site Name" -> "Page Title"
        # e.g., "Page Title - Site Name" -> "Page Title"
        for separator in [" | ", " - ", " – ", " — ", " :: "]:
            if separator in title:
                parts = title.split(separator)
                # Take the longest part (usually the actual title)
                if len(parts) > 1:
                    title = max(parts, key=len).strip()
                    break
        
        # Truncate extremely long titles
        if len(title) > 200:
            title = title[:197] + "..."
        
        return title.strip()


scraper = SmartScraper()
