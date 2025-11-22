"""Tests for the new modular scraper components."""
import pytest
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from scraper_extractors import (
    JSONLDExtractor, OpenGraphExtractor, TwitterCardExtractor,
    HTMLMetaExtractor, ContentImageExtractor, MicrodataExtractor,
    ExtractorChain
)
from scraper_utils import URLNormalizer, TitleCleaner, ImageURLValidator
from scraper_domains import (
    GitHubHandler, LinkedInHandler, TwitterHandler, InstagramHandler,
    YouTubeHandler, AmazonHandler, RedditHandler, SpotifyHandler,
    StackOverflowHandler, SpecialDomainRouter
)


class TestJSONLDExtractor:
    """Test JSON-LD structured data extraction."""
    
    def test_extract_product(self):
        """Test extraction of product data."""
        html = '''
        <script type="application/ld+json">
        {
            "@type": "Product",
            "name": "Test Product",
            "image": "https://example.com/image.jpg",
            "description": "Test description"
        }
        </script>
        '''
        soup = BeautifulSoup(html, 'html.parser')
        extractor = JSONLDExtractor()
        data = extractor.extract(soup, "https://example.com")
        
        assert data['title'] == "Test Product"
        assert data['image_url'] == "https://example.com/image.jpg"
        assert data['description'] == "Test description"
    
    def test_extract_article_with_list_image(self):
        """Test extraction of article with image list."""
        html = '''
        <script type="application/ld+json">
        {
            "@type": "Article",
            "headline": "Test Article",
            "image": ["https://example.com/img1.jpg", "https://example.com/img2.jpg"]
        }
        </script>
        '''
        soup = BeautifulSoup(html, 'html.parser')
        extractor = JSONLDExtractor()
        data = extractor.extract(soup, "https://example.com")
        
        assert data['title'] == "Test Article"
        assert data['image_url'] == "https://example.com/img1.jpg"
    
    def test_extract_with_dict_image(self):
        """Test extraction with image as dict."""
        html = '''
        <script type="application/ld+json">
        {
            "@type": "WebPage",
            "name": "Test Page",
            "image": {"url": "https://example.com/image.jpg"}
        }
        </script>
        '''
        soup = BeautifulSoup(html, 'html.parser')
        extractor = JSONLDExtractor()
        data = extractor.extract(soup, "https://example.com")
        
        assert data['title'] == "Test Page"
        assert data['image_url'] == "https://example.com/image.jpg"


class TestOpenGraphExtractor:
    """Test Open Graph metadata extraction."""
    
    def test_basic_og_tags(self):
        """Test basic OG tag extraction."""
        html = '''
        <meta property="og:title" content="OG Title">
        <meta property="og:image" content="https://example.com/og-image.jpg">
        <meta property="og:description" content="OG Description">
        '''
        soup = BeautifulSoup(html, 'html.parser')
        extractor = OpenGraphExtractor()
        data = extractor.extract(soup, "https://example.com")
        
        assert data['title'] == "OG Title"
        assert data['image_url'] == "https://example.com/og-image.jpg"
        assert data['description'] == "OG Description"
    
    def test_alternative_image_tags(self):
        """Test alternative OG image tags."""
        html = '''
        <meta property="og:title" content="Title">
        <meta property="og:image:url" content="https://example.com/image.jpg">
        '''
        soup = BeautifulSoup(html, 'html.parser')
        extractor = OpenGraphExtractor()
        data = extractor.extract(soup, "https://example.com")
        
        assert data['image_url'] == "https://example.com/image.jpg"


class TestTwitterCardExtractor:
    """Test Twitter Card metadata extraction."""
    
    def test_twitter_card_name_attribute(self):
        """Test Twitter cards using name attribute."""
        html = '''
        <meta name="twitter:title" content="Twitter Title">
        <meta name="twitter:image" content="https://example.com/twitter-image.jpg">
        '''
        soup = BeautifulSoup(html, 'html.parser')
        extractor = TwitterCardExtractor()
        data = extractor.extract(soup, "https://example.com")
        
        assert data['title'] == "Twitter Title"
        assert data['image_url'] == "https://example.com/twitter-image.jpg"
    
    def test_twitter_card_property_attribute(self):
        """Test Twitter cards using property attribute."""
        html = '''
        <meta property="twitter:title" content="Twitter Title">
        <meta property="twitter:image" content="https://example.com/twitter-image.jpg">
        '''
        soup = BeautifulSoup(html, 'html.parser')
        extractor = TwitterCardExtractor()
        data = extractor.extract(soup, "https://example.com")
        
        assert data['title'] == "Twitter Title"
        assert data['image_url'] == "https://example.com/twitter-image.jpg"


class TestHTMLMetaExtractor:
    """Test HTML meta tag extraction."""
    
    def test_title_tag(self):
        """Test title tag extraction."""
        html = '<title>Page Title</title>'
        soup = BeautifulSoup(html, 'html.parser')
        extractor = HTMLMetaExtractor()
        data = extractor.extract(soup, "https://example.com")
        
        assert data['title'] == "Page Title"
    
    def test_meta_description(self):
        """Test meta description extraction."""
        html = '<meta name="description" content="Page Description">'
        soup = BeautifulSoup(html, 'html.parser')
        extractor = HTMLMetaExtractor()
        data = extractor.extract(soup, "https://example.com")
        
        assert data['description'] == "Page Description"
    
    def test_apple_touch_icon(self):
        """Test apple-touch-icon extraction."""
        html = '<link rel="apple-touch-icon" href="/icon.png">'
        soup = BeautifulSoup(html, 'html.parser')
        extractor = HTMLMetaExtractor()
        data = extractor.extract(soup, "https://example.com")
        
        assert data['image_url'] == "https://example.com/icon.png"


class TestMicrodataExtractor:
    """Test HTML5 microdata extraction."""
    
    def test_microdata_product(self):
        """Test microdata product extraction."""
        html = '''
        <div itemscope itemtype="http://schema.org/Product">
            <span itemprop="name">Product Name</span>
            <img itemprop="image" src="product.jpg">
            <span itemprop="description">Product Description</span>
        </div>
        '''
        soup = BeautifulSoup(html, 'html.parser')
        extractor = MicrodataExtractor()
        data = extractor.extract(soup, "https://example.com")
        
        assert data['title'] == "Product Name"
        assert data['image_url'] == "https://example.com/product.jpg"
        assert data['description'] == "Product Description"


class TestContentImageExtractor:
    """Test content image extraction."""
    
    def test_skip_small_images(self):
        """Test that small images are skipped."""
        html = '''
        <img src="icon.png" width="50" height="50">
        <img src="large.jpg" width="800" height="600">
        '''
        soup = BeautifulSoup(html, 'html.parser')
        extractor = ContentImageExtractor()
        data = extractor.extract(soup, "https://example.com")
        
        assert data['image_url'] == "https://example.com/large.jpg"
    
    def test_skip_patterns(self):
        """Test that images with skip patterns are skipped."""
        html = '''
        <img src="logo.png">
        <img src="good-image.jpg">
        '''
        soup = BeautifulSoup(html, 'html.parser')
        extractor = ContentImageExtractor()
        data = extractor.extract(soup, "https://example.com")
        
        assert data['image_url'] == "https://example.com/good-image.jpg"


class TestExtractorChain:
    """Test the complete extractor chain."""
    
    def test_chain_priority(self):
        """Test that extractors are tried in priority order."""
        html = '''
        <title>Title Tag</title>
        <meta property="og:title" content="OG Title">
        <script type="application/ld+json">
        {"@type": "Article", "headline": "JSON-LD Title"}
        </script>
        '''
        soup = BeautifulSoup(html, 'html.parser')
        chain = ExtractorChain()
        data = chain.extract(soup, "https://example.com")
        
        # JSON-LD should take priority
        assert data['title'] == "JSON-LD Title"


class TestURLNormalizer:
    """Test URL normalization."""
    
    def test_add_https(self):
        """Test adding https to URL without scheme."""
        normalizer = URLNormalizer()
        result = normalizer.normalize("example.com")
        assert result.startswith("https://")
    
    def test_lowercase_domain(self):
        """Test domain is lowercased."""
        normalizer = URLNormalizer()
        result = normalizer.normalize("https://EXAMPLE.COM/Path")
        # Check that domain was lowercased by verifying the full URL structure
        assert result.startswith("https://example.com/")
    
    def test_is_valid(self):
        """Test URL validation."""
        normalizer = URLNormalizer()
        assert normalizer.is_valid("https://example.com") is True
        assert normalizer.is_valid("not a url") is False
        assert normalizer.is_valid("") is False
    
    def test_get_domain(self):
        """Test domain extraction."""
        normalizer = URLNormalizer()
        assert normalizer.get_domain("https://www.example.com/path") == "Example"
        assert normalizer.get_domain("https://test.example.com") == "Test"


class TestTitleCleaner:
    """Test title cleaning."""
    
    def test_remove_steam_prefix(self):
        """Test Steam Workshop prefix removal."""
        cleaner = TitleCleaner()
        assert cleaner.clean("Steam Workshop:: Cool Mod") == "Cool Mod"
        assert cleaner.clean("steam workshop: Another Mod") == "Another Mod"
    
    def test_remove_separators(self):
        """Test separator removal."""
        cleaner = TitleCleaner()
        assert cleaner.clean("Page Title | Site Name") == "Page Title"
        assert cleaner.clean("Page Title - Site Name") == "Page Title"
    
    def test_truncate_long_titles(self):
        """Test long title truncation."""
        cleaner = TitleCleaner()
        long_title = "A" * 250
        cleaned = cleaner.clean(long_title)
        assert len(cleaned) <= 200
        assert cleaned.endswith("...")
    
    def test_is_bad_title(self):
        """Test bad title detection."""
        cleaner = TitleCleaner()
        assert cleaner.is_bad_title("Robot Check", "Example") is True
        assert cleaner.is_bad_title("404", "Example") is True
        assert cleaner.is_bad_title("Example", "Example") is True
        assert cleaner.is_bad_title("Good Title", "Example") is False


class TestImageURLValidator:
    """Test image URL validation."""
    
    def test_should_skip_data_uri(self):
        """Test that data URIs are skipped."""
        validator = ImageURLValidator()
        assert validator.should_skip("data:image/png;base64,abc") is True
    
    def test_should_skip_patterns(self):
        """Test that skip patterns work."""
        validator = ImageURLValidator()
        assert validator.should_skip("https://example.com/logo.png") is True
        assert validator.should_skip("https://example.com/icon.png") is True
        assert validator.should_skip("https://example.com/image.jpg") is False
    
    def test_is_trusted_domain(self):
        """Test trusted domain detection."""
        validator = ImageURLValidator()
        assert validator.is_trusted_domain("https://opengraph.githubassets.com/1/user/repo") is True
        assert validator.is_trusted_domain("https://example.com/image.jpg") is False
    
    def test_get_fallback_image(self):
        """Test fallback image generation."""
        validator = ImageURLValidator()
        fallback = validator.get_fallback_image("https://example.com/page")
        assert "google.com/s2/favicons" in fallback
        assert "domain=example.com" in fallback


class TestSpecialDomainHandlers:
    """Test special domain handlers."""
    
    def test_github_handler(self):
        """Test GitHub repository handler."""
        handler = GitHubHandler()
        url = "https://github.com/user/repo"
        parsed = urlparse(url)
        result = handler.handle(url, parsed)
        assert result['title'] == "repo by user"
        assert "github" in result['image_url'].lower()
    
    def test_youtube_handler(self):
        """Test YouTube video handler."""
        handler = YouTubeHandler()
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        parsed = urlparse(url)
        result = handler.handle(url, parsed)
        assert result['title'] == "YouTube Video"
        assert "dQw4w9WgXcQ" in result['image_url']
    
    def test_amazon_handler(self):
        """Test Amazon product handler."""
        handler = AmazonHandler()
        url = "https://www.amazon.com/dp/B08N5WRWNW"
        parsed = urlparse(url)
        result = handler.handle(url, parsed)
        assert result['title'] == "Amazon Product"
        assert "B08N5WRWNW" in result['image_url']
    
    def test_twitter_handler(self):
        """Test Twitter profile handler."""
        handler = TwitterHandler()
        url = "https://twitter.com/username"
        parsed = urlparse(url)
        result = handler.handle(url, parsed)
        assert "@username" in result['title']
    
    def test_linkedin_handler(self):
        """Test LinkedIn profile handler."""
        handler = LinkedInHandler()
        url = "https://www.linkedin.com/in/username"
        parsed = urlparse(url)
        result = handler.handle(url, parsed)
        assert "LinkedIn" in result['title']


class TestSpecialDomainRouter:
    """Test the domain router."""
    
    def test_routing_to_github(self):
        """Test routing GitHub URLs to GitHubHandler."""
        router = SpecialDomainRouter()
        result = router.handle("https://github.com/user/repo")
        assert "repo by user" == result['title']
    
    def test_routing_to_youtube(self):
        """Test routing YouTube URLs to YouTubeHandler."""
        router = SpecialDomainRouter()
        result = router.handle("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        assert result['title'] == "YouTube Video"
    
    def test_no_handler(self):
        """Test that unknown domains return empty dict."""
        router = SpecialDomainRouter()
        result = router.handle("https://unknown-site.com")
        assert result == {}
