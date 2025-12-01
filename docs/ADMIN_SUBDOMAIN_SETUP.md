# Admin Subdomain Setup Guide

This guide explains how to set up the admin subdomain (`admin.your-domain.com`) for your Link-in-Bio installation.

## Quick Verification Checklist ✅

Use this checklist to verify your admin subdomain is correctly configured:

### 1. DNS Check
```bash
# Check if DNS is resolving (run from your local machine or terminal)
nslookup admin.festas-builds.com

# Or using dig
dig admin.festas-builds.com +short

# Expected: Should return your server IP (e.g., 185.207.250.174)
```

### 2. Online DNS Checker
Visit [DNS Checker](https://dnschecker.org/#A/admin.festas-builds.com) to verify global DNS propagation.

### 3. Admin Subdomain Status Check (Recommended)
```bash
# Test if the admin subdomain middleware is working correctly
curl -s https://admin.festas-builds.com/status | jq .

# Expected response:
# {
#   "status": "ok",
#   "subdomain_detected": "admin",
#   "is_admin_subdomain": true,
#   "host": "admin.festas-builds.com",
#   "message": "Admin subdomain is correctly configured!",
#   ...
# }
```

Or simply open in your browser: **https://admin.festas-builds.com/status**

### 4. Admin Panel Access
Open these URLs in your browser:
- **Status Check**: `https://admin.festas-builds.com/status` (no auth required)
- **Login**: `https://admin.festas-builds.com/login`
- **Dashboard**: `https://admin.festas-builds.com/` (after login)
- **Health Check**: `https://admin.festas-builds.com/health`

### 5. Server-Side Verification (SSH to your server)
```bash
# Check if Caddy is running and serving both domains
docker compose logs caddy --tail=20

# Check if linktree app is responding
docker compose logs linktree --tail=20

# Test internal routing with admin subdomain simulation
curl -H "Host: admin.festas-builds.com" http://localhost:8000/status

# Expected: JSON with "is_admin_subdomain": true
```

---

## Overview

The admin panel is now accessible via a subdomain instead of a path:
- **Before**: `https://festas-builds.com/admin/mediakit`
- **After**: `https://admin.festas-builds.com/mediakit`

This provides:
- Better security separation between public and admin content
- Cleaner URLs for admin functionality
- Easier configuration of different access policies per subdomain

## DNS Configuration

### Step 1: Add DNS Records

You need to add a DNS record for the `admin` subdomain pointing to the same server as your main domain.

#### Option A: Using A Record (Recommended)
If your main domain uses an A record pointing to an IP address:

```
Type: A
Name: admin
Value: <your-server-ip>
TTL: 3600 (or your preference)
```

**Example:**
```
Type: A
Name: admin
Value: 123.45.67.89
TTL: 3600
```

#### Option B: Using CNAME Record
If you prefer, you can use a CNAME pointing to your main domain:

```
Type: CNAME
Name: admin
Value: festas-builds.com
TTL: 3600
```

**Note:** Some DNS providers may require the trailing dot: `festas-builds.com.`

### Step 2: Common DNS Providers

#### Cloudflare
1. Log in to Cloudflare Dashboard
2. Select your domain
3. Go to "DNS" → "Records"
4. Click "Add record"
5. Select Type: A (or CNAME)
6. Name: `admin`
7. IPv4 address: Your server IP (or target domain for CNAME)
8. Proxy status: Proxied (orange cloud) - recommended for SSL
9. Click "Save"

#### Namecheap
1. Log in to Namecheap
2. Go to "Domain List" → Select your domain
3. Click "Advanced DNS"
4. Click "Add New Record"
5. Select Type: A Record (or CNAME)
6. Host: `admin`
7. Value: Your server IP (or target domain)
8. TTL: Automatic
9. Click the checkmark to save

#### GoDaddy
1. Log in to GoDaddy
2. Go to "My Products" → "DNS"
3. Click "Add" under "Records"
4. Type: A (or CNAME)
5. Host: `admin`
6. Points to: Your server IP
7. TTL: Default
8. Click "Save"

#### DigitalOcean
1. Log in to DigitalOcean
2. Go to "Networking" → "Domains"
3. Select your domain
4. Create a new record:
   - Type: A
   - Hostname: `admin`
   - Will direct to: Your droplet/IP
5. Click "Create Record"

#### AWS Route 53
1. Log in to AWS Console
2. Go to Route 53 → Hosted zones
3. Select your domain
4. Click "Create record"
5. Record name: `admin`
6. Record type: A
7. Value: Your server IP
8. Click "Create records"

## Server Configuration

### Caddyfile (Already Updated)
The Caddyfile has been updated to handle both domains:

```caddyfile
# Main domain - public-facing Link-in-Bio site
festas-builds.com {
    reverse_proxy linktree:8000
}

# Admin subdomain - administrative interface
admin.festas-builds.com {
    reverse_proxy linktree:8000
}
```

### SSL Certificates
Caddy automatically obtains and manages SSL certificates for both domains. No additional configuration is needed.

## Testing

### Step 1: Verify DNS Propagation
After adding DNS records, wait for propagation (usually 5-30 minutes, can take up to 48 hours).

Check propagation status:
```bash
# Using dig
dig admin.festas-builds.com

# Using nslookup
nslookup admin.festas-builds.com

# Or use online tools:
# - https://dnschecker.org
# - https://whatsmydns.net
```

### Step 2: Test Admin Access
Once DNS is propagated:

1. Open `https://admin.festas-builds.com/login` in your browser
2. You should see the login page
3. Log in with your admin credentials
4. Access admin pages:
   - Dashboard: `https://admin.festas-builds.com/`
   - Media Kit: `https://admin.festas-builds.com/mediakit`
   - Impressum: `https://admin.festas-builds.com/impressum`
   - etc.

## Admin Panel Routes

On the admin subdomain, the following routes are available:

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/status` | Subdomain configuration status check | No |
| `/login` | Login page | No |
| `/` | Main admin dashboard | Yes |
| `/analytics` | Analytics dashboard | Yes |
| `/mediakit` | Media Kit editor | Yes |
| `/impressum` | Impressum editor | Yes |
| `/datenschutz` | Privacy policy editor | Yes |
| `/ueber-mich` | About page editor | Yes |
| `/kontakt` | Contact page editor | Yes |

## Security Considerations

### Recommended: Restrict Admin Access by IP (Optional)
You can add IP restrictions in Caddyfile for enhanced security:

```caddyfile
admin.festas-builds.com {
    # Only allow access from specific IPs
    @blocked {
        not remote_ip 123.45.67.89  # Your IP
    }
    respond @blocked 403
    
    reverse_proxy linktree:8000
}
```

### Recommended: Use Strong Passwords
1. Update your `.env` file with a strong password hash:
```bash
# Generate password hash
python -c 'from app.auth_unified import hash_password; print(hash_password("YourSecurePassword123!"))'
```

2. Set `ADMIN_PASSWORD_HASH` in `.env`:
```
ADMIN_PASSWORD_HASH=$2b$12$...your-generated-hash...
```

### Enable Two-Factor Authentication
Set in `.env`:
```
REQUIRE_2FA=true
```

## Troubleshooting

### "Site not reachable" errors
1. Check DNS propagation status
2. Verify Caddy is running: `docker-compose logs caddy`
3. Check if ports 80/443 are open

### SSL Certificate Issues
1. Check Caddy logs: `docker-compose logs caddy`
2. Ensure DNS is properly configured
3. Wait for Let's Encrypt rate limits if you've requested too many certificates

### 404 Errors on Admin Pages
1. Restart the application: `docker-compose restart linktree`
2. Check application logs: `docker-compose logs linktree`
3. Ensure you're accessing via the admin subdomain, not the main domain

## Migration Notes

If you're upgrading from the path-based admin panel (`/admin/mediakit`), note that:

1. Old bookmarks to `/admin/mediakit` will no longer work for special page editing
2. The main `/admin` route still works for the general admin dashboard
3. All API endpoints remain unchanged (`/api/special-pages/*`)
4. JavaScript and authentication flow remains the same

## Need Help?

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Review DNS configuration
3. Test with `curl -v https://admin.festas-builds.com/health`
