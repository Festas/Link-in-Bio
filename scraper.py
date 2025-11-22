import re
import httpx
import json
import random
import asyncio
import os
import time
import logging
import warnings
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse, urlunparse

# Import modular components
from scraper_extractors import ExtractorChain
from scraper_utils import URLNormalizer, TitleCleaner, ImageURLValidator
from scraper_domains import SpecialDomainRouter

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
        
        # Initialize modular components
        self.extractor_chain = ExtractorChain()
        self.url_normalizer = URLNormalizer()
        self.title_cleaner = TitleCleaner()
        self.image_validator = ImageURLValidator()
        self.domain_router = SpecialDomainRouter()

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
        """Clean and normalize URL."""
        return self.url_normalizer.normalize(url)

    def _get_cache_key(self, url: str) -> str:
        """Generate cache key for URL."""
        return url.strip().lower()

    def _get_from_cache(self, url: str) -> dict | None:
        """Get cached scrape result if still valid."""
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
        key = self._get_cache_key(url)
        self._cache[key] = (data.copy(), time.time())
        # Simple cache size limit - keep only last 1000 entries
        if len(self._cache) > 1000:
            # Remove oldest entries
            sorted_items = sorted(self._cache.items(), key=lambda x: x[1][1])
            for old_key, _ in sorted_items[:100]:
                del self._cache[old_key]

    def extract_asin(self, text: str) -> str | None:
        """Extract Amazon ASIN - delegated to AmazonHandler in domains module."""
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
        """Extract structured data from JSON-LD scripts - now handled by ExtractorChain."""
        # Keep this method for backward compatibility but delegate to new implementation
        return self.extractor_chain.extractors[0].extract(soup, "")

    def search_duckduckgo_title(self, query_url: str) -> str | None:
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query_url, max_results=1))
                if results:
                    title = results[0].get("title", "")
                    return re.split(r" [:|] ", title)[0]
        except Exception as e:
            # DuckDuckGo search can fail for many reasons, just log and return None
            logger.debug(f"DuckDuckGo search failed: {e}")
            pass
        return None

    def get_google_favicon(self, domain: str) -> str:
        return f"https://www.google.com/s2/favicons?domain={domain}&sz=128"

    async def validate_image_url(self, url: str) -> bool:
        """Check if image URL is valid and accessible."""
        if not url:
            return False
        
        # Skip validation for known-good image services
        if self.image_validator.is_trusted_domain(url):
            logger.debug(f"Skipping validation for trusted domain: {urlparse(url).netloc}")
            return True
        
        # Skip bad patterns
        if self.image_validator.should_skip(url):
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
        """Extract all available metadata - now handled by ExtractorChain."""
        # Use the comprehensive extractor chain
        return self.extractor_chain.extract(soup, base_url)

    async def scrape(self, raw_url: str) -> dict:
        """Main scraping method with comprehensive fallbacks and error handling."""
        url = self.clean_url(raw_url)
        
        # Validate URL
        if not self.url_normalizer.is_valid(url):
            logger.warning(f"Invalid URL: {url}")
            domain = self.url_normalizer.get_domain(url)
            return {
                "title": domain,
                "image_url": self.image_validator.get_fallback_image(url),
                "url": url
            }
        
        # Check cache first
        cached = self._get_from_cache(url)
        if cached:
            return cached
        
        parsed = urlparse(url)
        domain = self.url_normalizer.get_domain(url)
        data = {"title": domain, "image_url": None, "url": url}

        # Check for special domain handling
        special_data = self.domain_router.handle(url)
        if special_data:
            data.update(special_data)
            # Still try to scrape for better data, but we have fallback
        
        # Try to fetch and parse the page
        try:
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
        except Exception as e:
            logger.error(f"Scraping failed for {url}: {e}", exc_info=True)

        # Apply intelligent fallbacks
        await self._apply_fallbacks(data, domain)
        
        # Cache the result
        self._save_to_cache(url, data)
        
        return data

    def _handle_special_domains(self, url: str, parsed, domain: str) -> dict:
        """Handle special cases for well-known domains - now delegated to SpecialDomainRouter."""
        return self.domain_router.handle(url)

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
        
        # Use the comprehensive extractor chain
        metadata = self.extract_metadata(soup, data["url"])
        
        # Update data with extracted metadata
        if metadata.get("title"):
            data["title"] = metadata["title"]
        if metadata.get("image_url"):
            data["image_url"] = metadata["image_url"]
        if metadata.get("description"):
            data["description"] = metadata["description"]

    async def _apply_fallbacks(self, data, domain):
        """Apply intelligent fallbacks to ensure we always have usable data."""
        # Clean the title using TitleCleaner
        if data.get("title"):
            data["title"] = self.title_cleaner.clean(data["title"])
        
        # Check if title is bad and needs fallback
        if self.title_cleaner.is_bad_title(data.get("title", ""), domain):
            # Try DuckDuckGo search as fallback
            ddg = self.search_duckduckgo_title(data["url"])
            if ddg:
                data["title"] = self.title_cleaner.clean(ddg)
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
            data["image_url"] = self.image_validator.get_fallback_image(data["url"])

    def get_google_favicon(self, domain: str) -> str:
        """Get Google favicon URL for domain - kept for backward compatibility."""
        return f"https://www.google.com/s2/favicons?domain={domain}&sz=128"


scraper = SmartScraper()
