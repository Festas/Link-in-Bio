#!/usr/bin/env python3
"""
Test script for TikTok fetcher
Tests the TikTok API integration without making real API calls
"""

import sys
import logging
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.tiktok_fetcher import TikTokFetcher, MIN_TOKEN_LENGTH

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Use mock tokens that exceed MIN_TOKEN_LENGTH to pass validation
MOCK_ACCESS_TOKEN = "test_access_token_" + "x" * MIN_TOKEN_LENGTH
MOCK_REFRESH_TOKEN = "test_refresh_token_" + "y" * MIN_TOKEN_LENGTH


def test_tiktok_fetcher_initialization():
    """Test TikTok fetcher initialization"""
    print("\n" + "=" * 60)
    print("TEST 1: TikTok Fetcher Initialization")
    print("=" * 60)

    fetcher = TikTokFetcher(
        access_token=MOCK_ACCESS_TOKEN,
        refresh_token=MOCK_REFRESH_TOKEN,
        client_key="test_client_key",
        client_secret="test_client_secret",
    )

    assert fetcher.access_token == MOCK_ACCESS_TOKEN
    assert fetcher.refresh_token == MOCK_REFRESH_TOKEN
    assert fetcher.client_key == "test_client_key"
    assert fetcher.client_secret == "test_client_secret"
    assert fetcher.base_url == "https://open.tiktokapis.com/v2"

    print("✅ Initialization test passed!")
    return True


def test_engagement_calculation():
    """Test engagement rate calculation"""
    print("\n" + "=" * 60)
    print("TEST 2: Engagement Rate Calculation")
    print("=" * 60)

    fetcher = TikTokFetcher(
        access_token=MOCK_ACCESS_TOKEN, refresh_token=MOCK_REFRESH_TOKEN, client_key="test_key", client_secret="test_secret"
    )

    # Test with sample video data
    videos = [
        {"id": "1", "view_count": 10000, "like_count": 500, "comment_count": 50, "share_count": 25},
        {"id": "2", "view_count": 15000, "like_count": 750, "comment_count": 75, "share_count": 30},
    ]

    engagement_rate = fetcher.calculate_engagement_rate(videos)

    # Calculate expected: (500+50+25 + 750+75+30) / (10000 + 15000) * 100
    # = 1430 / 25000 * 100 = 5.72%
    expected = 5.72

    print(f"Calculated engagement rate: {engagement_rate}%")
    print(f"Expected engagement rate: {expected}%")

    assert engagement_rate == expected, f"Expected {expected}, got {engagement_rate}"

    print("✅ Engagement calculation test passed!")
    return True


def test_avg_views_calculation():
    """Test average views calculation"""
    print("\n" + "=" * 60)
    print("TEST 3: Average Views Calculation")
    print("=" * 60)

    fetcher = TikTokFetcher(
        access_token=MOCK_ACCESS_TOKEN, refresh_token=MOCK_REFRESH_TOKEN, client_key="test_key", client_secret="test_secret"
    )

    videos = [{"id": "1", "view_count": 10000}, {"id": "2", "view_count": 15000}, {"id": "3", "view_count": 12000}]

    avg_views = fetcher.calculate_avg_views(videos)

    # Expected: (10000 + 15000 + 12000) / 3 = 12333.33... rounded to 12333
    expected = 12333

    print(f"Calculated average views: {avg_views}")
    print(f"Expected average views: {expected}")

    assert avg_views == expected, f"Expected {expected}, got {avg_views}"

    print("✅ Average views calculation test passed!")
    return True


def test_format_stats():
    """Test stats formatting"""
    print("\n" + "=" * 60)
    print("TEST 4: Stats Formatting")
    print("=" * 60)

    fetcher = TikTokFetcher(
        access_token=MOCK_ACCESS_TOKEN, refresh_token=MOCK_REFRESH_TOKEN, client_key="test_key", client_secret="test_secret"
    )

    user_data = {
        "display_name": "festas_builds",
        "avatar_url": "https://example.com/avatar.jpg",
        "bio_description": "Test bio",
        "follower_count": 50000,
        "likes_count": 1000000,
        "video_count": 150,
        "profile_deep_link": "https://www.tiktok.com/@festas_builds",
    }

    videos = [{"id": "1", "view_count": 10000, "like_count": 500, "comment_count": 50, "share_count": 25}]

    formatted = fetcher.format_stats(user_data, videos)

    print(f"\nFormatted stats structure:")
    print(f"  - Platform: {formatted['platform']}")
    print(f"  - Username: {formatted['profile']['username']}")
    print(f"  - Followers: {formatted['stats']['followers']}")
    print(f"  - Videos: {formatted['stats']['videos']}")
    print(f"  - Engagement Rate: {formatted['stats']['engagement_rate']}%")

    # Verify structure
    assert formatted["platform"] == "tiktok"
    assert formatted["profile"]["username"] == "festas_builds"
    assert formatted["stats"]["followers"] == 50000
    assert formatted["stats"]["videos"] == 150
    assert "meta" in formatted
    assert "updated_at" in formatted["meta"]

    print("✅ Stats formatting test passed!")
    return True


def test_empty_videos():
    """Test handling of empty video list"""
    print("\n" + "=" * 60)
    print("TEST 5: Empty Videos Handling")
    print("=" * 60)

    fetcher = TikTokFetcher(
        access_token=MOCK_ACCESS_TOKEN, refresh_token=MOCK_REFRESH_TOKEN, client_key="test_key", client_secret="test_secret"
    )

    # Test with empty videos list
    engagement_rate = fetcher.calculate_engagement_rate([])
    avg_views = fetcher.calculate_avg_views([])

    print(f"Engagement rate with no videos: {engagement_rate}%")
    print(f"Average views with no videos: {avg_views}")

    assert engagement_rate == 0.0
    assert avg_views == 0

    print("✅ Empty videos handling test passed!")
    return True


def test_token_validation():
    """Test token validation logic"""
    print("\n" + "=" * 60)
    print("TEST 6: Token Validation")
    print("=" * 60)

    # Test with valid token (long enough)
    fetcher = TikTokFetcher(
        access_token=MOCK_ACCESS_TOKEN, refresh_token=MOCK_REFRESH_TOKEN, client_key="test_key", client_secret="test_secret"
    )
    assert fetcher._validate_token() is True
    print("✅ Valid token passes validation")

    # Test with placeholder token
    fetcher_placeholder = TikTokFetcher(
        access_token="your_tiktok_access_token_here", refresh_token=MOCK_REFRESH_TOKEN, client_key="test_key", client_secret="test_secret"
    )
    assert fetcher_placeholder._validate_token() is False
    print("✅ Placeholder token fails validation")

    # Test with short token
    fetcher_short = TikTokFetcher(
        access_token="short", refresh_token=MOCK_REFRESH_TOKEN, client_key="test_key", client_secret="test_secret"
    )
    assert fetcher_short._validate_token() is False
    print("✅ Short token fails validation")

    print("✅ Token validation test passed!")
    return True


def run_all_tests():
    """Run all tests"""
    print("\n" + "🧪 " + "=" * 58)
    print("TIKTOK FETCHER TEST SUITE")
    print("=" * 60)

    tests = [
        test_tiktok_fetcher_initialization,
        test_engagement_calculation,
        test_avg_views_calculation,
        test_format_stats,
        test_empty_videos,
        test_token_validation,
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            if test():
                passed += 1
        except AssertionError as e:
            print(f"❌ Test failed: {e}")
            failed += 1
        except Exception as e:
            print(f"❌ Test error: {e}")
            failed += 1

    print("\n" + "=" * 60)
    print("TEST RESULTS")
    print("=" * 60)
    print(f"✅ Passed: {passed}/{len(tests)}")
    if failed > 0:
        print(f"❌ Failed: {failed}/{len(tests)}")
    print("=" * 60)

    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
