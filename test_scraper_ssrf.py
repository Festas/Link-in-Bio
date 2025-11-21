"""
Tests for SSRF protection in scraper.py
"""
import pytest
import asyncio
from scraper import SmartScraper


@pytest.fixture
def scraper():
    return SmartScraper()


class TestSSRFProtection:
    """Test SSRF vulnerability protection"""
    
    def test_localhost_blocked(self, scraper):
        """Test that localhost URLs are blocked"""
        with pytest.raises(ValueError, match="not allowed"):
            scraper._validate_url_not_ssrf("http://localhost:8080/admin")
    
    def test_127_0_0_1_blocked(self, scraper):
        """Test that 127.0.0.1 URLs are blocked"""
        with pytest.raises(ValueError, match="not allowed"):
            scraper._validate_url_not_ssrf("http://127.0.0.1:8080/admin")
    
    def test_loopback_ipv6_blocked(self, scraper):
        """Test that IPv6 loopback (::1) is blocked"""
        with pytest.raises(ValueError, match="not allowed"):
            scraper._validate_url_not_ssrf("http://[::1]:8080/admin")
    
    def test_private_ip_192_blocked(self, scraper):
        """Test that private IP 192.168.x.x is blocked"""
        with pytest.raises(ValueError, match="not allowed"):
            scraper._validate_url_not_ssrf("http://192.168.1.1/router")
    
    def test_private_ip_10_blocked(self, scraper):
        """Test that private IP 10.x.x.x is blocked"""
        with pytest.raises(ValueError, match="not allowed"):
            scraper._validate_url_not_ssrf("http://10.0.0.1/internal")
    
    def test_private_ip_172_blocked(self, scraper):
        """Test that private IP 172.16-31.x.x is blocked"""
        with pytest.raises(ValueError, match="not allowed"):
            scraper._validate_url_not_ssrf("http://172.16.0.1/internal")
    
    def test_link_local_blocked(self, scraper):
        """Test that link-local addresses are blocked"""
        with pytest.raises(ValueError, match="not allowed"):
            scraper._validate_url_not_ssrf("http://169.254.1.1/metadata")
    
    def test_public_url_allowed(self, scraper):
        """Test that public URLs are allowed"""
        # These should not raise an exception
        try:
            scraper._validate_url_not_ssrf("https://www.google.com")
            scraper._validate_url_not_ssrf("https://github.com")
            scraper._validate_url_not_ssrf("https://example.com")
        except ValueError:
            pytest.fail("Public URLs should be allowed")
    
    def test_invalid_url_raises_error(self, scraper):
        """Test that invalid URLs without hostname raise error"""
        with pytest.raises(ValueError, match="no hostname"):
            scraper._validate_url_not_ssrf("not-a-valid-url")
    
    @pytest.mark.asyncio
    async def test_scrape_blocks_localhost(self, scraper):
        """Test that scrape method blocks localhost URLs"""
        with pytest.raises(ValueError, match="URL validation failed"):
            await scraper.scrape("http://localhost:8080/admin")
    
    @pytest.mark.asyncio
    async def test_scrape_blocks_private_ip(self, scraper):
        """Test that scrape method blocks private IP URLs"""
        with pytest.raises(ValueError, match="URL validation failed"):
            await scraper.scrape("http://192.168.1.1/router")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
