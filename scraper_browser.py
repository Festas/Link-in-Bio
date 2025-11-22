"""
Browser-based scraping using Playwright for handling bot-protected sites and shortlinks.

This module provides a fallback scraping mechanism using real browser automation
when standard HTTP requests fail due to bot detection or JavaScript requirements.
"""

import logging
import asyncio
import os
from typing import Optional
from bs4 import BeautifulSoup

# Safe import for Playwright
HAS_PLAYWRIGHT = False
try:
    from playwright.async_api import async_playwright, Browser, BrowserContext, Page, TimeoutError as PlaywrightTimeoutError
    HAS_PLAYWRIGHT = True
except ImportError:
    logging.getLogger(__name__).info("Playwright not available. Browser scraping disabled.")
except Exception as e:
    logging.getLogger(__name__).warning(f"Playwright import error: {e}. Browser scraping disabled.")

logger = logging.getLogger(__name__)


class BrowserScraper:
    """Browser-based scraper using Playwright for difficult sites."""
    
    def __init__(self):
        """Initialize browser scraper with configuration."""
        self.enabled = HAS_PLAYWRIGHT and os.getenv("SCRAPER_BROWSER_ENABLED", "true").lower() in ("1", "true", "yes")
        self.timeout = int(os.getenv("SCRAPER_BROWSER_TIMEOUT", "30")) * 1000  # Convert to ms
        self.headless = os.getenv("SCRAPER_BROWSER_HEADLESS", "true").lower() in ("1", "true", "yes")
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._playwright = None
        
        # Browser configuration to avoid detection
        self.browser_args = [
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ]
        
        if not self.enabled:
            logger.info("Browser scraping is disabled")
        else:
            logger.info("Browser scraping is enabled")
    
    async def _ensure_browser(self):
        """Ensure browser is initialized and ready."""
        if not self.enabled:
            raise RuntimeError("Browser scraping is not enabled")
        
        if self._browser is None:
            try:
                self._playwright = await async_playwright().start()
                self._browser = await self._playwright.chromium.launch(
                    headless=self.headless,
                    args=self.browser_args
                )
                
                # Create a persistent context with realistic settings
                self._context = await self._browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    locale='de-DE',
                    timezone_id='Europe/Berlin',
                    # Additional anti-detection measures
                    java_script_enabled=True,
                    bypass_csp=True,
                )
                
                # Add script to remove webdriver property
                await self._context.add_init_script("""
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    });
                    
                    // Mock Chrome plugins
                    Object.defineProperty(navigator, 'plugins', {
                        get: () => [1, 2, 3, 4, 5]
                    });
                    
                    // Mock languages
                    Object.defineProperty(navigator, 'languages', {
                        get: () => ['de-DE', 'de', 'en-US', 'en']
                    });
                """)
                
                logger.info("Browser initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize browser: {e}")
                self.enabled = False
                raise
    
    async def scrape(self, url: str) -> Optional[dict]:
        """
        Scrape URL using browser automation.
        
        This method:
        1. Opens the URL in a real Chromium browser
        2. Waits for the page to load completely
        3. Resolves any redirects/shortlinks
        4. Extracts the rendered HTML
        5. Returns metadata dictionary
        
        Args:
            url: The URL to scrape
            
        Returns:
            Dictionary with 'html', 'final_url', and 'title' or None on failure
        """
        if not self.enabled:
            logger.debug("Browser scraping is disabled, skipping")
            return None
        
        try:
            await self._ensure_browser()
        except Exception as e:
            logger.error(f"Failed to ensure browser: {e}")
            return None
        
        page: Optional[Page] = None
        try:
            # Create a new page
            page = await self._context.new_page()
            
            # Set extra HTTP headers
            await page.set_extra_http_headers({
                'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            })
            
            logger.info(f"Browser scraping URL: {url}")
            
            # Navigate to the URL with a realistic timeout
            # wait_until='networkidle' ensures all redirects and JavaScript have finished
            try:
                response = await page.goto(
                    url,
                    wait_until='networkidle',
                    timeout=self.timeout
                )
                
                if response is None:
                    logger.warning(f"No response received for {url}")
                    return None
                
                # Check if we got a valid response
                if response.status >= 400:
                    logger.warning(f"Browser got error status {response.status} for {url}")
                    # Continue anyway, might still have useful content
                
            except PlaywrightTimeoutError:
                logger.warning(f"Timeout waiting for page to load: {url}")
                # Continue anyway - we might have partial content
            except Exception as e:
                logger.error(f"Error navigating to {url}: {e}")
                return None
            
            # Wait a bit for any lazy-loaded content
            await asyncio.sleep(1)
            
            # Get the final URL after all redirects
            final_url = page.url
            
            # Get the page title
            title = await page.title()
            
            # Get the rendered HTML
            html = await page.content()
            
            logger.info(f"Browser scraping successful: {url} -> {final_url}")
            
            return {
                'html': html,
                'final_url': final_url,
                'title': title,
                'status': response.status if response else None,
            }
            
        except Exception as e:
            logger.error(f"Browser scraping failed for {url}: {e}", exc_info=True)
            return None
        
        finally:
            # Always close the page to free resources
            if page:
                try:
                    await page.close()
                except Exception as e:
                    logger.debug(f"Error closing page: {e}")
    
    async def close(self):
        """Close the browser and clean up resources."""
        if self._context:
            try:
                await self._context.close()
            except Exception as e:
                logger.debug(f"Error closing context: {e}")
            finally:
                self._context = None
        
        if self._browser:
            try:
                await self._browser.close()
            except Exception as e:
                logger.debug(f"Error closing browser: {e}")
            finally:
                self._browser = None
        
        if self._playwright:
            try:
                await self._playwright.stop()
            except Exception as e:
                logger.debug(f"Error stopping playwright: {e}")
            finally:
                self._playwright = None
        
        logger.info("Browser closed")
    
    def __del__(self):
        """Cleanup on deletion."""
        # Note: This won't work perfectly with async, but it's a safety net
        if self._browser or self._context or self._playwright:
            logger.warning("BrowserScraper deleted without calling close()")


# Global browser scraper instance
_browser_scraper = None


async def get_browser_scraper() -> BrowserScraper:
    """Get or create the global browser scraper instance."""
    global _browser_scraper
    if _browser_scraper is None:
        _browser_scraper = BrowserScraper()
    return _browser_scraper


async def close_browser_scraper():
    """Close the global browser scraper instance."""
    global _browser_scraper
    if _browser_scraper:
        await _browser_scraper.close()
        _browser_scraper = None
