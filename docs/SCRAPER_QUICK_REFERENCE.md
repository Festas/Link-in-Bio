# Web Scraper - Quick Reference Guide

## Basic Usage

```python
from scraper import scraper

# Scrape any URL
result = await scraper.scrape("https://example.com")

# Returns:
# {
#     'title': 'Example Domain',
#     'image_url': 'https://example.com/og-image.jpg',
#     'url': 'https://example.com',
#     'description': 'Example website description'  # Optional
# }
```

## What Makes It Bulletproof?

### 1. Multiple Metadata Extractors (6 total)

The scraper tries these in order until it finds good data:

1. **JSON-LD** - Schema.org structured data (12+ types)
2. **Open Graph** - `og:title`, `og:image`, etc.
3. **Twitter Cards** - `twitter:title`, `twitter:image`, etc.
4. **Microdata** - HTML5 microdata (NEW!)
5. **HTML Meta** - Standard `<title>` and meta tags
6. **Content Images** - Intelligent image extraction from page content

### 2. Special Domain Handlers (9 total)

Instant results for popular sites (no network request needed):

- **GitHub**: `github.com/user/repo` → "repo by user" + OG image
- **YouTube**: `youtube.com/watch?v=ID` → "YouTube Video" + HD thumbnail
- **Twitter/X**: `twitter.com/username` → "@username on X"
- **LinkedIn**: `linkedin.com/in/username` → "LinkedIn Profile: username"
- **Instagram**: `instagram.com/username` → "@username on Instagram"
- **Amazon**: Product URLs → "Amazon Product" + product image
- **Reddit**: `reddit.com/r/subreddit` → "r/subreddit"
- **Spotify**: Track/Album/Playlist → "Spotify [Type]"
- **Stack Overflow**: Questions → "Stack Overflow Question"

### 3. Intelligent Fallbacks

If scraping fails or returns bad data:

**For Titles:**
1. Try special domain handler
2. Try scraping → extractors
3. Clean title (remove site names, Steam Workshop prefixes, etc.)
4. If still bad: DuckDuckGo search
5. Last resort: Domain name

**For Images:**
1. Try special domain handler
2. Try scraping → extractors
3. Validate image URL (HEAD request)
4. Last resort: Google favicon

## Adding a New Domain Handler

```python
# In scraper_domains.py

class MyServiceHandler(SpecialDomainHandler):
    """Handler for myservice.com URLs."""
    
    def can_handle(self, url: str, parsed_url) -> bool:
        return "myservice.com" in parsed_url.netloc.lower()
    
    def handle(self, url: str, parsed_url) -> Dict[str, Optional[str]]:
        data = {}
        # Extract title and image
        data["title"] = "My Service"
        data["image_url"] = "https://myservice.com/default-image.jpg"
        return data

# Add to SpecialDomainRouter.__init__:
self.handlers.append(MyServiceHandler())
```

## Adding a New Metadata Extractor

```python
# In scraper_extractors.py

class MyExtractor(BaseExtractor):
    """Extract my custom metadata format."""
    
    def extract(self, soup: BeautifulSoup, base_url: str) -> Dict[str, Any]:
        data = {}
        # Extract metadata
        my_tag = soup.find("meta", attrs={"name": "my-title"})
        if my_tag:
            data["title"] = my_tag.get("content")
        return data

# Add to ExtractorChain.__init__:
self.extractors.append(MyExtractor())
```

## Configuration

Environment variables:

```bash
# Maximum retry attempts for each URL
SCRAPER_MAX_RETRIES=5

# Initial backoff delay (exponential)
SCRAPER_BACKOFF_BASE=0.5

# Maximum backoff delay cap
SCRAPER_BACKOFF_CAP=10

# TLS certificate verification
SCRAPER_VERIFY_TLS=true

# Cache time-to-live in seconds
SCRAPER_CACHE_TTL=3600

# Optional: Comma-separated proxy list
SCRAPER_PROXIES=http://proxy1:8080,http://proxy2:8080
```

## Testing

```bash
# Run all scraper tests
pytest tests/test_scraper*.py -v

# Run specific test module
pytest tests/test_scraper_modules.py -v

# Run with coverage
pytest tests/test_scraper*.py --cov=scraper --cov=scraper_extractors --cov=scraper_utils --cov=scraper_domains
```

## Common Patterns

### Extracting from Multiple URLs

```python
urls = ["https://example1.com", "https://example2.com", "https://example3.com"]

results = await asyncio.gather(*[scraper.scrape(url) for url in urls])

for result in results:
    print(f"{result['title']}: {result['image_url']}")
```

### Checking Cache

```python
# Check if URL is cached
cached = scraper._get_from_cache(url)
if cached:
    print("Cache hit!")
else:
    print("Cache miss, will scrape")
```

### Clearing Cache

```python
# Clear all cache
scraper._cache = {}

# Clear specific URL
key = scraper._get_cache_key(url)
if key in scraper._cache:
    del scraper._cache[key]
```

## Debugging

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

This will show:
- Cache hits/misses
- Which extractor found each piece of metadata
- Retry attempts and failures
- Image validation results
- Fallback activations

## Performance Tips

1. **Use caching**: Default 1-hour TTL, adjust with `SCRAPER_CACHE_TTL`
2. **Batch requests**: Use `asyncio.gather()` for multiple URLs
3. **Trust domains**: Add to `ImageURLValidator.TRUSTED_DOMAINS` to skip validation
4. **Early exit**: ExtractorChain stops when all data is found
5. **Special handlers**: Add handlers for frequently scraped domains

## Troubleshooting

### "Image validation failed"
- Image URL is not accessible
- Automatically falls back to Google favicon
- Add to `TRUSTED_DOMAINS` if you know it's valid

### "All retries failed"
- URL might be blocking scraping
- Add proxies via `SCRAPER_PROXIES`
- Will still return domain name + favicon

### "Bad title detected"
- Title contains "Robot Check", "404", etc.
- Falls back to DuckDuckGo search
- Last resort: domain name

### Slow scraping
- Check if `curl_cffi` is installed
- Verify proxy performance
- Increase cache TTL for frequently accessed URLs

## Architecture Overview

```
scraper.py (Main orchestrator)
    ├── scraper_extractors.py (6 metadata extractors)
    │   ├── JSONLDExtractor
    │   ├── OpenGraphExtractor
    │   ├── TwitterCardExtractor
    │   ├── MicrodataExtractor
    │   ├── HTMLMetaExtractor
    │   └── ContentImageExtractor
    │
    ├── scraper_utils.py (Utility classes)
    │   ├── URLNormalizer
    │   ├── TitleCleaner
    │   └── ImageURLValidator
    │
    └── scraper_domains.py (9 special handlers)
        ├── GitHubHandler
        ├── LinkedInHandler
        ├── TwitterHandler
        ├── InstagramHandler
        ├── YouTubeHandler
        ├── AmazonHandler
        ├── RedditHandler
        ├── SpotifyHandler
        └── StackOverflowHandler
```

## See Also

- [SCRAPER_ARCHITECTURE.md](SCRAPER_ARCHITECTURE.md) - Detailed technical documentation
- [SCRAPER_DOCUMENTATION.md](SCRAPER_DOCUMENTATION.md) - Feature overview and comparison
- [tests/test_scraper_modules.py](tests/test_scraper_modules.py) - Comprehensive test examples
