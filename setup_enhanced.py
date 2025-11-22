#!/usr/bin/env python3
"""
Setup Utility for Link-in-Bio Enhanced Features
Helps configure password hashing, 2FA, and other advanced features.
"""
import sys
import os
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from app.auth_enhanced import hash_password, validate_password_strength, generate_2fa_secret, get_2fa_qr_code_url
import pyotp


def print_header(text):
    """Print a formatted header."""
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60 + "\n")


def setup_password():
    """Interactive password setup."""
    print_header("Password Setup")
    
    print("Current password security requirements:")
    print("  - Minimum 12 characters")
    print("  - At least one uppercase letter")
    print("  - At least one lowercase letter")
    print("  - At least one digit")
    print("  - At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)")
    print()
    
    while True:
        password = input("Enter new admin password: ")
        password_confirm = input("Confirm password: ")
        
        if password != password_confirm:
            print("❌ Passwords don't match. Try again.\n")
            continue
        
        is_valid, error_msg = validate_password_strength(password)
        if not is_valid:
            print(f"❌ {error_msg}\n")
            continue
        
        # Generate hash
        password_hash = hash_password(password)
        
        print("\n✅ Password is strong!")
        print("\nAdd this to your .env file:")
        print("-" * 60)
        print(f"ADMIN_PASSWORD_HASH={password_hash}")
        print("-" * 60)
        print("\n⚠️  Important: Remove or comment out ADMIN_PASSWORD in .env")
        print()
        
        # Offer to update .env automatically
        update = input("Update .env file automatically? (y/n): ").lower()
        if update == 'y':
            update_env_file(password_hash)
        
        break


def update_env_file(password_hash):
    """Update .env file with new password hash."""
    env_path = Path(__file__).parent / ".env"
    
    if not env_path.exists():
        print(f"❌ .env file not found at {env_path}")
        print("   Please create it from .env.example first")
        return
    
    # Read current .env
    with open(env_path, 'r') as f:
        lines = f.readlines()
    
    # Update or add ADMIN_PASSWORD_HASH
    hash_found = False
    hash_line_index = -1
    new_lines = []
    
    for i, line in enumerate(lines):
        if line.startswith('ADMIN_PASSWORD_HASH='):
            if not hash_found:  # Only update the first occurrence
                new_lines.append(f'ADMIN_PASSWORD_HASH={password_hash}\n')
                hash_found = True
            else:
                # Remove duplicate ADMIN_PASSWORD_HASH lines
                continue
        elif line.startswith('ADMIN_PASSWORD=') and not line.startswith('ADMIN_PASSWORD_HASH='):
            # Comment out plain password
            new_lines.append(f'# {line}')
        else:
            new_lines.append(line)
    
    # Add hash if not found
    if not hash_found:
        new_lines.append(f'\n# Generated password hash\nADMIN_PASSWORD_HASH={password_hash}\n')
    
    # Write back
    with open(env_path, 'w') as f:
        f.writelines(new_lines)
    
    print(f"✅ .env file updated successfully!")
    print("   ADMIN_PASSWORD has been commented out")
    print("   ADMIN_PASSWORD_HASH has been set")
    print("\n⚠️  Please restart your application for changes to take effect")


def setup_2fa():
    """Interactive 2FA setup."""
    print_header("Two-Factor Authentication Setup")
    
    username = input("Enter admin username (default: admin): ") or "admin"
    
    # Generate secret
    secret = generate_2fa_secret(username)
    qr_url = get_2fa_qr_code_url(username, "Link-in-Bio")
    
    print("\n✅ 2FA Secret Generated!")
    print("\nSetup Instructions:")
    print("1. Open your authenticator app (Google Authenticator, Authy, etc.)")
    print("2. Scan this QR code URL or enter the secret manually:")
    print("\nSecret Key:")
    print("-" * 60)
    print(secret)
    print("-" * 60)
    print("\nQR Code URL (open in browser):")
    print("-" * 60)
    print(qr_url)
    print("-" * 60)
    
    print("\n3. Once added, test the code:")
    
    # Test the code
    totp = pyotp.TOTP(secret)
    while True:
        code = input("\nEnter the 6-digit code from your app (or 'skip'): ")
        
        if code.lower() == 'skip':
            break
        
        if totp.verify(code, valid_window=1):
            print("✅ Code verified! 2FA is working correctly.")
            
            # Enable 2FA in .env
            enable = input("\nEnable 2FA in .env? (y/n): ").lower()
            if enable == 'y':
                enable_2fa_in_env()
            break
        else:
            print("❌ Invalid code. Try again.")
    
    print("\n⚠️  Important: Save your secret key in a secure location!")
    print("   You'll need it if you lose access to your authenticator app.")


def enable_2fa_in_env():
    """Enable 2FA in .env file."""
    env_path = Path(__file__).parent / ".env"
    
    if not env_path.exists():
        print(f"❌ .env file not found at {env_path}")
        return
    
    with open(env_path, 'r') as f:
        lines = f.readlines()
    
    new_lines = []
    require_2fa_found = False
    
    for line in lines:
        if line.startswith('REQUIRE_2FA='):
            new_lines.append('REQUIRE_2FA=true\n')
            require_2fa_found = True
        else:
            new_lines.append(line)
    
    if not require_2fa_found:
        new_lines.append('\n# Enable 2FA\nREQUIRE_2FA=true\n')
    
    with open(env_path, 'w') as f:
        f.writelines(new_lines)
    
    print("✅ 2FA enabled in .env!")
    print("   Please restart your application")


def setup_redis():
    """Interactive Redis setup."""
    print_header("Redis Cache Setup")
    
    print("Redis provides distributed caching for better performance.")
    print("This is optional but recommended for production.\n")
    
    enabled = input("Enable Redis caching? (y/n): ").lower()
    if enabled != 'y':
        print("Redis caching will remain disabled.")
        return
    
    host = input("Redis host (default: localhost): ") or "localhost"
    port = input("Redis port (default: 6379): ") or "6379"
    db = input("Redis database number (default: 0): ") or "0"
    password = input("Redis password (leave empty if none): ")
    prefix = input("Redis key prefix (default: linkinbio:): ") or "linkinbio:"
    
    print("\nAdd these to your .env file:")
    print("-" * 60)
    print("REDIS_ENABLED=true")
    print(f"REDIS_HOST={host}")
    print(f"REDIS_PORT={port}")
    print(f"REDIS_DB={db}")
    if password:
        print(f"REDIS_PASSWORD={password}")
    print(f"REDIS_PREFIX={prefix}")
    print("-" * 60)
    
    update = input("\nUpdate .env file automatically? (y/n): ").lower()
    if update == 'y':
        update_redis_in_env(host, port, db, password, prefix)


def update_redis_in_env(host, port, db, password, prefix):
    """Update Redis settings in .env file."""
    env_path = Path(__file__).parent / ".env"
    
    if not env_path.exists():
        print(f"❌ .env file not found at {env_path}")
        return
    
    with open(env_path, 'r') as f:
        content = f.read()
    
    # Add Redis config if not present
    if 'REDIS_ENABLED' not in content:
        with open(env_path, 'a') as f:
            f.write('\n# Redis Cache Configuration\n')
            f.write('REDIS_ENABLED=true\n')
            f.write(f'REDIS_HOST={host}\n')
            f.write(f'REDIS_PORT={port}\n')
            f.write(f'REDIS_DB={db}\n')
            if password:
                f.write(f'REDIS_PASSWORD={password}\n')
            f.write(f'REDIS_PREFIX={prefix}\n')
    
    print("✅ Redis configuration added to .env!")
    print("   Please restart your application")


def check_system():
    """Check system status and configuration."""
    print_header("System Check")
    
    # Check .env
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        print("✅ .env file exists")
        
        with open(env_path, 'r') as f:
            content = f.read()
        
        if 'ADMIN_PASSWORD_HASH=' in content and not content.count('ADMIN_PASSWORD_HASH=\n'):
            print("✅ Password hash configured")
        else:
            print("⚠️  Password hash not configured (run option 1)")
        
        if 'REQUIRE_2FA=true' in content:
            print("✅ 2FA enabled")
        else:
            print("ℹ️  2FA disabled (optional, see option 2)")
        
        if 'REDIS_ENABLED=true' in content:
            print("✅ Redis enabled")
        else:
            print("ℹ️  Redis disabled (optional, see option 3)")
    else:
        print("❌ .env file not found")
        print("   Copy .env.example to .env first")
    
    # Check database
    db_path = Path(__file__).parent / "linktree.db"
    if db_path.exists():
        print(f"✅ Database exists ({db_path.stat().st_size / 1024:.1f} KB)")
    else:
        print("ℹ️  Database will be created on first run")
    
    print()


def main():
    """Main menu."""
    while True:
        print("\n" + "=" * 60)
        print("  Link-in-Bio Enhanced Features Setup")
        print("=" * 60)
        print("\n1. Setup Password Hash (Recommended)")
        print("2. Setup Two-Factor Authentication (Optional)")
        print("3. Setup Redis Cache (Optional)")
        print("4. Check System Status")
        print("5. Exit")
        print()
        
        choice = input("Select an option (1-5): ")
        
        if choice == '1':
            setup_password()
        elif choice == '2':
            setup_2fa()
        elif choice == '3':
            setup_redis()
        elif choice == '4':
            check_system()
        elif choice == '5':
            print("\nGoodbye! 👋")
            break
        else:
            print("Invalid option. Please try again.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nSetup cancelled.")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
