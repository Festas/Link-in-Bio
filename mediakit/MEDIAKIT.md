# Media Kit - Documentation

## 📁 Overview

This folder contains all Media Kit-related content in a centralized, organized structure.

## 🗂️ Folder Structure

```
mediakit/
├── MEDIAKIT.md              # This documentation
├── templates/               # Jinja2 templates for Media Kit generation
│   ├── default.html        # Default HTML template
│   ├── pdf.html           # PDF-optimized template
│   └── email.html         # Email-friendly template
├── assets/                  # Static assets for Media Kit
│   ├── images/            # Images (logos, branding)
│   ├── css/               # Custom CSS for templates
│   └── fonts/             # Custom fonts (if any)
├── scripts/                 # Generation and utility scripts
│   ├── generate_mediakit.py   # Main generation script
│   └── export_pdf.py          # PDF export utility
├── generated/               # Generated output (gitignored)
│   ├── html/              # Generated HTML files
│   └── pdf/               # Generated PDF files
└── config/                  # Configuration files
    └── branding.json      # Branding configuration
```

## 🚀 Quick Start

### Generate Media Kit

```bash
# Generate HTML version
python mediakit/scripts/generate_mediakit.py --format html

# Generate PDF version
python mediakit/scripts/generate_mediakit.py --format pdf

# Generate both
python mediakit/scripts/generate_mediakit.py --format all
```

### Update Social Media Stats

The Media Kit automatically integrates with existing stats fetchers:

```bash
# Fetch Instagram stats (stores in database)
python fetch_instagram_stats.py

# Fetch TikTok stats (stores in database)
python fetch_tiktok_stats.py

# Or use GitHub Actions (runs daily at 3 AM UTC)
# See: .github/workflows/fetch-social-stats.yml
```

### Configuration

Edit `mediakit/config/branding.json` to customize:
- Brand colors
- Fonts
- Logo URLs
- Contact information
- Language settings

## 🎨 Template Variables

All templates support these variables from the database:

### Profile Data
- `profile.name` - Display name
- `profile.bio` - Biography
- `profile.location` - Location
- `profile.avatar_url` - Profile picture

### Social Stats (Auto-loaded)
- `instagram.followers` - Instagram follower count
- `instagram.engagement_rate` - Engagement rate
- `tiktok.followers` - TikTok follower count
- `tiktok.likes` - Total likes

### Media Kit Blocks
- `blocks` - List of all visible Media Kit blocks
  - Block types: hero, text, stats, platforms, partners, rates, cta, video, audience, custom

### Settings
- `settings.access_mode` - Access control mode
- `settings.video_pitch_url` - Video pitch URL

## 📊 Data Flow

```
┌─────────────────────────────────────────────────────────┐
│  Data Sources                                           │
├─────────────────────────────────────────────────────────┤
│  1. fetch_instagram_stats.py → social_stats_cache      │
│  2. fetch_tiktok_stats.py → social_stats_cache          │
│  3. Admin Panel → mediakit_blocks, mediakit_settings    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  Generation Script                                      │
│  mediakit/scripts/generate_mediakit.py                  │
├─────────────────────────────────────────────────────────┤
│  - Loads data from database                             │
│  - Loads template from mediakit/templates/              │
│  - Applies branding from config/branding.json           │
│  - Renders HTML/PDF                                     │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  Output                                                 │
│  mediakit/generated/                                    │
├─────────────────────────────────────────────────────────┤
│  - html/mediakit.html                                   │
│  - pdf/mediakit.pdf                                     │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Technical Details

### Database Tables Used

1. **social_stats_cache** - Cached social media statistics
   - Platform, username, stats_data (JSON), fetched_at

2. **mediakit_blocks** - Block-based content
   - Block type, title, content, position, visibility

3. **mediakit_settings** - General settings
   - Access mode, video pitch URL, etc.

4. **settings** - User profile data
   - Name, bio, avatar, social handles

### Integration with Existing Code

The Media Kit generation uses the existing:
- `app/database.py` - Database functions
- `fetch_instagram_stats.py` - Instagram data fetcher
- `fetch_tiktok_stats.py` - TikTok data fetcher
- `templates/mediakit.html` - Web view template

### Generated Files (gitignored)

All files in `mediakit/generated/` are automatically generated and should not be committed to Git. They are excluded via `.gitignore`.

## 🎯 Use Cases

### 1. Manual Generation
Generate a Media Kit snapshot for sending to brands:
```bash
python mediakit/scripts/generate_mediakit.py --format pdf --output "Brand_MediaKit_2024.pdf"
```

### 2. Automated Updates
GitHub Actions automatically updates stats daily. Generate fresh Media Kit weekly:
```bash
# In .github/workflows/generate-mediakit.yml (if created)
```

### 3. Different Versions
Generate different templates for different purposes:
```bash
# Full version for agencies
python mediakit/scripts/generate_mediakit.py --template default

# Compact version for quick emails
python mediakit/scripts/generate_mediakit.py --template email
```

## 📝 Customization Guide

### Adding New Sections

1. Create block in Admin Panel → Media Kit tab
2. Choose block type (hero, text, stats, etc.)
3. Fill in content
4. Media Kit will auto-include the block

### Changing Branding

Edit `mediakit/config/branding.json`:
```json
{
  "colors": {
    "primary": "#06b6d4",
    "secondary": "#3b82f6",
    "accent": "#8b5cf6"
  },
  "fonts": {
    "heading": "Inter",
    "body": "Inter"
  },
  "logo_url": "/static/uploads/logo.png"
}
```

### Creating Custom Templates

1. Create new template in `mediakit/templates/`
2. Use existing templates as reference
3. Include all necessary Jinja2 variables
4. Use template with `--template` flag

## 🔒 Security

- All user inputs are HTML-escaped (|e filter in templates)
- Video URLs are validated before rendering
- Percentage values are validated (0-100 range)
- XSS protection via proper escaping

## 📈 Future Enhancements

Planned features:
- [ ] Automated PDF export
- [ ] Multiple language support
- [ ] A/B testing different templates
- [ ] Analytics tracking (views, downloads)
- [ ] Integration with more platforms (YouTube, Twitter)
- [ ] Email campaign templates

## 🤝 Support

For issues or questions:
1. Check this documentation
2. Review `docs/INSTAGRAM_INTEGRATION.md` and `docs/TIKTOK_INTEGRATION.md`
3. Check Admin Panel → Media Kit tab for inline help
4. Create GitHub issue

## 📚 Related Documentation

- `docs/INSTAGRAM_INTEGRATION.md` - Instagram stats setup
- `docs/TIKTOK_INTEGRATION.md` - TikTok stats setup
- `docs/MEDIAKIT_AUTO_STATS.md` - Auto-stats feature guide
- `README.md` - Main project documentation

---

**Last Updated**: November 2024
**Version**: 2.0
