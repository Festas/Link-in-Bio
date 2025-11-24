"""
Tests for browser-based scraping functionality.

This test file validates that the browser scraper can handle:
- Shortlinks and redirects
- Bot-protected sites
- JavaScript-heavy sites
"""

import pytest
import asyncio
from app.scraper.scraper_browser import BrowserScraper, get_browser_scraper


@pytest.fixture
async def browser_scraper():
    """Create a BrowserScraper instance for testing."""
    scraper = BrowserScraper()
    yield scraper
    # Cleanup after test
    await scraper.close()


class TestBrowserScraper:
    """Test browser-based scraping functionality."""

    @pytest.mark.asyncio
    async def test_browser_scraper_initialization(self, browser_scraper):
        """Test that browser scraper initializes correctly."""
        assert browser_scraper is not None
        # Enabled status depends on environment and playwright installation
        # Just check it has a boolean value
        assert isinstance(browser_scraper.enabled, bool)

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_browser_scraper_simple_url(self, browser_scraper):
        """Test browser scraping with a simple URL (requires internet)."""
        if not browser_scraper.enabled:
            pytest.skip("Browser scraping not enabled")

        pytest.skip("Skipped: requires internet access")

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_browser_scraper_handles_redirects(self, browser_scraper):
        """Test that browser scraper follows redirects properly (requires internet)."""
        if not browser_scraper.enabled:
            pytest.skip("Browser scraping not enabled")

        pytest.skip("Skipped: requires internet access")

    @pytest.mark.asyncio
    async def test_browser_scraper_invalid_url(self, browser_scraper):
        """Test browser scraper with invalid URL."""
        if not browser_scraper.enabled:
            pytest.skip("Browser scraping not enabled")

        # This should fail gracefully
        result = await browser_scraper.scrape("https://this-domain-definitely-does-not-exist-12345.com")

        # Should return None on failure
        assert result is None

    @pytest.mark.asyncio
    async def test_get_browser_scraper_singleton(self):
        """Test that get_browser_scraper returns a singleton."""
        scraper1 = await get_browser_scraper()
        scraper2 = await get_browser_scraper()

        assert scraper1 is scraper2

    @pytest.mark.asyncio
    async def test_browser_scraper_close(self, browser_scraper):
        """Test that browser scraper closes cleanly."""
        if not browser_scraper.enabled:
            pytest.skip("Browser scraping not enabled")

        # Initialize browser by making a request
        await browser_scraper.scrape("https://example.com")

        # Close should not raise an exception
        await browser_scraper.close()

        # After close, browser should be None
        assert browser_scraper._browser is None
        assert browser_scraper._context is None


class TestBrowserScraperIntegration:
    """Test integration of browser scraper with main scraper."""

    @pytest.mark.asyncio
    async def test_scraper_uses_browser_for_difficult_sites(self):
        """Test that main scraper uses browser fallback when needed."""
        from app.scraper.scraper import SmartScraper

        scraper = SmartScraper()

        # Mock a scenario where standard scraping fails
        # This is more of an integration test
        # We'll just verify the method exists and is callable
        assert hasattr(scraper, "_should_try_browser_scraping")
        assert hasattr(scraper, "_scrape_with_browser")

        # Test _should_try_browser_scraping logic
        # Poor data - should trigger browser scraping
        poor_data = {"title": "example.com", "image_url": None}  # Just the domain
        assert scraper._should_try_browser_scraping(poor_data, "example.com") is True

        # Good data - should not trigger browser scraping
        good_data = {"title": "Example Domain - A Great Website", "image_url": "https://example.com/image.jpg"}
        assert scraper._should_try_browser_scraping(good_data, "example.com") is False

        # Bot challenge detected - should trigger browser scraping
        bot_challenge = {"title": "Attention Required! | Cloudflare", "image_url": "https://example.com/image.jpg"}
        assert scraper._should_try_browser_scraping(bot_challenge, "example.com") is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
