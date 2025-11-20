import re
import logging
import random
import json
import asyncio
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse, urlunparse
from duckduckgo_search import DDGS
from curl_cffi.requests import AsyncSession

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SmartScraper:
    def __init__(self):
        self.impersonate = "chrome120" 

    def clean_url(self, url: str) -> str:
        """
        KORREKTUR: Wir fassen die URL nicht an!
        Tracking-Parameter und Affiliate-Tags bleiben erhalten.
        """
        return url.strip()

    def extract_asin(self, text: str) -> str | None:
        """Findet ASINs in Texten."""
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
            logger.info(f"DDG Fallback für: {query_url}")
            with DDGS() as ddgs:
                results = list(ddgs.text(query_url, max_results=1))
                if results:
                    title = results[0].get('title', '')
                    return re.split(r' [:|] ', title)[0]
        except Exception as e:
            logger.warning(f"DDG Suche fehlgeschlagen: {e}")
        return None

    def get_google_favicon(self, domain: str) -> str:
        return f"https://www.google.com/s2/favicons?domain={domain}&sz=128"

    async def scrape(self, raw_url: str) -> dict:
        url = self.clean_url(raw_url)
        parsed = urlparse(url)
        domain = parsed.netloc.replace('www.', '').split('.')[0].capitalize()
        clean_domain_title = domain
        
        # WICHTIG: Wir initialisieren 'data' mit der ORIGINAL URL.
        # Diese wird am Ende zurückgegeben, egal wohin wir redirected werden.
        data = { 
            "title": clean_domain_title, 
            "image_url": None, 
            "url": url 
        }

        try:
            async with AsyncSession(impersonate=self.impersonate) as s:
                
                logger.info(f"Scrape URL (Impersonated): {url}")
                r = await s.get(url, allow_redirects=True, timeout=15)
                
                # Wir nutzen die finale URL (nach Redirects) NUR INTERN zum Parsen
                final_url_internal = str(r.url)
                html_content = r.text
                
                # --- Amazon Spezial: ASIN ---
                if "amazon" in final_url_internal or "amzn" in final_url_internal:
                    asin = self.extract_asin(final_url_internal) or self.extract_asin(html_content)
                    if asin:
                        logger.info(f"ASIN gefunden: {asin}")
                        data["image_url"] = f"https://images-na.ssl-images-amazon.com/images/P/{asin}.01.MAIN._SCLZZZZZZZ_.jpg"
                        data["title"] = "Amazon Produkt" 

                # --- Normales Scraping ---
                soup = BeautifulSoup(html_content, 'html.parser')
                
                # 1. JSON-LD
                json_data = self.extract_json_ld(soup)
                if json_data.get('title'): data['title'] = json_data['title']
                if json_data.get('image_url'): data['image_url'] = json_data['image_url']

                # 2. Meta Tags
                # Hier nutzen wir final_url_internal um relative Bildpfade aufzulösen
                if not data.get('image_url') or data['title'] in [domain, "Amazon Produkt"]:
                    og_title = soup.find('meta', property='og:title')
                    if og_title and og_title.get('content'): data['title'] = og_title['content']
                    elif soup.title: data['title'] = soup.title.string.strip()

                    og_image = soup.find('meta', property='og:image')
                    if og_image and og_image.get('content'):
                        data['image_url'] = urljoin(final_url_internal, og_image['content'])

        except Exception as e:
            logger.error(f"Scraping Fehler: {e}")

        # Fallback: DuckDuckGo
        bad_titles = [domain, "Amazon Produkt", "Robot Check", "Captcha", "Access Denied", "403 Forbidden", "Just a moment..."]
        if not data["title"] or any(bt.lower() in data["title"].lower() for bt in bad_titles):
            # Wir suchen nach der ORIGINAL URL (oft besser bei Shortlinks im Index)
            ddg_title = self.search_duckduckgo_title(data["url"])
            if ddg_title: data["title"] = ddg_title

        # Fallback: Favicon
        if not data["image_url"]:
            data["image_url"] = self.get_google_favicon(urlparse(data["url"]).netloc)

        return data

scraper = SmartScraper()