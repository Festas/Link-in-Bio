# 🔄 Migration Guide: Switch to Link-in-Bio

## Why Migrate?

### Cost Savings Calculator

**Linktree Premium User ($24/month):**
```
Annual subscription: $288
Transaction fees (2-5%): $250-625 on $12.5k sales
Total annual cost: $538-913
---
Link-in-Bio cost: $60-240 (VPS hosting)
Annual savings: $298-673 💰
```

**Beacons.ai Pro User ($10/month):**
```
Annual subscription: $120
Transaction fees (2.5-9%): $312-1,125 on $12.5k sales
Total annual cost: $432-1,245
---
Link-in-Bio cost: $60-240 (VPS hosting)
Annual savings: $192-1,005 💰
```

**For a creator earning $100k/year:**
- Beacons.ai: ~$2,500-9,000 in fees
- Linktree: ~$2,000-5,000 in fees
- Link-in-Bio: **$0 in fees** ✨
- **Savings: $2,000-9,000/year**

### Feature Comparison

| Feature | Link-in-Bio | Beacons.ai | Linktree |
|---------|-------------|------------|----------|
| **Transaction Fees** | ✅ 0% | ❌ 2.5-9% | ❌ 2-5% |
| **Self-Hosted** | ✅ Yes | ❌ No | ❌ No |
| **Data Ownership** | ✅ 100% | ❌ No | ❌ No |
| **2FA Security** | ✅ Free | ⚠️ Paid | ⚠️ Paid |
| **Advanced Analytics** | ✅ Free | ✅ Yes | ⚠️ $9-24/mo |
| **Media Kit** | ✅ Free | ✅ Yes | ❌ No |
| **Multiple Pages** | ✅ Unlimited | ❌ Single | ❌ Single |
| **Custom CSS** | ✅ Yes | ❌ Limited | ❌ Limited |
| **Open Source** | ✅ Yes | ❌ No | ❌ No |
| **Monthly Cost** | $5-20 VPS | $0-10 | $0-24 |

---

## 📥 Migrate from Linktree

### Step 1: Export Your Data

**Manual Export:**
1. Open your Linktree admin panel
2. Copy all link URLs and titles
3. Download profile picture
4. Save your bio and description
5. Export analytics (if available)

**Automated Export (coming soon):**
```bash
# Will be available in future version
python migrate_from_linktree.py --username your-username
```

### Step 2: Setup Link-in-Bio

```bash
# Clone repository
git clone https://github.com/Festas/Link-in-Bio.git
cd Link-in-Bio

# Install dependencies
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run setup wizard
python setup_enhanced.py
```

### Step 3: Import Your Content

**1. Profile Setup:**
- Go to Admin → Profile & Design
- Upload your profile picture
- Add your name and bio
- Set your social media handles

**2. Add Links:**
- Go to Admin → Items
- Click "Add Item"
- For each Linktree link:
  - Type: "Link"
  - Title: [your title]
  - URL: [your URL]
  - Click "Auto-scrape" for thumbnail
  - Save

**3. Customize Design:**
- Choose theme (similar to your Linktree design)
- Set colors (primary, secondary, accent)
- Adjust fonts
- Enable/disable effects

**4. Setup Analytics:**
- Analytics are automatic
- No additional setup needed
- Visit Admin → Analytics to view

### Step 4: Update Your Social Media Links

**Before going live, test:**
1. Visit `http://localhost:8000` (or your domain)
2. Check all links work
3. Test on mobile
4. Verify design looks good

**Update your social profiles:**
- Instagram bio
- TikTok bio
- Twitter/X bio
- YouTube description
- Other platforms

**Change from:**
```
linktr.ee/yourusername
```

**To:**
```
yourdomain.com
```

### Step 5: Setup Analytics Tracking

**UTM Parameters (for campaigns):**
```
https://yourdomain.com/?utm_source=instagram&utm_medium=bio&utm_campaign=launch
```

**Track conversions:**
- Go to Admin → Analytics
- View conversion funnel
- Monitor performance

---

## 📥 Migrate from Beacons.ai

### Step 1: Export Your Data

**Manual Export:**
1. Open Beacons.ai dashboard
2. Copy all content blocks
3. Export media kit (if you have one)
4. Save email subscriber list
5. Download any uploaded files

### Step 2: Setup Link-in-Bio

```bash
# Same as Linktree migration
git clone https://github.com/Festas/Link-in-Bio.git
cd Link-in-Bio
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python setup_enhanced.py
```

### Step 3: Recreate Your Content

**1. Profile:**
- Admin → Profile & Design
- Upload profile picture
- Add bio and social handles

**2. Links & Content Blocks:**

Beacons.ai uses various block types. Here's how to migrate each:

**Text Block → Header Item**
- Type: "Header"
- Title: [your text]

**Link Block → Link Item**
- Type: "Link"
- Title: [title]
- URL: [url]

**Video Block → Video Item**
- Type: "Video"
- Title: [title]
- URL: [YouTube/Vimeo/Twitch URL]

**Product Block → Product Item**
- Type: "Product"
- Title: [product name]
- URL: [product link]
- Price: [price]
- Upload product image

**Email Form → Email Form Item**
- Type: "Email Form"
- Title: "Join my newsletter"
- (Newsletter subscribers stored in Community tab)

**3. Media Kit:**
- Go to Admin → Media Kit
- Add blocks (hero, stats, platforms, etc.)
- Configure social media stats:
  ```bash
  # Setup Instagram stats
  python fetch_instagram_stats.py
  
  # Setup TikTok stats
  python fetch_tiktok_stats.py
  ```
- Generate media kit:
  ```bash
  python mediakit/scripts/generate_mediakit.py
  ```

**4. Email Subscribers:**
- Export from Beacons.ai
- Import to Link-in-Bio database:
  ```bash
  # CSV import (coming soon)
  python import_subscribers.py subscribers.csv
  ```

### Step 4: Monetization (E-commerce coming soon)

**Current Status:**
- ⏳ Stripe integration planned
- ⏳ Product catalog planned
- ⏳ Digital downloads planned

**Temporary Workaround:**
- Use external payment links (Gumroad, Stripe Payment Links)
- Add as regular links
- Track clicks in analytics

**Future (Phase 2):**
- Direct Stripe integration
- Built-in product catalog
- Order management
- Digital product delivery

---

## 🚀 Advanced Migration

### Custom Domain Setup

**1. Get a Domain:**
- Namecheap, Google Domains, Cloudflare
- ~$10-15/year

**2. Point DNS to Your Server:**
```
A Record: @ → Your-Server-IP
A Record: www → Your-Server-IP
```

**3. Configure Caddy (auto-SSL):**
```bash
# Edit Caddyfile
yourdomain.com {
    reverse_proxy localhost:8000
}
```

**4. Restart Caddy:**
```bash
docker-compose restart caddy
```

SSL certificates are automatic via Let's Encrypt! 🎉

### Import Analytics Data

**Export from Linktree/Beacons:**
- Download analytics CSV (if available)

**Import to Link-in-Bio:**
```bash
# Historical data import (coming soon)
python import_analytics.py --source linktree --file analytics.csv
```

### Batch Link Import

**Create a CSV:**
```csv
type,title,url,description
link,Instagram,https://instagram.com/yourusername,Follow me on Instagram
link,YouTube,https://youtube.com/@yourname,Subscribe to my channel
product,My Ebook,$29,https://gumroad.com/ebook,Download my ebook
video,Latest Video,https://youtube.com/watch?v=abc123,Check out my latest video
```

**Import:**
```bash
# Batch import (coming soon)
python import_items.py links.csv
```

---

## 🔧 Hosting Options

### Option 1: VPS (Recommended)

**Providers:**
- DigitalOcean ($5-10/month)
- Linode ($5-10/month)
- Vultr ($5-10/month)
- Hetzner ($5-10/month, EU)

**Pros:**
- Full control
- No limits
- Cheap
- Easy scaling

**Cons:**
- Requires basic Linux knowledge
- You manage updates

**Setup Time:** 30 minutes

### Option 2: PaaS (Easiest)

**Providers:**
- Render.com (Free tier available)
- Railway.app (Free $5/month credit)
- Fly.io (Free tier available)

**Pros:**
- Easiest setup
- Automatic scaling
- Managed infrastructure

**Cons:**
- More expensive long-term
- Less control

**Setup Time:** 10 minutes

### Option 3: Self-Hosted (Free)

**Requirements:**
- Raspberry Pi or old computer
- Internet connection
- Dynamic DNS (free)

**Pros:**
- Completely free
- Full control
- Learning experience

**Cons:**
- Requires technical knowledge
- Depends on your internet
- Manual security updates

**Setup Time:** 1-2 hours

---

## 📊 Post-Migration Checklist

### Week 1: Validation
- [ ] All links working
- [ ] Profile looks correct
- [ ] Design matches brand
- [ ] Mobile responsive
- [ ] Analytics tracking

### Week 2: Optimization
- [ ] Setup UTM tracking
- [ ] Configure conversion goals
- [ ] Test email signup
- [ ] Check page speed
- [ ] Setup backups

### Month 1: Growth
- [ ] Monitor analytics
- [ ] A/B test link order
- [ ] Add new content
- [ ] Engage subscribers
- [ ] Optimize conversions

### Ongoing:
- [ ] Weekly analytics review
- [ ] Monthly content updates
- [ ] Quarterly design refresh
- [ ] Regular backups
- [ ] Security updates

---

## 🆘 Troubleshooting

### "Links not working"
**Solution:**
- Check URL format (must include `https://`)
- Verify link is public/accessible
- Test link in browser

### "Analytics not tracking"
**Solution:**
- Wait 5-10 minutes (data syncs)
- Clear browser cache
- Check if JavaScript is enabled
- Verify analytics endpoints working

### "Can't upload images"
**Solution:**
- Check file size (< 5MB)
- Verify file format (JPG, PNG, GIF)
- Check disk space
- Review upload permissions

### "Domain not working"
**Solution:**
- Verify DNS propagation (24-48 hours)
- Check DNS records (A record)
- Test with `ping yourdomain.com`
- Check Caddy logs

### "Email form not working"
**Solution:**
- Check form submission in browser console
- Verify database connection
- Check email validation
- Review server logs

---

## 💡 Tips for Success

### 1. Keep It Simple
- Start with basic setup
- Add features gradually
- Don't overcomplicate

### 2. Test Everything
- Test on mobile
- Test all links
- Test forms
- Test analytics

### 3. Monitor Performance
- Check page speed
- Review analytics weekly
- Monitor server resources
- Track conversions

### 4. Engage Community
- Join GitHub discussions
- Share feedback
- Contribute improvements
- Help others migrate

### 5. Plan Growth
- Document your setup
- Keep backups
- Plan for scaling
- Budget for hosting

---

## 📚 Resources

### Documentation:
- [Setup Guide](./QUICK_START.md)
- [Advanced Features](./ENHANCED_FEATURES.md)
- [API Documentation](../README.md#api)
- [Troubleshooting](./TROUBLESHOOTING.md)

### Community:
- [GitHub Discussions](https://github.com/Festas/Link-in-Bio/discussions)
- [Issues](https://github.com/Festas/Link-in-Bio/issues)
- [Discord](https://discord.gg/linkinbio) (coming soon)

### Support:
- [GitHub Issues](https://github.com/Festas/Link-in-Bio/issues)
- [Documentation](../docs/)
- [Video Tutorials](https://youtube.com/@linkinbio) (coming soon)

---

## 🎉 Welcome to Link-in-Bio!

**You've made the right choice:**
- ✅ Zero transaction fees = more money
- ✅ Self-hosted = full control
- ✅ Open source = forever free
- ✅ Privacy-first = your data
- ✅ No limits = unlimited potential

**Questions?** Open an issue on GitHub!

**Need help?** Check our documentation or join the community!

**Want to contribute?** PRs are welcome!

---

**Made with ❤️ by the Link-in-Bio community**

**Last Updated:** November 2025
**Version:** 1.0
