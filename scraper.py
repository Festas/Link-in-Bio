import re
import httpx
import json
import random
import logging
import warnings
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse, urlunparse
from duckduckgo_search import DDGS

# Warnung unterdrücken
warnings.filterwarnings("ignore", category=RuntimeWarning, module="duckduckgo_search")

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
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
        ]

    def get_headers(self):
        return {
            "User-Agent": random.choice(self.user_agents),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1"
        }

    def clean_url(self, url: str) -> str:
        try:
            return url.strip()
        except: return url

    def extract_asin(self, text: str) -> str | None:
        match = re.search(r'/(dp|gp/product|d)/(B[A-Z0-9]{9})', text)
        if match: return match.group(2)
        match = re.search(r'/([A-Z0-9]{10})(?:[/?]|$)', text)
        if match and match.group(1).startswith('B'): return match.group(1)
        match = re.search(r'(?:name|id)="ASIN" value="(B[A-Z0-9]{9})"', text)
        if match: return match.group(1)
        return None

    def extract_json_ld(self, soup) -> dict:
        data = {}
        scripts = soup.find_all('script', type='application/ld+json')
        for script in scripts:
            try:
                if not script.string: continue
                content = json.loads(script.string)
                items = content if isinstance(content, list) else [content]
                for item in items:
                    item_type = item.get('@type', '')
                    if isinstance(item_type, list): item_type = item_type[0]
                    if item_type in ['Product', 'Article', 'NewsArticle']:
                        data['title'] = item.get('name') or item.get('headline')
                        img = item.get('image')
                        if isinstance(img, str): data['image_url'] = img
                        elif isinstance(img, list) and img: data['image_url'] = img[0]
                        elif isinstance(img, dict): data['image_url'] = img.get('url')
                        if item_type == 'Product': return data
            except: continue
        return data

    def search_duckduckgo_title(self, query_url: str) -> str | None:
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query_url, max_results=1))
                if results:
                    title = results[0].get('title', '')
                    return re.split(r' [:|] ', title)[0]
        except: pass
        return None

    def get_google_favicon(self, domain: str) -> str:
        return f"https://www.google.com/s2/favicons?domain={domain}&sz=128"

    async def scrape(self, raw_url: str) -> dict:
        url = self.clean_url(raw_url)
        parsed = urlparse(url)
        domain = parsed.netloc.replace('www.', '').split('.')[0].capitalize()
        data = { "title": domain, "image_url": None, "url": url }

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
            
        # Fallbacks
        self._apply_fallbacks(data, domain)
        return data

    async def _scrape_fallback(self, url, data, domain):
        """Standard httpx Scraper als Backup"""
        try:
            async with httpx.AsyncClient(headers=self.get_headers(), trust_env=True, timeout=15, follow_redirects=True, verify=False) as client:
                r = await client.get(url)
                await self._process_response(r, data, domain)
        except Exception as e:
            logger.error(f"Fallback Fehler: {e}")

    async def _process_response(self, r, data, domain):
        data["url"] = str(r.url)
        html = r.text
        
        # Amazon ASIN
        if "amazon" in data["url"] or "amzn" in data["url"]:
            asin = self.extract_asin(data["url"]) or self.extract_asin(html)
            if asin:
                data["image_url"] = f"https://images-na.ssl-images-amazon.com/images/P/{asin}.01.MAIN._SCLZZZZZZZ_.jpg"
                data["title"] = "Amazon Produkt"

        soup = BeautifulSoup(html, 'html.parser')
        json_data = self.extract_json_ld(soup)
        if json_data.get('title'): data['title'] = json_data['title']
        if json_data.get('image_url'): data['image_url'] = json_data['image_url']

        if not data.get('image_url') or data['title'] in [domain, "Amazon Produkt"]:
            og_title = soup.find('meta', property='og:title')
            if og_title: data['title'] = og_title['content']
            elif soup.title: data['title'] = soup.title.string.strip()

            og_image = soup.find('meta', property='og:image')
            if og_image: data['image_url'] = urljoin(data["url"], og_image['content'])

    def _apply_fallbacks(self, data, domain):
        bad_titles = [domain, "Amazon Produkt", "Robot Check", "Captcha", "Access Denied"]
        if not data["title"] or any(bt.lower() in data["title"].lower() for bt in bad_titles):
            ddg = self.search_duckduckgo_title(data["url"])
            if ddg: data["title"] = ddg
        
        if not data["image_url"]:
            data["image_url"] = self.get_google_favicon(urlparse(data["url"]).netloc)
        
        # Normalize title: strip Steam Workshop prefix if present
        if data.get("title"):
            data["title"] = self._strip_steam_prefix(data["title"]) 

    def _strip_steam_prefix(self, title: str) -> str:
        """Remove leading 'Steam Workshop::' (or variants like single/double colons) from titles.

        Case-insensitive and tolerant of surrounding whitespace. Examples:
        - 'Steam Workshop:: Cool Mod' -> 'Cool Mod'
        - 'steam workshop: Another Mod' -> 'Another Mod'
        """
        if not title or not isinstance(title, str):
            return title
        # Remove leading 'Steam Workshop' followed by one or more colons and optional whitespace
        new_title = re.sub(r'(?i)^\s*steam workshop:+\s*', '', title)
        return new_title.strip()

scraper = SmartScraper()
