#!/usr/bin/env python3
"""
TikTok Stats Fetcher CLI
Fetches TikTok statistics and updates the database
Can be run manually or via GitHub Actions
"""

import asyncio
import json
import logging
import sys
import os
from pathlib import Path
from datetime import datetime

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
from app.tiktok_fetcher import get_tiktok_fetcher_from_env
from app.database import save_social_stats_cache, init_db
from app.github_secret_updater import update_tiktok_secret_from_env

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def main():
    """Main function to fetch TikTok stats and update database."""
    
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
    
    # Get TikTok fetcher
    fetcher = get_tiktok_fetcher_from_env()
    if not fetcher:
        logger.error("❌ Failed to initialize TikTok fetcher. Check environment variables.")
        return 1
    
    logger.info("📱 Fetching TikTok stats...")
    
    # Fetch stats and refresh token
    stats, new_tokens = await fetcher.fetch_and_refresh_token()
    
    if not stats:
        logger.error("❌ Failed to fetch TikTok statistics")
        return 1
    
    # Save to database
    logger.info("💾 Saving stats to database...")
    save_social_stats_cache(
        platform='tiktok',
        username=stats['profile']['username'],
        stats_data=json.dumps(stats)
    )
    
    logger.info("✅ TikTok stats saved successfully!")
    
    # Print summary
    print("\n" + "="*60)
    print("📊 TIKTOK STATS SUMMARY")
    print("="*60)
    print(f"Username:       @{stats['profile']['username']}")
    print(f"Followers:      {stats['stats']['followers']:,}")
    print(f"Total Likes:    {stats['stats']['likes']:,}")
    print(f"Videos:         {stats['stats']['videos']:,}")
    print(f"Engagement:     {stats['stats']['engagement_rate']}%")
    print(f"Avg Views:      {stats['stats']['avg_views']:,}")
    print(f"Last Updated:   {stats['meta']['updated_at']}")
    print("="*60)
    
    # Handle token refresh
    if new_tokens:
        new_access_token, new_refresh_token = new_tokens
        print("\n🔄 ACCESS TOKEN REFRESHED!")
        print("="*60)
        print("✅ Dein TikTok Access Token wurde automatisch erneuert!")
        print("\n.env.social Inhalt (TikTok):")
        print("-"*60)
        print(f"TIKTOK_ACCESS_TOKEN={new_access_token}")
        print(f"TIKTOK_REFRESH_TOKEN={new_refresh_token}")
        print(f"TIKTOK_CLIENT_KEY={fetcher.client_key}")
        print(f"TIKTOK_CLIENT_SECRET={fetcher.client_secret}")
        print("-"*60)
        print("\nDieser Token ist 24 Stunden gültig und wird täglich automatisch erneuert.\n")
        
        # Update environment with new tokens for potential GitHub Secret update
        os.environ['TIKTOK_ACCESS_TOKEN'] = new_access_token
        os.environ['TIKTOK_REFRESH_TOKEN'] = new_refresh_token
        
        # Save new tokens to .env.social if file exists
        if social_env.exists():
            logger.info("Updating .env.social with new tokens...")
            
            # Read existing content
            existing_lines = []
            with open(social_env, 'r') as f:
                existing_lines = f.readlines()
            
            # Update TikTok credentials while preserving other content
            updated_lines = []
            tiktok_section_started = False
            tiktok_vars_updated = {
                'TIKTOK_ACCESS_TOKEN': False,
                'TIKTOK_REFRESH_TOKEN': False,
                'TIKTOK_CLIENT_KEY': False,
                'TIKTOK_CLIENT_SECRET': False
            }
            
            for line in existing_lines:
                if line.strip().startswith('TIKTOK_ACCESS_TOKEN='):
                    updated_lines.append(f"TIKTOK_ACCESS_TOKEN={new_access_token}\n")
                    tiktok_vars_updated['TIKTOK_ACCESS_TOKEN'] = True
                elif line.strip().startswith('TIKTOK_REFRESH_TOKEN='):
                    updated_lines.append(f"TIKTOK_REFRESH_TOKEN={new_refresh_token}\n")
                    tiktok_vars_updated['TIKTOK_REFRESH_TOKEN'] = True
                elif line.strip().startswith('TIKTOK_CLIENT_KEY='):
                    updated_lines.append(f"TIKTOK_CLIENT_KEY={fetcher.client_key}\n")
                    tiktok_vars_updated['TIKTOK_CLIENT_KEY'] = True
                elif line.strip().startswith('TIKTOK_CLIENT_SECRET='):
                    updated_lines.append(f"TIKTOK_CLIENT_SECRET={fetcher.client_secret}\n")
                    tiktok_vars_updated['TIKTOK_CLIENT_SECRET'] = True
                else:
                    updated_lines.append(line)
            
            # Add TikTok credentials if they don't exist
            if not any(tiktok_vars_updated.values()):
                updated_lines.append(f"\n# TikTok API Credentials - Automatisch aktualisiert am {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                updated_lines.append(f"TIKTOK_ACCESS_TOKEN={new_access_token}\n")
                updated_lines.append(f"TIKTOK_REFRESH_TOKEN={new_refresh_token}\n")
                updated_lines.append(f"TIKTOK_CLIENT_KEY={fetcher.client_key}\n")
                updated_lines.append(f"TIKTOK_CLIENT_SECRET={fetcher.client_secret}\n")
            
            with open(social_env, 'w') as f:
                f.writelines(updated_lines)
            
            logger.info("✅ .env.social updated with new TikTok tokens")
        
        # Automatically update GitHub Secret if running in GitHub Actions
        github_token = os.getenv('GITHUB_TOKEN')
        github_repository = os.getenv('GITHUB_REPOSITORY')  # Format: owner/repo
        
        if github_token and github_repository:
            logger.info("🔐 Running in GitHub Actions - attempting to update GitHub Secret...")
            try:
                repo_parts = github_repository.split('/')
                if len(repo_parts) == 2:
                    repo_owner, repo_name = repo_parts
                    
                    success = update_tiktok_secret_from_env(
                        github_token=github_token,
                        repo_owner=repo_owner,
                        repo_name=repo_name
                    )
                    
                    if success:
                        print("\n✅ GitHub Secret 'TIKTOK_SECRET' wurde automatisch aktualisiert!")
                        print("Keine manuellen Schritte erforderlich - das System läuft vollautomatisch weiter.\n")
                    else:
                        print("\n⚠️ GitHub Secret konnte nicht automatisch aktualisiert werden.")
                        print("Bitte aktualisiere das GitHub Secret 'TIKTOK_SECRET' manuell mit dem obigen Inhalt.\n")
                else:
                    logger.warning(f"Invalid GITHUB_REPOSITORY format: {github_repository}")
            except Exception as e:
                logger.error(f"Error updating GitHub Secret: {e}")
                print(f"\n⚠️ Fehler beim automatischen Update des GitHub Secrets: {e}")
                print("Bitte aktualisiere das GitHub Secret 'TIKTOK_SECRET' manuell.\n")
        else:
            print("\n⚠️ Nicht in GitHub Actions - GitHub Secret muss manuell aktualisiert werden.")
            print("Kopiere den obigen Inhalt in das GitHub Secret 'TIKTOK_SECRET'.\n")
    
    print("\n✅ All done! TikTok stats are now available in the MediaKit.\n")
    return 0


if __name__ == '__main__':
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
