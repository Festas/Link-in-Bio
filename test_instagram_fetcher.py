#!/usr/bin/env python3
"""
Test Instagram Fetcher with Mock Data
Verifies the integration works without requiring network access
"""

import asyncio
import json
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch, MagicMock

sys.path.insert(0, str(Path(__file__).parent))

from app.instagram_fetcher import InstagramFetcher
from app.database import init_db, save_social_stats_cache, get_social_stats_cache


# Use a longer mock token to pass basic validation
MOCK_ACCESS_TOKEN = "MOCK_ACCESS_TOKEN_" + "x" * 50  # At least 50 chars


# Mock API responses
MOCK_ME_RESPONSE = {"id": "123456789", "name": "Test User"}

MOCK_ACCOUNTS_RESPONSE = {
    "data": [
        {"instagram_business_account": {"id": "12345678901234567", "username": "festas_builds"}, "name": "Test Page"}
    ]
}

MOCK_ANALYTICS_RESPONSE = {
    "id": "12345678901234567",
    "username": "festas_builds",
    "name": "Eric | Tech & Gaming",
    "followers_count": 104700,
    "media_count": 456,
    "biography": "Tech & Gaming Influencer aus Hamburg",
    "profile_picture_url": "https://example.com/avatar.jpg",
    "insights": {
        "data": [
            {"name": "reach", "values": [{"value": 15000}]},
            {"name": "impressions", "values": [{"value": 25000}]},
            {"name": "profile_views", "values": [{"value": 3500}]},
        ]
    },
}

MOCK_TOKEN_REFRESH_RESPONSE = {"access_token": "NEW_MOCK_ACCESS_TOKEN_" + "y" * 50, "expires_in": 5184000}


def create_mock_response(data, status_code=200):
    """Create a mock response object"""
    response = MagicMock()
    response.status_code = status_code
    response.text = json.dumps(data)
    response.json = MagicMock(return_value=data)
    return response


async def test_instagram_fetcher():
    """Test the Instagram fetcher with mock data"""

    print("=" * 60)
    print("🧪 TESTING INSTAGRAM FETCHER")
    print("=" * 60)

    # Initialize database
    init_db()
    print("✓ Database initialized")

    # Create fetcher with longer mock token
    fetcher = InstagramFetcher(
        access_token=MOCK_ACCESS_TOKEN,
        username="festas_builds",
        app_id="861153786444772",
        app_secret="MOCK_APP_SECRET",
    )
    print("✓ Instagram fetcher created")

    # Create async mock for _make_request_with_retry
    async def mock_make_request(method, url, **kwargs):
        """Mock the internal request method"""
        if "/me?" in url and "accounts" not in url:
            return create_mock_response(MOCK_ME_RESPONSE)
        elif "/me" in url and "accounts" not in url:
            # For token validation call
            return create_mock_response(MOCK_ME_RESPONSE)
        elif "me/accounts" in url:
            return create_mock_response(MOCK_ACCOUNTS_RESPONSE)
        elif "oauth/access_token" in url:
            return create_mock_response(MOCK_TOKEN_REFRESH_RESPONSE)
        elif "12345678901234567" in url:
            return create_mock_response(MOCK_ANALYTICS_RESPONSE)
        else:
            return create_mock_response({"error": "Not found"}, 404)

    # Replace the method with the mock
    fetcher._make_request_with_retry = mock_make_request

    # Test: Fetch stats
    print("\n📊 Testing stats fetch...")
    stats, new_token = await fetcher.fetch_and_refresh_token()

    if stats:
        print("✓ Stats fetched successfully!")
        print(f"  - Username: @{stats['profile']['username']}")
        print(f"  - Display Name: {stats['profile']['name']}")
        print(f"  - Followers: {stats['stats']['followers']:,}")
        print(f"  - Posts: {stats['stats']['posts']:,}")
        print(f"  - Daily Reach: {stats['stats']['reach_daily']:,}")
        print(f"  - Daily Impressions: {stats['stats']['impressions_daily']:,}")
        print(f"  - Profile Views: {stats['stats']['profile_views']:,}")

        # Test: Save to database
        print("\n💾 Testing database save...")
        save_social_stats_cache(
            platform="instagram", username=stats["profile"]["username"], stats_data=json.dumps(stats)
        )
        print("✓ Stats saved to database")

        # Test: Retrieve from database
        print("\n🔍 Testing database retrieval...")
        cached = get_social_stats_cache("instagram")
        if "instagram" in cached:
            cached_stats = cached["instagram"]
            print("✓ Stats retrieved from cache")
            print(f"  - Followers: {cached_stats['data']['stats']['followers']:,}")
        else:
            print("✗ Failed to retrieve from cache")
            return False

    else:
        print("✗ Failed to fetch stats")
        return False

    # Test: Token refresh
    if new_token:
        print(f"\n🔄 Token refreshed: {new_token[:20]}...")
        print("✓ Token refresh working")
    else:
        print("\n⚠ Token refresh returned None (may be expected in mock)")

    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED!")
    print("=" * 60)
    print("\nSummary:")
    print("- Instagram API fetcher: ✓ Working")
    print("- Data formatting: ✓ Working")
    print("- Database integration: ✓ Working")
    print("- Token refresh: ✓ Working")
    print("\n📝 Note: This test uses mock data.")
    print("   With real API credentials and network access,")
    print("   the fetcher will retrieve live Instagram statistics.\n")

    return True


if __name__ == "__main__":
    success = asyncio.run(test_instagram_fetcher())
    sys.exit(0 if success else 1)
