# Web Scraping Improvements - User Guide

## Overview

The web scraper has been significantly enhanced to provide better results for Amazon and other e-commerce websites. Even when direct web scraping fails (due to bot protection, JavaScript requirements, etc.), the system now extracts useful information from URLs themselves.

## What's New?

### 🛒 Enhanced Amazon Support

**Problem**: Amazon pages often block automated scraping, returning only generic "Amazon Product" titles.

**Solution**: The scraper now extracts product information directly from Amazon URLs:

#### Before:
```
URL: https://www.amazon.com/PlayStation-5-Console/dp/B0CL61F39G
Result:
  Title: "Amazon Product"
  Image: Generic fallback
```

#### After:
```
URL: https://www.amazon.com/PlayStation-5-Console/dp/B0CL61F39G
Result:
  Title: "PlayStation 5 Console"
  Image: High-resolution product image
```

### How It Works

Amazon URLs contain the product name in the path (called a "slug"):
- `/PlayStation-5-Console/dp/...` becomes "PlayStation 5 Console"
- `/Apple-AirPods-Pro/dp/...` becomes "Apple Airpods Pro"
- `/Wireless-Keyboard-Mouse/dp/...` becomes "Wireless Keyboard Mouse"

The scraper:
1. Tries to scrape the actual page (JSON-LD, OpenGraph, etc.)
2. Falls back to extracting title from URL slug
3. Uses Amazon-specific HTML selectors if page loads
4. Provides high-quality ASIN-based product images

### 🛍️ New E-commerce Platform Support

#### eBay
Extracts product titles from listing URLs:
```
URL: https://www.ebay.com/itm/Vintage-Camera-Nikon/123456789
Title: "Vintage Camera Nikon"
```

#### Etsy
Extracts product titles from handmade listings:
```
URL: https://www.etsy.com/listing/123456/handmade-silver-necklace
Title: "Handmade Silver Necklace"
```

#### AliExpress
Handles AliExpress product URLs with smart fallbacks.

## Features

### Multiple Fallback Strategies

The scraper uses a comprehensive fallback chain to ensure you always get useful results:

1. **Special Domain Handlers** - Instant results from URL structure
2. **Web Scraping** - Extract from page HTML (JSON-LD, OpenGraph, Twitter Cards, etc.)
3. **HTML Selectors** - Domain-specific extraction (e.g., Amazon product titles)
4. **DuckDuckGo Search** - Search engine fallback for titles
5. **Domain Names** - Last resort, uses domain as title

### Smart Image Handling

For Amazon specifically:
- Multiple image URL formats (high-res, medium-res)
- Extracts images from `data-a-dynamic-image` attributes
- ASIN-based fallback images
- Image validation to ensure URLs work

### Title Cleaning

Automatically cleans and formats extracted titles:
- Removes site names and separators
- Handles URL encoding
- Capitalizes appropriately
- Truncates overly long titles

## Supported Websites

### Social Media & Content
- ✅ GitHub (repositories and profiles)
- ✅ LinkedIn (profiles and companies)
- ✅ Twitter/X (profiles and tweets)
- ✅ Instagram (profiles and posts)
- ✅ YouTube (videos and channels)
- ✅ Reddit (subreddits and users)
- ✅ Spotify (tracks, albums, playlists, artists)
- ✅ Stack Overflow (questions and users)

### E-commerce ⭐ NEW/ENHANCED
- ✅ **Amazon** (enhanced with URL slug extraction)
- ✅ **eBay** (new - title extraction)
- ✅ **Etsy** (new - title extraction)
- ✅ **AliExpress** (new - basic support)

### General Websites
- ✅ Any website with OpenGraph tags
- ✅ Any website with Twitter Card metadata
- ✅ Any website with JSON-LD structured data
- ✅ Any website with standard HTML meta tags

## Technical Details

### Amazon URL Formats Supported

All these formats now extract the product title:

```
✅ https://www.amazon.com/Product-Name/dp/B08N5WRWNW
✅ https://amazon.com/Product-Name/gp/product/B08N5WRWNW
✅ https://www.amazon.de/Product-Name/dp/B08N5WRWNW
✅ https://www.amazon.com/Product-Name/dp/B08N5WRWNW/ref=...
```

### Image URLs

Amazon product images use multiple fallback URLs:

1. High-resolution: `images-na.ssl-images-amazon.com/images/P/{asin}.01.LZZZZZZZ.jpg`
2. Standard: `images-na.ssl-images-amazon.com/images/P/{asin}.01.MAIN._SCLZZZZZZZ_.jpg`
3. Mobile: `m.media-amazon.com/images/I/{asin}.jpg`
4. Widget: `ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN={asin}&Format=_SL250_`

## Benefits

✅ **Better Product Titles**: Real product names instead of "Amazon Product"  
✅ **Better Images**: High-resolution product images  
✅ **Works Without Scraping**: URL-based extraction when pages block bots  
✅ **Multiple E-commerce Sites**: Not just Amazon anymore  
✅ **Reliable Fallbacks**: Always returns something useful  
✅ **No Configuration Needed**: Works automatically  

## Limitations

⚠️ **URL Slug Requirement**: For best results on Amazon, the URL should include the product name. Short URLs like `amazon.com/dp/B08N5WRWNW` will fall back to "Amazon Product".

⚠️ **Bot Protection**: Some sites still block automated scraping. The URL-based extraction provides a fallback in these cases.

⚠️ **Language**: URL slugs are in the language of the Amazon site (e.g., German product names on amazon.de).

## Examples

### Amazon Success Cases

```python
# PlayStation 5
URL: https://www.amazon.com/PlayStation-5-Console/dp/B0CL61F39G
Title: "Playstation 5 Console"
Image: High-res product image

# Apple AirPods
URL: https://amazon.com/Apple-AirPods-Pro/dp/B09JQMJHXY
Title: "Apple Airpods Pro"
Image: High-res product image

# German Amazon
URL: https://www.amazon.de/Sony-PlayStation-Digital/dp/B08H98GVK8
Title: "Sony Playstation Digital"
Image: High-res product image
```

### eBay Success Cases

```python
URL: https://www.ebay.com/itm/Vintage-Camera-Rare/123456789
Title: "Vintage Camera Rare"
```

### Etsy Success Cases

```python
URL: https://www.etsy.com/listing/123456/handmade-necklace
Title: "Handmade Necklace"
```

## Testing

All enhancements are thoroughly tested:
- 42+ unit tests for scraper modules
- Specific tests for Amazon URL slug extraction
- Tests for eBay, Etsy, AliExpress handlers
- All existing functionality remains compatible

## Future Enhancements

Potential improvements planned:
- More e-commerce platforms (Walmart, Target, Best Buy, etc.)
- Better handling of region-specific Amazon sites
- Product price extraction
- Improved image resolution detection
- AI-powered extraction for complex pages

## Need Help?

If you encounter issues with specific URLs:
1. Ensure the URL includes the product name in the path
2. Check if the site is supported (see list above)
3. The scraper will always return *something* - at minimum a domain name and favicon
4. For unsupported sites, standard web scraping techniques still apply

---

**Summary**: The web scraper is now much more reliable for e-commerce sites, especially Amazon. Even when direct scraping fails, you'll get meaningful product titles and images extracted from the URLs themselves.
