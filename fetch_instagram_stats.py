#!/usr/bin/env python3
"""
Instagram Stats Fetcher CLI
Fetches Instagram statistics and updates the database
Can be run manually or via GitHub Actions
"""

import asyncio
import json
import logging
import sys
import os
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
from app.instagram_fetcher import get_instagram_fetcher_from_env
from app.database import save_social_stats_cache, init_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def main():
    """Main function to fetch Instagram stats and update database."""
    
    # Load environment variables from .env.social if it exists
    social_env = Path('.env.social')
    if social_env.exists():
        logger.info("Loading credentials from .env.social")
        load_dotenv('.env.social')
    else:
        logger.info("No .env.social file found, using system environment variables")
    
    # Also load main .env for database config
    load_dotenv()
    
    # Initialize database
    init_db()
    
    # Get Instagram fetcher
    fetcher = get_instagram_fetcher_from_env()
    if not fetcher:
        logger.error("❌ Failed to initialize Instagram fetcher. Check environment variables.")
        return 1
    
    logger.info(f"📱 Fetching Instagram stats for: @{fetcher.username}")
    
    # Fetch stats and refresh token
    stats, new_token = await fetcher.fetch_and_refresh_token()
    
    if not stats:
        logger.error("❌ Failed to fetch Instagram statistics")
        return 1
    
    # Save to database
    logger.info("💾 Saving stats to database...")
    save_social_stats_cache(
        platform='instagram',
        username=stats['profile']['username'],
        stats_data=json.dumps(stats)
    )
    
    logger.info("✅ Instagram stats saved successfully!")
    
    # Print summary
    print("\n" + "="*60)
    print("📊 INSTAGRAM STATS SUMMARY")
    print("="*60)
    print(f"Username:       @{stats['profile']['username']}")
    print(f"Display Name:   {stats['profile']['name']}")
    print(f"Followers:      {stats['stats']['followers']:,}")
    print(f"Posts:          {stats['stats']['posts']:,}")
    print(f"Daily Reach:    {stats['stats']['reach_daily']:,}")
    print(f"Daily Impressions: {stats['stats']['impressions_daily']:,}")
    print(f"Profile Views:  {stats['stats']['profile_views']:,}")
    print(f"Last Updated:   {stats['meta']['updated_at']}")
    print("="*60)
    
    # Handle token refresh
    if new_token:
        print("\n🔄 ACCESS TOKEN REFRESHED!")
        print("="*60)
        print("⚠️  WICHTIG: Dein Access Token wurde erneuert!")
        print("Bitte aktualisiere das GitHub Secret 'INSTAGRAM_SECRET' mit dem neuen Token:")
        print("\n.env.social Inhalt:")
        print("-"*60)
        print(f"INSTAGRAM_ACCESS_TOKEN={new_token}")
        print(f"INSTAGRAM_USERNAME={fetcher.username}")
        print(f"INSTAGRAM_APP_ID={fetcher.app_id}")
        print(f"INSTAGRAM_APP_SECRET={fetcher.app_secret}")
        print("-"*60)
        print("\nDieser Token ist 60 Tage gültig.\n")
        
        # Save new token to .env.social if file exists
        if social_env.exists():
            logger.info("Updating .env.social with new token...")
            with open(social_env, 'w') as f:
                f.write(f"# SOCIAL MEDIA API CREDENTIALS\n")
                f.write(f"# Diese Datei wird als GitHub Secret 'INSTAGRAM_SECRET' gespeichert\n\n")
                f.write(f"# Instagram (Meta Graph API)\n")
                f.write(f"INSTAGRAM_ACCESS_TOKEN={new_token}\n")
                f.write(f"INSTAGRAM_USERNAME={fetcher.username}\n")
                f.write(f"INSTAGRAM_APP_ID={fetcher.app_id}\n")
                f.write(f"INSTAGRAM_APP_SECRET={fetcher.app_secret}\n")
            logger.info("✅ .env.social updated with new token")
    
    print("\n✅ All done! Stats are now available in the MediaKit.\n")
    return 0


if __name__ == '__main__':
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
