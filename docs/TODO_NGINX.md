# TODO: Post-Nginx Migration Items

This document tracks items that should be updated after the Nginx migration but are not critical for initial deployment.

## High Priority

### 1. Update Diagnostics Workflow
**File**: `.github/workflows/diagnose.yml`

**Status**: Not Updated (contains Caddy-specific checks)

**Required Changes**:
- Replace `is_caddy_running()` function with Nginx status checks
- Remove Caddy container status checks (lines ~513-520)
- Remove `caddy-network` inspection (lines ~524-550)
- Remove Caddy routes discovery (lines ~362-368)
- Update to check Nginx configuration and status instead
- Update to verify services are accessible on localhost ports
- Add checks for SSL certificate status via Certbot

**Impact**: Diagnostic workflow won't work correctly for infrastructure checks until updated

**Example New Checks**:
```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx configuration
sudo nginx -t

# Check SSL certificates
sudo certbot certificates

# Check localhost port accessibility
for port in 8000 8081 8100 3001; do
  nc -z 127.0.0.1 $port && echo "Port $port: OK" || echo "Port $port: FAIL"
done
```

## Medium Priority

### 2. Update Service Discovery
**File**: `.github/workflows/diagnose.yml` (discovery section)

**Required Changes**:
- Update service discovery to check localhost ports instead of Docker network
- Parse Nginx server blocks instead of Caddyfile
- Check `/etc/nginx/sites-enabled/` for active configurations

### 3. Create Nginx Monitoring
**New Files Needed**:
- Create a workflow or script to monitor Nginx access logs
- Create a workflow to check SSL certificate expiration dates
- Create alerts for certificate expiration < 30 days

### 4. Add Nginx Performance Monitoring
**Considerations**:
- Monitor Nginx worker processes
- Check connection counts
- Monitor upstream response times
- Log analysis for errors and slow requests

## Low Priority

### 5. Update Legacy Documentation
**Files to Review**:
- Any old deployment guides referencing Caddy
- Wiki pages (if any) with Caddy setup instructions
- README sections that might still reference Caddy indirectly

### 6. Clean Up Old Caddy Volumes
**Action Required**:
After verifying Nginx works in production:
```bash
# Remove old Caddy volumes from Docker
docker volume rm linkinbio_caddy_data linkinbio_caddy_config
```

### 7. Optimize Nginx Configuration
**Potential Improvements**:
- Add rate limiting to prevent abuse
- Configure Nginx access log format for better analytics
- Add request buffering configuration
- Optimize worker_processes and worker_connections
- Consider adding ModSecurity for WAF capabilities

### 8. Automate SSL Certificate Renewal Verification
**Create Script**:
```bash
#!/bin/bash
# Check if certificates will expire in < 30 days
# Send notification if renewal needed
# Can be added as a cron job or GitHub Actions scheduled workflow
```

## Completed Items

✅ Create Nginx server block configurations
✅ Remove Caddy from docker-compose.yml
✅ Update deployment workflow
✅ Update helper scripts
✅ Create migration documentation
✅ Create setup script for Nginx/SSL
✅ Update README with new deployment instructions
✅ Add CHANGELOG entry

## Notes

- The system is fully functional with Nginx without completing these TODO items
- These are improvements and updates for better monitoring and diagnostics
- Priority can be adjusted based on operational needs
- Some items (like diagnostics workflow) can be deferred if not actively used

## Timeline Suggestion

- **Week 1**: High priority items (diagnostics workflow)
- **Week 2-3**: Medium priority items (monitoring, discovery)
- **Month 2+**: Low priority items (optimization, cleanup)

## Tracking

Create GitHub issues for each TODO item to track progress:
- [ ] Issue #XXX: Update diagnostics workflow for Nginx
- [ ] Issue #XXX: Create Nginx monitoring workflow
- [ ] Issue #XXX: Add SSL certificate expiration alerts
- [ ] Issue #XXX: Optimize Nginx configuration
