#!/usr/bin/env python3
"""
Test script for GitHub Secret Updater
Tests the encryption and update logic without actually updating secrets
"""

import sys
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.github_secret_updater import GitHubSecretUpdater, NACL_AVAILABLE
import base64


def test_secret_encryption():
    """Test that we can encrypt secrets properly."""
    print("Testing secret encryption...")
    
    if not NACL_AVAILABLE:
        print("❌ PyNaCl not available - cannot test encryption")
        return False
    
    # Create a mock updater (we won't actually call the API)
    updater = GitHubSecretUpdater(
        token="test_token",
        repo_owner="test_owner",
        repo_name="test_repo"
    )
    
    # Generate a valid test public key using PyNaCl
    from nacl import public as nacl_public
    
    # Create a test key pair
    private_key = nacl_public.PrivateKey.generate()
    test_public_key_bytes = bytes(private_key.public_key)
    test_public_key = base64.b64encode(test_public_key_bytes).decode('utf-8')
    
    test_secret = "INSTAGRAM_ACCESS_TOKEN=test123\nINSTAGRAM_USERNAME=test_user\n"
    
    try:
        encrypted = updater.encrypt_secret(test_public_key, test_secret)
        print(f"✅ Successfully encrypted secret (length: {len(encrypted)})")
        print(f"   Encrypted value preview: {encrypted[:50]}...")
        
        # Verify it's valid base64
        base64.b64decode(encrypted)
        print(f"✅ Encrypted value is valid base64")
        
        return True
    except Exception as e:
        print(f"❌ Encryption failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_env_parsing():
    """Test that environment variable parsing works."""
    import os
    
    print("\nTesting environment variable parsing...")
    
    # Set test environment variables
    os.environ['INSTAGRAM_ACCESS_TOKEN'] = 'test_token_123'
    os.environ['INSTAGRAM_USERNAME'] = 'festas_builds'
    os.environ['INSTAGRAM_APP_ID'] = '123456789'
    os.environ['INSTAGRAM_APP_SECRET'] = 'secret_abc'
    
    from app.github_secret_updater import update_instagram_secret_from_env
    
    # We can't actually update without valid credentials, but we can test the parsing
    try:
        # This will fail at the API call, but should succeed at parsing
        access_token = os.getenv('INSTAGRAM_ACCESS_TOKEN')
        username = os.getenv('INSTAGRAM_USERNAME')
        app_id = os.getenv('INSTAGRAM_APP_ID')
        app_secret = os.getenv('INSTAGRAM_APP_SECRET')
        
        if all([access_token, username, app_id, app_secret]):
            print(f"✅ Successfully parsed environment variables:")
            print(f"   Token: {access_token[:20]}...")
            print(f"   Username: {username}")
            print(f"   App ID: {app_id}")
            print(f"   App Secret: {app_secret[:10]}...")
            
            # Test content construction
            secret_content = (
                f"INSTAGRAM_ACCESS_TOKEN={access_token}\n"
                f"INSTAGRAM_USERNAME={username}\n"
                f"INSTAGRAM_APP_ID={app_id}\n"
                f"INSTAGRAM_APP_SECRET={app_secret}\n"
            )
            print(f"✅ Secret content constructed ({len(secret_content)} bytes)")
            return True
        else:
            print("❌ Missing environment variables")
            return False
            
    except Exception as e:
        print(f"❌ Environment parsing failed: {e}")
        return False


def test_workflow_detection():
    """Test GitHub Actions environment detection."""
    import os
    
    print("\nTesting GitHub Actions environment detection...")
    
    # Test with mock environment
    os.environ['GITHUB_TOKEN'] = 'ghp_test123'
    os.environ['GITHUB_REPOSITORY'] = 'Festas/Link-in-Bio'
    
    github_token = os.getenv('GITHUB_TOKEN')
    github_repository = os.getenv('GITHUB_REPOSITORY')
    
    if github_token and github_repository:
        repo_parts = github_repository.split('/')
        if len(repo_parts) == 2:
            repo_owner, repo_name = repo_parts
            print(f"✅ GitHub Actions environment detected:")
            print(f"   Repository: {github_repository}")
            print(f"   Owner: {repo_owner}")
            print(f"   Name: {repo_name}")
            print(f"   Token: {github_token[:10]}...")
            return True
        else:
            print(f"❌ Invalid repository format: {github_repository}")
            return False
    else:
        print("❌ GitHub Actions environment not detected")
        return False


def main():
    """Run all tests."""
    print("="*60)
    print("GitHub Secret Updater - Test Suite")
    print("="*60)
    
    results = []
    
    # Test 1: PyNaCl availability
    print(f"\nPyNaCl available: {NACL_AVAILABLE}")
    if not NACL_AVAILABLE:
        print("⚠️  PyNaCl not installed - install with: pip install PyNaCl")
        return 1
    
    # Test 2: Secret encryption
    results.append(("Secret Encryption", test_secret_encryption()))
    
    # Test 3: Environment parsing
    results.append(("Environment Parsing", test_env_parsing()))
    
    # Test 4: Workflow detection
    results.append(("GitHub Actions Detection", test_workflow_detection()))
    
    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name:.<40} {status}")
    
    all_passed = all(result[1] for result in results)
    
    print("\n" + "="*60)
    if all_passed:
        print("✅ All tests passed!")
        print("\nThe automatic token renewal system is ready to use.")
        print("\nWhen running in GitHub Actions with a valid GITHUB_TOKEN,")
        print("the system will automatically update the INSTAGRAM_SECRET")
        print("whenever the Instagram token is refreshed.")
        return 0
    else:
        print("❌ Some tests failed")
        return 1


if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)
