"""Tests for enhanced scraper functionality."""

import os
import time
import pytest
from unittest.mock import Mock, patch, AsyncMock
from app.scraper.scraper import SmartScraper


@pytest.fixture
def scraper():
    """Create a SmartScraper instance for testing."""
    return SmartScraper()


class TestMetadataExtraction:
    """Test comprehensive metadata extraction."""

    def test_extract_json_ld_product(self, scraper):
        """Test JSON-LD extraction for product."""
        from bs4 import BeautifulSoup

        html = """
        <html>
            <script type="application/ld+json">
            {
                "@type": "Product",
                "name": "Test Product",
                "image": "https://example.com/image.jpg",
                "description": "Test description"
            }
            </script>
        </html>
        """
        soup = BeautifulSoup(html, "html.parser")
        data = scraper.extract_json_ld(soup)

        assert data["title"] == "Test Product"
        assert data["image_url"] == "https://example.com/image.jpg"
        assert data["description"] == "Test description"

    def test_extract_json_ld_article(self, scraper):
        """Test JSON-LD extraction for article."""
        from bs4 import BeautifulSoup

        html = """
        <html>
            <script type="application/ld+json">
            {
                "@type": "Article",
                "headline": "Test Article",
                "image": ["https://example.com/img1.jpg", "https://example.com/img2.jpg"]
            }
            </script>
        </html>
        """
        soup = BeautifulSoup(html, "html.parser")
        data = scraper.extract_json_ld(soup)

        assert data["title"] == "Test Article"
        assert data["image_url"] == "https://example.com/img1.jpg"

    def test_extract_metadata_open_graph(self, scraper):
        """Test Open Graph metadata extraction."""
        from bs4 import BeautifulSoup

        html = """
        <html>
            <head>
                <meta property="og:title" content="OG Title">
                <meta property="og:image" content="https://example.com/og-image.jpg">
                <meta property="og:description" content="OG Description">
            </head>
        </html>
        """
        soup = BeautifulSoup(html, "html.parser")
        data = scraper.extract_metadata(soup, "https://example.com")

        assert data["title"] == "OG Title"
        assert data["image_url"] == "https://example.com/og-image.jpg"
        assert data["description"] == "OG Description"

    def test_extract_metadata_twitter_cards(self, scraper):
        """Test Twitter Card metadata extraction."""
        from bs4 import BeautifulSoup

        html = """
        <html>
            <head>
                <meta name="twitter:title" content="Twitter Title">
                <meta name="twitter:image" content="https://example.com/twitter-image.jpg">
            </head>
        </html>
        """
        soup = BeautifulSoup(html, "html.parser")
        data = scraper.extract_metadata(soup, "https://example.com")

        assert data["title"] == "Twitter Title"
        assert data["image_url"] == "https://example.com/twitter-image.jpg"

    def test_extract_metadata_fallback_to_title_tag(self, scraper):
        """Test fallback to HTML title tag."""
        from bs4 import BeautifulSoup

        html = """
        <html>
            <head>
                <title>Page Title</title>
            </head>
        </html>
        """
        soup = BeautifulSoup(html, "html.parser")
        data = scraper.extract_metadata(soup, "https://example.com")

        assert data["title"] == "Page Title"


class TestTitleCleaning:
    """Test title cleaning and normalization."""

    def test_strip_steam_prefix(self, scraper):
        """Test Steam Workshop prefix removal."""
        assert scraper.title_cleaner.clean("Steam Workshop:: Cool Mod") == "Cool Mod"
        assert scraper.title_cleaner.clean("steam workshop: Another Mod") == "Another Mod"
        assert scraper.title_cleaner.clean("Normal Title") == "Normal Title"

    def test_clean_title_with_separator(self, scraper):
        """Test title cleaning with separators."""
        assert scraper.title_cleaner.clean("Page Title | Site Name") == "Page Title"
        assert scraper.title_cleaner.clean("Page Title - Site Name") == "Page Title"
        assert scraper.title_cleaner.clean("Short | Very Long Site Name Here") == "Very Long Site Name Here"

    def test_clean_title_truncation(self, scraper):
        """Test title truncation for very long titles."""
        long_title = "A" * 250
        cleaned = scraper.title_cleaner.clean(long_title)
        assert len(cleaned) <= 200
        assert cleaned.endswith("...")


class TestSpecialDomains:
    """Test special domain handling."""

    def test_github_repository(self, scraper):
        """Test GitHub repository URL handling."""
        from urllib.parse import urlparse

        url = "https://github.com/user/repo"
        parsed = urlparse(url)
        data = scraper._handle_special_domains(url, parsed, "Github")

        assert data["title"] == "repo by user"
        assert "github" in data["image_url"].lower()

    def test_linkedin_profile(self, scraper):
        """Test LinkedIn profile URL handling."""
        from urllib.parse import urlparse

        url = "https://www.linkedin.com/in/username"
        parsed = urlparse(url)
        data = scraper._handle_special_domains(url, parsed, "Linkedin")

        assert "LinkedIn Profile" in data["title"]
        assert data["image_url"] is not None

    def test_twitter_profile(self, scraper):
        """Test Twitter/X profile URL handling."""
        from urllib.parse import urlparse

        url = "https://twitter.com/username"
        parsed = urlparse(url)
        data = scraper._handle_special_domains(url, parsed, "Twitter")

        assert data["title"] == "@username on X"


class TestCaching:
    """Test caching functionality."""

    def test_cache_save_and_retrieve(self, scraper):
        """Test saving and retrieving from cache."""
        url = "https://example.com"
        data = {"title": "Test", "image_url": "https://example.com/image.jpg"}

        scraper._save_to_cache(url, data)
        cached = scraper._get_from_cache(url)

        assert cached is not None
        assert cached["title"] == "Test"
        assert cached["image_url"] == "https://example.com/image.jpg"

    def test_cache_miss(self, scraper):
        """Test cache miss returns None."""
        cached = scraper._get_from_cache("https://not-cached.com")
        assert cached is None

    def test_cache_expiry(self, scraper):
        """Test cache expiry."""
        scraper._cache_ttl = 1  # 1 second TTL

        url = "https://example.com"
        data = {"title": "Test"}
        scraper._save_to_cache(url, data)

        # Should be cached
        assert scraper._get_from_cache(url) is not None

        # Wait for expiry
        time.sleep(1.1)

        # Should be expired
        assert scraper._get_from_cache(url) is None


@pytest.mark.asyncio
class TestImageValidation:
    """Test image URL validation."""

    async def test_validate_image_url_success(self, scraper):
        """Test successful image validation."""
        with patch("httpx.AsyncClient") as mock_client:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.headers = {"content-type": "image/jpeg"}

            mock_client.return_value.__aenter__.return_value.head = AsyncMock(return_value=mock_response)

            result = await scraper.validate_image_url("https://example.com/image.jpg")
            assert result is True

    async def test_validate_image_url_failure(self, scraper):
        """Test failed image validation."""
        with patch("httpx.AsyncClient") as mock_client:
            mock_response = Mock()
            mock_response.status_code = 404

            mock_client.return_value.__aenter__.return_value.head = AsyncMock(return_value=mock_response)

            result = await scraper.validate_image_url("https://example.com/missing.jpg")
            assert result is False

    async def test_validate_image_url_exception(self, scraper):
        """Test image validation with exception."""
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.head = AsyncMock(side_effect=Exception("Connection error"))

            result = await scraper.validate_image_url("https://example.com/image.jpg")
            assert result is False


@pytest.mark.asyncio
class TestScrapeEndToEnd:
    """End-to-end scraping tests."""

    async def test_scrape_with_cache_hit(self, scraper):
        """Test scraping returns cached result."""
        url = "https://example.com"
        cached_data = {"title": "Cached Title", "image_url": "https://example.com/cached.jpg", "url": url}

        scraper._save_to_cache(url, cached_data)
        result = await scraper.scrape(url)

        assert result["title"] == "Cached Title"

    async def test_scrape_always_returns_data(self, scraper):
        """Test that scraper always returns some data, even on failure."""
        # Mock all network calls to fail
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(side_effect=Exception("Network error"))

            # Even with all failures, should return at least domain name
            result = await scraper.scrape("https://example.com/test")

            assert result is not None
            assert result["url"] == "https://example.com/test"
            assert result["title"] is not None  # Should at least have domain fallback
            assert result["image_url"] is not None  # Should at least have favicon


class TestConfigurability:
    """Test configuration options."""

    def test_max_retries_from_env(self):
        """Test max retries configuration."""
        import os

        os.environ["SCRAPER_MAX_RETRIES"] = "3"
        scraper = SmartScraper()
        assert scraper.max_retries == 3
        del os.environ["SCRAPER_MAX_RETRIES"]

    def test_cache_ttl_from_env(self):
        """Test cache TTL configuration."""
        import os

        os.environ["SCRAPER_CACHE_TTL"] = "7200"
        scraper = SmartScraper()
        assert scraper._cache_ttl == 7200
        del os.environ["SCRAPER_CACHE_TTL"]
