# Social Media Token Setup Guide

This guide provides step-by-step instructions for obtaining and configuring Instagram and TikTok API tokens for the Link-in-Bio application.

## Table of Contents

1. [Overview](#overview)
2. [Instagram (Meta Graph API)](#instagram-meta-graph-api)
3. [TikTok (TikTok Official API)](#tiktok-tiktok-official-api)
4. [GitHub Secrets Configuration](#github-secrets-configuration)
5. [Local Development Setup](#local-development-setup)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### Environment Variables

The application uses the following environment variables for social media integration:

| Variable | Platform | Required | Description |
|----------|----------|----------|-------------|
| `INSTAGRAM_ACCESS_TOKEN` | Instagram | Yes | Long-lived access token (60 days) |
| `INSTAGRAM_USERNAME` | Instagram | Yes | Instagram username (without @) |
| `INSTAGRAM_APP_ID` | Instagram | For refresh | Meta App ID |
| `INSTAGRAM_APP_SECRET` | Instagram | For refresh | Meta App Secret |
| `TIKTOK_ACCESS_TOKEN` | TikTok | Yes | Access token (24 hours) |
| `TIKTOK_REFRESH_TOKEN` | TikTok | For refresh | Refresh token (1 year) |
| `TIKTOK_CLIENT_KEY` | TikTok | For refresh | TikTok App Client Key |
| `TIKTOK_CLIENT_SECRET` | TikTok | For refresh | TikTok App Client Secret |

### Token Lifetimes

| Platform | Access Token | Refresh Token | Auto-Refresh |
|----------|--------------|---------------|--------------|
| Instagram | 60 days | N/A (uses exchange) | ✅ Yes |
| TikTok | 24 hours | 1 year | ✅ Yes |

---

## Instagram (Meta Graph API)

### Prerequisites

1. **Instagram Business or Creator Account** (not Personal)
2. **Facebook Page** linked to your Instagram account
3. **Meta Developer Account** at [developers.facebook.com](https://developers.facebook.com/)

### Step 1: Convert to Business Account

If your Instagram account is Personal, you need to convert it:

1. Open Instagram app → **Settings**
2. Go to **Account** → **Switch to Professional Account**
3. Choose **Business** or **Creator**
4. **Link to a Facebook Page** when prompted
   - Create a new Facebook Page if you don't have one
   - The page name doesn't have to match your Instagram

### Step 2: Create a Meta Developer App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Select **Business** as the app type
4. Fill in your app details and click **Create App**

### Step 3: Add Required Products

In your app dashboard:

1. Click **Add Product** in the left sidebar
2. Find **Instagram Basic Display** and click **Set Up**
3. Add **Facebook Login** product as well

### Step 4: Configure App Permissions

1. Go to **App Review** → **Permissions and Features**
2. Request the following permissions:
   - `instagram_basic` - Read Instagram profile info
   - `pages_read_engagement` - Read Facebook Page data
   - `instagram_manage_insights` - Read Instagram insights

### Step 5: Generate Access Token

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app from the dropdown
3. Click **Generate Access Token**
4. Grant all requested permissions
5. Copy the generated token

### Step 6: Exchange for Long-Lived Token

The token from Graph API Explorer is short-lived (1 hour). Exchange it:

```bash
curl -X GET "https://graph.facebook.com/v18.0/oauth/access_token?\
grant_type=fb_exchange_token&\
client_id=YOUR_APP_ID&\
client_secret=YOUR_APP_SECRET&\
fb_exchange_token=YOUR_SHORT_LIVED_TOKEN"
```

The response contains your long-lived token (60 days):

```json
{
  "access_token": "EAAI...",
  "token_type": "bearer",
  "expires_in": 5184000
}
```

### Step 7: Get Your Credentials

Collect these values:

```
INSTAGRAM_ACCESS_TOKEN=EAAI... (from step 6)
INSTAGRAM_USERNAME=your_instagram_handle (without @)
INSTAGRAM_APP_ID=123456789 (from app dashboard)
INSTAGRAM_APP_SECRET=abc123... (from app dashboard → Settings → Basic)
```

---

## TikTok (TikTok Official API)

### Prerequisites

1. **TikTok Account** with public videos
2. **TikTok Developer Account** at [developers.tiktok.com](https://developers.tiktok.com/)

### Step 1: Create a TikTok Developer App

1. Go to [TikTok Developer Portal](https://developers.tiktok.com/)
2. Click **Manage apps** → **Connect an app**
3. Fill in app details:
   - **App name**: Your app name
   - **Description**: Brief description
   - **Category**: Select appropriate category
4. Click **Confirm** to create the app

### Step 2: Configure App Scopes

1. In your app settings, go to **Manage products**
2. Enable **Login Kit**
3. Add these scopes:
   - `user.info.basic` - Read user profile
   - `video.list` - List user's videos (optional, for engagement metrics)

### Step 3: Set Redirect URI

1. Go to **Configuration** → **Platform**
2. Add a redirect URI:
   - For development: `http://localhost:8000/callback`
   - For production: `https://your-domain.com/callback`

### Step 4: Complete OAuth Flow

TikTok requires completing an OAuth flow to get tokens. You can use this helper script:

```python
#!/usr/bin/env python3
"""
TikTok OAuth Helper Script
Run this locally to complete the OAuth flow and get your tokens.
"""
import webbrowser
from urllib.parse import urlencode

# Replace with your app credentials
CLIENT_KEY = "your_client_key"
REDIRECT_URI = "http://localhost:8000/callback"
SCOPES = "user.info.basic,video.list"

# Step 1: Generate authorization URL
auth_url = "https://www.tiktok.com/v2/auth/authorize/?" + urlencode({
    "client_key": CLIENT_KEY,
    "scope": SCOPES,
    "response_type": "code",
    "redirect_uri": REDIRECT_URI,
})

print("Opening browser for TikTok authorization...")
print(f"URL: {auth_url}")
webbrowser.open(auth_url)

# Step 2: After authorization, you'll be redirected to your callback URL
# with a 'code' parameter. Extract that code.
print("\n" + "="*60)
print("After authorizing, copy the 'code' parameter from the URL")
print("="*60)
code = input("Enter the authorization code: ")

# Step 3: Exchange code for tokens
print("\nRun this curl command to get your tokens:")
print("-"*60)
print(f"""
curl -X POST 'https://open.tiktokapis.com/v2/oauth/token/' \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  -d 'client_key={CLIENT_KEY}' \\
  -d 'client_secret=YOUR_CLIENT_SECRET' \\
  -d 'code={code}' \\
  -d 'grant_type=authorization_code' \\
  -d 'redirect_uri={REDIRECT_URI}'
""")
```

### Step 5: Exchange Code for Tokens

After authorization, exchange the code for tokens:

```bash
curl -X POST 'https://open.tiktokapis.com/v2/oauth/token/' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_key=YOUR_CLIENT_KEY' \
  -d 'client_secret=YOUR_CLIENT_SECRET' \
  -d 'code=AUTHORIZATION_CODE' \
  -d 'grant_type=authorization_code' \
  -d 'redirect_uri=YOUR_REDIRECT_URI'
```

Response:

```json
{
  "access_token": "act.xxx...",
  "expires_in": 86400,
  "refresh_token": "rft.xxx...",
  "refresh_expires_in": 31536000,
  "scope": "user.info.basic,video.list",
  "token_type": "Bearer"
}
```

### Step 6: Get Your Credentials

Collect these values:

```
TIKTOK_ACCESS_TOKEN=act.xxx... (from token response)
TIKTOK_REFRESH_TOKEN=rft.xxx... (from token response)
TIKTOK_CLIENT_KEY=awxxx... (from app dashboard)
TIKTOK_CLIENT_SECRET=xxx... (from app dashboard)
```

---

## GitHub Secrets Configuration

### Step 1: Navigate to Repository Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

### Step 2: Create INSTAGRAM_SECRET

Create a secret named `INSTAGRAM_SECRET` with this content:

```
INSTAGRAM_ACCESS_TOKEN=your_long_lived_token_here
INSTAGRAM_USERNAME=your_instagram_username
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret
```

### Step 3: Create TIKTOK_SECRET

Create a secret named `TIKTOK_SECRET` with this content:

```
TIKTOK_ACCESS_TOKEN=your_access_token_here
TIKTOK_REFRESH_TOKEN=your_refresh_token_here
TIKTOK_CLIENT_KEY=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
```

### Step 4: SSH Secrets for Deployment

For the test workflow to connect to your server, also configure:

| Secret | Description |
|--------|-------------|
| `HOST` | Server IP address or hostname |
| `USERNAME` | SSH username (e.g., `deploy`) |
| `SSH_PRIVATE_KEY` | SSH private key for authentication |

---

## Local Development Setup

### Step 1: Create .env.social File

Create a file named `.env.social` in your project root:

```bash
cp .env.social.example .env.social
```

### Step 2: Add Your Credentials

Edit `.env.social` with your real credentials:

```bash
# Instagram API Credentials
INSTAGRAM_ACCESS_TOKEN=EAAI...your_token_here
INSTAGRAM_USERNAME=your_instagram_handle
INSTAGRAM_APP_ID=123456789
INSTAGRAM_APP_SECRET=abc123def456

# TikTok API Credentials
TIKTOK_ACCESS_TOKEN=act.xxx...your_token_here
TIKTOK_REFRESH_TOKEN=rft.xxx...your_refresh_token
TIKTOK_CLIENT_KEY=awxxx...your_client_key
TIKTOK_CLIENT_SECRET=xxx...your_secret
```

### Step 3: Test Locally

```bash
# Test Instagram
python fetch_instagram_stats.py

# Test TikTok
python fetch_tiktok_stats.py
```

---

## Troubleshooting

### Instagram Issues

#### "No Instagram Business Account found"

**Cause**: Your Instagram account is not a Business/Creator account, or it's not linked to a Facebook Page.

**Solution**:
1. Open Instagram app → Settings → Account
2. Switch to Professional Account → Choose Business
3. Link to a Facebook Page when prompted
4. Regenerate your access token

#### "Token expired or invalid"

**Cause**: The long-lived token has expired (60 days) or was revoked.

**Solution**:
1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Generate a new short-lived token
3. Exchange for long-lived token (see Step 6 above)
4. Update `INSTAGRAM_SECRET` in GitHub Secrets

#### "Permission denied" or Error Code 10

**Cause**: Missing required permissions on your Meta app.

**Solution**:
1. Go to your Meta App → App Review → Permissions
2. Request `instagram_basic` and `pages_read_engagement`
3. Regenerate your access token after permissions are granted

### TikTok Issues

#### "401 Unauthorized"

**Cause**: Access token has expired (24 hours).

**Solution**:
1. If you have a refresh token, the system should auto-refresh
2. If auto-refresh fails, re-run the OAuth flow
3. Update `TIKTOK_SECRET` in GitHub Secrets

#### "invalid_grant" Error

**Cause**: Refresh token is invalid or expired (1 year lifetime).

**Solution**:
1. Complete the OAuth flow again from scratch
2. Save both new access_token and refresh_token
3. Update `TIKTOK_SECRET` in GitHub Secrets

#### "scope_not_authorized"

**Cause**: Your app doesn't have the required scopes.

**Solution**:
1. Go to TikTok Developer Portal → Your App → Manage Products
2. Enable Login Kit with `user.info.basic` scope
3. Re-authorize your account with the new scopes

### General Issues

#### GitHub Actions workflow fails with "secrets missing"

**Cause**: Required GitHub Secrets are not configured.

**Solution**:
1. Go to Repository → Settings → Secrets → Actions
2. Add all required secrets (see [GitHub Secrets Configuration](#github-secrets-configuration))

#### ".env.social not found"

**Cause**: The credentials file doesn't exist on the server.

**Solution**:
1. Ensure `INSTAGRAM_SECRET` and/or `TIKTOK_SECRET` are set in GitHub Secrets
2. Re-run the deployment workflow to create the file
3. Or manually create the file on the server

---

## Additional Resources

- [Meta Graph API Documentation](https://developers.facebook.com/docs/graph-api/)
- [Instagram Business Account Setup](https://help.instagram.com/502981923235522)
- [TikTok Developer Documentation](https://developers.tiktok.com/doc/overview)
- [TikTok OAuth Guide](https://developers.tiktok.com/doc/oauth-user-access-token-management)

---

## Support

If you encounter issues not covered in this guide:

1. Check the existing documentation:
   - [docs/INSTAGRAM_INTEGRATION.md](./INSTAGRAM_INTEGRATION.md)
   - [docs/TIKTOK_INTEGRATION.md](./TIKTOK_INTEGRATION.md)
2. Review GitHub Actions logs for detailed error messages
3. Open an issue on GitHub with:
   - Steps to reproduce
   - Error messages (without tokens!)
   - Platform and environment details
