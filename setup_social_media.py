#!/usr/bin/env python3
"""
Setup Helper for Social Media Integration
Helps create .env.social file with Instagram and TikTok credentials
"""

import os
import sys
from pathlib import Path
from datetime import datetime


def print_header(text):
    """Print formatted header"""
    print("\n" + "="*70)
    print(f"  {text}")
    print("="*70)


def print_section(text):
    """Print formatted section"""
    print("\n" + "-"*70)
    print(f"  {text}")
    print("-"*70)


def check_existing_env_social():
    """Check if .env.social already exists"""
    env_social = Path('.env.social')
    if env_social.exists():
        print("\n⚠️  WARNUNG: .env.social existiert bereits!")
        response = input("Möchtest du sie überschreiben? (y/N): ").strip().lower()
        if response != 'y':
            print("Abgebrochen. Bestehende Datei wurde nicht verändert.")
            return False
    return True


def get_instagram_credentials():
    """Get Instagram credentials from user"""
    print_section("Instagram Credentials")
    
    print("\n📸 Instagram (Meta Graph API)")
    print("Hole deine Credentials von: https://developers.facebook.com/")
    print()
    
    # Check if user wants to use prepared credentials from mediakit
    use_existing = input("Hast du bereits Instagram-Credentials in .env.social? (y/N): ").strip().lower()
    if use_existing == 'y':
        try:
            with open('.env.social', 'r') as f:
                content = f.read()
                if 'INSTAGRAM_ACCESS_TOKEN' in content:
                    print("✅ Verwende bestehende Instagram-Credentials")
                    return None
        except FileNotFoundError:
            pass
    
    access_token = input("INSTAGRAM_ACCESS_TOKEN: ").strip()
    username = input("INSTAGRAM_USERNAME (z.B. festas_builds): ").strip()
    app_id = input("INSTAGRAM_APP_ID: ").strip()
    app_secret = input("INSTAGRAM_APP_SECRET: ").strip()
    
    if not all([access_token, username, app_id, app_secret]):
        print("❌ Fehler: Alle Felder müssen ausgefüllt sein!")
        return None
    
    return {
        'access_token': access_token,
        'username': username,
        'app_id': app_id,
        'app_secret': app_secret
    }


def get_tiktok_credentials():
    """Get TikTok credentials from user"""
    print_section("TikTok Credentials")
    
    print("\n🎵 TikTok (Official API)")
    print("Hole deine Credentials von: https://developers.tiktok.com/")
    print()
    
    # Check if user wants to load credentials from file
    use_prepared = input("Möchtest du Credentials aus mediakit/Instagram/TikTok/.env laden? (y/N): ").strip().lower()
    
    if use_prepared == 'y':
        tiktok_env = Path('mediakit/Instagram/TikTok/.env')
        if tiktok_env.exists():
            print(f"✅ Lade Credentials aus {tiktok_env}")
            # Load from file instead of hardcoding
            from dotenv import dotenv_values
            config = dotenv_values(tiktok_env)
            return {
                'access_token': config.get('TIKTOK_ACCESS_TOKEN', ''),
                'refresh_token': config.get('TIKTOK_REFRESH_TOKEN', ''),
                'client_key': config.get('TIKTOK_CLIENT_KEY', ''),
                'client_secret': config.get('TIKTOK_CLIENT_SECRET', '')
            }
        else:
            print(f"⚠️  Datei {tiktok_env} nicht gefunden. Manuelle Eingabe erforderlich.")
    
    print("\nBitte gib deine TikTok API Credentials ein:")
    access_token = input("TIKTOK_ACCESS_TOKEN: ").strip()
    refresh_token = input("TIKTOK_REFRESH_TOKEN: ").strip()
    client_key = input("TIKTOK_CLIENT_KEY: ").strip()
    client_secret = input("TIKTOK_CLIENT_SECRET: ").strip()
    
    if not all([access_token, refresh_token, client_key, client_secret]):
        print("❌ Fehler: Alle Felder müssen ausgefüllt sein!")
        return None
    
    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'client_key': client_key,
        'client_secret': client_secret
    }


def create_env_social(instagram_creds, tiktok_creds):
    """Create .env.social file"""
    
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    content = f"""# ============================================
# SOCIAL MEDIA API CREDENTIALS
# ============================================
# Automatisch erstellt am {timestamp}
# Diese Datei wird automatisch täglich aktualisiert
# WICHTIG: Diese Datei NIEMALS in Git committen!

"""
    
    if instagram_creds:
        content += """# ============================================
# INSTAGRAM (Meta Graph API)
# ============================================

# Long-Lived Access Token (60 Tage gültig, wird automatisch erneuert)
"""
        content += f"INSTAGRAM_ACCESS_TOKEN={instagram_creds['access_token']}\n"
        content += f"INSTAGRAM_USERNAME={instagram_creds['username']}\n"
        content += f"INSTAGRAM_APP_ID={instagram_creds['app_id']}\n"
        content += f"INSTAGRAM_APP_SECRET={instagram_creds['app_secret']}\n"
        content += "\n"
    
    if tiktok_creds:
        content += """# ============================================
# TIKTOK (TikTok Official API)
# ============================================

# Access Token (24 Stunden gültig, wird täglich automatisch erneuert)
"""
        content += f"TIKTOK_ACCESS_TOKEN={tiktok_creds['access_token']}\n"
        content += f"TIKTOK_REFRESH_TOKEN={tiktok_creds['refresh_token']}\n"
        content += f"TIKTOK_CLIENT_KEY={tiktok_creds['client_key']}\n"
        content += f"TIKTOK_CLIENT_SECRET={tiktok_creds['client_secret']}\n"
    
    # Write to file
    with open('.env.social', 'w') as f:
        f.write(content)
    
    print("\n✅ .env.social wurde erfolgreich erstellt!")
    print(f"📁 Speicherort: {Path('.env.social').absolute()}")


def show_next_steps(instagram_creds, tiktok_creds):
    """Show next steps to user"""
    
    print_header("Nächste Schritte")
    
    print("\n1️⃣  GitHub Secrets erstellen:")
    print("   Repository → Settings → Secrets → Actions → New repository secret")
    print()
    
    if instagram_creds:
        print("   Secret Name: INSTAGRAM_SECRET")
        print("   Secret Value: (Kopiere Instagram-Teil aus .env.social)")
        print()
    
    if tiktok_creds:
        print("   Secret Name: TIKTOK_SECRET")
        print("   Secret Value: (Kopiere TikTok-Teil aus .env.social)")
        print()
    
    print("2️⃣  Lokaler Test:")
    if instagram_creds:
        print("   python fetch_instagram_stats.py")
    if tiktok_creds:
        print("   python fetch_tiktok_stats.py")
    print()
    
    print("3️⃣  GitHub Actions aktivieren:")
    print("   Actions → Daily Social Media Stats Update → Run workflow")
    print()
    
    print("4️⃣  Dokumentation lesen:")
    if instagram_creds:
        print("   docs/INSTAGRAM_INTEGRATION.md")
    if tiktok_creds:
        print("   docs/TIKTOK_INTEGRATION.md")
    print()
    
    print("✨ Danach läuft alles vollautomatisch täglich um 3 Uhr UTC!")
    print()


def main():
    """Main setup function"""
    
    print_header("Social Media Integration Setup")
    print("\nDieser Assistent hilft dir bei der Konfiguration von:")
    print("  📸 Instagram (Meta Graph API)")
    print("  🎵 TikTok (Official API)")
    print("\nBeide Integrationen sind optional - du kannst auch nur eine konfigurieren.")
    
    # Check existing file
    if not check_existing_env_social():
        return 1
    
    # Get credentials
    print_section("Credentials Eingabe")
    
    setup_instagram = input("\nInstagram konfigurieren? (Y/n): ").strip().lower() != 'n'
    instagram_creds = None
    if setup_instagram:
        instagram_creds = get_instagram_credentials()
        if not instagram_creds:
            print("⚠️  Instagram Setup übersprungen")
    
    setup_tiktok = input("\nTikTok konfigurieren? (Y/n): ").strip().lower() != 'n'
    tiktok_creds = None
    if setup_tiktok:
        tiktok_creds = get_tiktok_credentials()
        if not tiktok_creds:
            print("⚠️  TikTok Setup übersprungen")
    
    if not instagram_creds and not tiktok_creds:
        print("\n❌ Keine Credentials konfiguriert. Abbruch.")
        return 1
    
    # Create file
    print_section("Datei erstellen")
    create_env_social(instagram_creds, tiktok_creds)
    
    # Show next steps
    show_next_steps(instagram_creds, tiktok_creds)
    
    print("="*70 + "\n")
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n❌ Setup abgebrochen.")
        sys.exit(1)
