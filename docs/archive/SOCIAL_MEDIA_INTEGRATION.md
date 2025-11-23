# Social Media Data Integration

## Overview

This feature implements real-time social media data integration for the Media Kit page. Instead of manually entering follower counts and analytics, the system automatically fetches real data from your social media profiles.

## How It Works

### 1. Data Source: Profile Tab

All social media handles are read from the **Profile tab** in the admin panel, not from the Media Kit section. This ensures a single source of truth for your social media information.

Supported platforms:
- Instagram
- TikTok
- YouTube
- Twitch
- X (Twitter)
- Discord

### 2. Data Fetching

When you click "Social Stats aktualisieren" (Refresh Social Stats) in the Media Kit admin section, the system:

1. Reads your social media handles from the Profile tab settings
2. Fetches real-time data from each platform (followers, posts, engagement, etc.)
3. Stores the data in a cache for quick access
4. Updates the Media Kit with the latest numbers

### 3. Follower Summary (1000+ Filter)

The Media Kit page now includes a **Verified Follower Summary** section that:
- Only shows platforms with 1,000 or more followers
- Displays the total combined followers from qualifying platforms
- Lists each qualifying platform with its follower count
- Shows when the data was last updated

This ensures that only significant platforms are highlighted in your Media Kit.

### 4. Platform-Specific Analytics

The new **Platform Analytics** section allows viewers to:
- Select any platform from a dropdown/button list
- View detailed, platform-specific metrics:
  - **Instagram**: Followers, Following, Posts, Verified status
  - **TikTok**: Followers, Following, Likes, Videos
  - **YouTube**: Subscribers, Videos, Total Views
- See when the data was last fetched

## API Endpoints

### GET /api/mediakit/follower-summary
Returns summary of platforms with 1000+ followers.

**Response:**
```json
{
  "total_followers": 170500,
  "total_followers_formatted": "170.5k",
  "platforms": [
    {
      "platform": "instagram",
      "username": "festas_builds",
      "followers": 104700,
      "followers_formatted": "104.7k",
      "verified": false,
      "fetched_at": "2024-01-15T10:30:00Z"
    }
  ],
  "platform_count": 2
}
```

### GET /api/mediakit/analytics/{platform}
Returns detailed analytics for a specific platform.

**Response:**
```json
{
  "platform": "instagram",
  "username": "festas_builds",
  "fetched_at": "2024-01-15T10:30:00Z",
  "metrics": {
    "followers": 104700,
    "following": 523,
    "posts": 342,
    "verified": false
  }
}
```

### POST /api/mediakit/refresh-social-stats
Fetches fresh data from all configured social media profiles.

**Headers:**
```
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "message": "Social Media Statistiken erfolgreich aktualisiert",
  "data": { ... },
  "total_followers": "170.5k",
  "total_followers_raw": 170500,
  "platforms_updated": ["instagram", "tiktok"]
}
```

## Usage Instructions

### For Admins

1. **Set Up Social Handles**
   - Go to the **Profile tab** in the admin panel
   - Enter your social media handles in the appropriate fields
   - Save your profile settings

2. **Sync Social Data**
   - Navigate to the **Media Kit tab**
   - Click "Social Stats aktualisieren" (Refresh Social Stats)
   - Wait for the data to be fetched (usually 10-30 seconds)
   - Check the status message for confirmation

3. **View Results**
   - Open your Media Kit page (/mediakit)
   - The Follower Summary shows all platforms with 1000+ followers
   - The Analytics Selector allows you to view platform-specific metrics

### For Viewers

When someone visits your Media Kit:
1. They see a **Verified Follower Summary** with your total reach
2. Only platforms with significant followings (1000+) are displayed
3. They can select individual platforms to view detailed analytics
4. All data shows when it was last updated for transparency

## Technical Details

### Data Caching

Fetched social media data is cached in the `social_stats_cache` table to:
- Reduce API calls to social platforms
- Provide fast page loads
- Enable offline viewing

Cache includes:
- Platform name
- Username
- Full stats data (JSON)
- Fetch timestamp

### Data Freshness

- Data is fetched on-demand when you click "Refresh Social Stats"
- Recommended to refresh weekly or before sharing your Media Kit
- Last update timestamp is displayed to viewers for transparency

### Error Handling

If data fetching fails:
- The system shows an error message with possible reasons
- Previously cached data remains available
- Individual platform failures don't block the entire sync
- Detailed errors are logged for debugging

## Benefits

### For Content Creators

✓ **No manual data entry** - Real numbers pulled directly from platforms
✓ **Always accurate** - Data reflects your current stats
✓ **Professional presentation** - Only significant platforms shown
✓ **Platform-specific insights** - Detailed analytics for each channel
✓ **Trust and transparency** - Verifiable, timestamped data

### For Brands

✓ **Verified metrics** - Real data, not self-reported estimates
✓ **Easy comparison** - Platform-specific analytics at a glance
✓ **Quality filter** - Only platforms with 1000+ followers shown
✓ **Recent data** - See when metrics were last updated
✓ **Detailed insights** - Engagement, posts, videos, and more

## Privacy & Security

- Social media handles are read from your Profile tab (private)
- Only publicly available data is fetched
- No authentication to social platforms required
- Data is cached locally in your database
- Admin authentication required to refresh data

## Future Enhancements

Potential improvements for future versions:

1. **OAuth Integration** - Log in to social platforms for private analytics
2. **Automatic Refresh** - Scheduled background syncing
3. **Historical Tracking** - Chart growth over time
4. **More Platforms** - Support for additional social networks
5. **Engagement Metrics** - Average likes, comments, shares
6. **Audience Demographics** - Age, location, interests (requires OAuth)
7. **Competitor Analysis** - Compare with similar creators

## Troubleshooting

### No data appears after sync

**Possible causes:**
- Social handles not set in Profile tab
- Profiles are private
- Platform blocking automated requests
- Network connectivity issues

**Solutions:**
1. Verify handles in Profile tab are correct
2. Ensure profiles are public
3. Try again later if platform is rate-limiting
4. Check server logs for detailed error messages

### Wrong data displayed

**Possible causes:**
- Old cached data
- Incorrect username in Profile tab
- Platform recently changed their page structure

**Solutions:**
1. Click "Refresh Social Stats" to fetch new data
2. Verify usernames in Profile tab
3. Check if platform API/structure changed (may need code update)

### Some platforms missing

**Expected behavior:**
- Only platforms with 1000+ followers appear in Follower Summary
- Platforms with no data don't appear in Analytics Selector

**Verification:**
- Check that handle is set in Profile tab
- Confirm follower count meets threshold
- Click "Refresh Social Stats" if recently crossed 1000

## Support

For issues or feature requests, please contact the development team or open an issue on GitHub.
