# API Reference

Complete API documentation for Link-in-Bio platform.

## Table of Contents

- [Authentication](#authentication)
- [Pages API](#pages-api)
- [Items API](#items-api)
- [Media API](#media-api)
- [Analytics API](#analytics-api)
- [Settings API](#settings-api)
- [Subscribers API](#subscribers-api)
- [Messages API](#messages-api)
- [Error Codes](#error-codes)
- [Rate Limiting](#rate-limiting)

## Authentication

All API endpoints require authentication using session cookies. You must be logged in as an admin to access the API.

### Login

```http
POST /login
Content-Type: application/x-www-form-urlencoded

password=your_admin_password
```

**Response:**
```json
{
  "success": true,
  "redirect": "/admin"
}
```

### Logout

```http
POST /logout
```

**Response:**
```json
{
  "success": true
}
```

---

## Pages API

### List All Pages

```http
GET /api/pages
```

**Response:**
```json
{
  "pages": [
    {
      "id": 1,
      "slug": "main",
      "name": "Main Page",
      "type": "standard",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00"
    }
  ]
}
```

### Get Page by ID

```http
GET /api/pages/{page_id}
```

**Response:**
```json
{
  "id": 1,
  "slug": "main",
  "name": "Main Page",
  "type": "standard",
  "is_active": true,
  "created_at": "2025-01-01T00:00:00"
}
```

### Create Page

```http
POST /api/pages
Content-Type: application/json

{
  "slug": "gaming",
  "name": "Gaming Page",
  "type": "standard"
}
```

**Response:**
```json
{
  "id": 2,
  "slug": "gaming",
  "name": "Gaming Page",
  "type": "standard",
  "is_active": true,
  "created_at": "2025-01-01T12:00:00"
}
```

### Update Page

```http
PUT /api/pages/{page_id}
Content-Type: application/json

{
  "name": "Updated Gaming Page",
  "is_active": false
}
```

### Delete Page

```http
DELETE /api/pages/{page_id}
```

**Response:**
```json
{
  "success": true
}
```

---

## Items API

### List Items

Get all items for a specific page.

```http
GET /api/items?page_id={page_id}
```

**Query Parameters:**
- `page_id` (optional): Filter by page ID. If not provided, returns items for the default page.

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "title": "My YouTube Channel",
      "url": "https://youtube.com/@festas_builds",
      "item_type": "link",
      "image_url": "/static/uploads/youtube.png",
      "is_active": true,
      "is_featured": false,
      "display_order": 1,
      "click_count": 125,
      "created_at": "2025-01-01T00:00:00"
    }
  ]
}
```

### Get Item by ID

```http
GET /api/items/{item_id}
```

**Response:**
```json
{
  "id": 1,
  "title": "My YouTube Channel",
  "url": "https://youtube.com/@festas_builds",
  "item_type": "link",
  "image_url": "/static/uploads/youtube.png",
  "description": "Subscribe to my gaming channel!",
  "is_active": true,
  "is_featured": false,
  "display_order": 1,
  "click_count": 125,
  "page_id": 1,
  "created_at": "2025-01-01T00:00:00",
  "updated_at": "2025-01-02T00:00:00"
}
```

### Create Item

```http
POST /api/items
Content-Type: application/json

{
  "title": "Discord Server",
  "url": "https://discord.gg/example",
  "item_type": "link",
  "page_id": 1,
  "is_active": true
}
```

**Response:**
```json
{
  "id": 2,
  "title": "Discord Server",
  "url": "https://discord.gg/example",
  "item_type": "link",
  "is_active": true,
  "display_order": 2,
  "page_id": 1,
  "created_at": "2025-01-02T12:00:00"
}
```

### Update Item

```http
PUT /api/items/{item_id}
Content-Type: application/json

{
  "title": "Updated Discord Server",
  "is_featured": true
}
```

### Delete Item

```http
DELETE /api/items/{item_id}
```

**Response:**
```json
{
  "success": true
}
```

### Update Item Order

Update the display order of multiple items at once.

```http
POST /api/items/reorder
Content-Type: application/json

{
  "items": [
    {"id": 1, "display_order": 3},
    {"id": 2, "display_order": 1},
    {"id": 3, "display_order": 2}
  ]
}
```

**Response:**
```json
{
  "success": true
}
```

---

## Media API

### Upload Media

```http
POST /api/upload
Content-Type: multipart/form-data

file: <binary_file_data>
```

**Response:**
```json
{
  "url": "/static/uploads/image_123.png",
  "filename": "image_123.png"
}
```

### List Media Files

```http
GET /api/media
```

**Response:**
```json
{
  "files": [
    {
      "filename": "image_123.png",
      "url": "/static/uploads/image_123.png",
      "size": 52341,
      "created_at": "2025-01-01T12:00:00"
    }
  ]
}
```

---

## Analytics API

### Get Analytics

Get comprehensive analytics data.

```http
GET /api/analytics
```

**Query Parameters:**
- `days` (optional, default: 30): Number of days to include in the report

**Response:**
```json
{
  "total_clicks": 1234,
  "total_items": 15,
  "total_subscribers": 42,
  "total_messages": 8,
  "clicks_by_day": [
    {"date": "2025-01-01", "clicks": 45},
    {"date": "2025-01-02", "clicks": 52}
  ],
  "top_links": [
    {"title": "YouTube", "clicks": 234, "url": "https://youtube.com/@festas_builds"},
    {"title": "Discord", "clicks": 189, "url": "https://discord.gg/example"}
  ],
  "clicks_by_item": [
    {"item_id": 1, "title": "YouTube", "clicks": 234},
    {"item_id": 2, "title": "Discord", "clicks": 189}
  ]
}
```

### Track Click

Track a click on an item (typically called from the frontend).

```http
POST /api/track-click/{item_id}
```

**Response:**
```json
{
  "success": true,
  "item_id": 1,
  "total_clicks": 235
}
```

---

## Settings API

### Get Settings

```http
GET /api/settings
```

**Response:**
```json
{
  "profile_name": "festas_builds",
  "profile_title": "Gaming & Tech Creator",
  "profile_bio": "Welcome to my link hub!",
  "profile_image": "/static/uploads/avatar.png",
  "theme": "dark",
  "custom_css": "",
  "social_links": {
    "youtube": "https://youtube.com/@festas_builds",
    "discord": "https://discord.gg/example"
  }
}
```

### Update Settings

```http
PUT /api/settings
Content-Type: application/json

{
  "profile_name": "festas_builds",
  "profile_title": "Updated Title",
  "theme": "light"
}
```

**Response:**
```json
{
  "success": true
}
```

---

## Subscribers API

### List Subscribers

```http
GET /api/subscribers
```

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `per_page` (optional, default: 50): Items per page

**Response:**
```json
{
  "subscribers": [
    {
      "id": 1,
      "email": "user@example.com",
      "subscribed_at": "2025-01-01T12:00:00",
      "is_active": true
    }
  ],
  "total": 42,
  "page": 1,
  "per_page": 50
}
```

### Add Subscriber

```http
POST /api/subscribe
Content-Type: application/json

{
  "email": "newuser@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully subscribed!"
}
```

### Delete Subscriber

```http
DELETE /api/subscribers/{subscriber_id}
```

**Response:**
```json
{
  "success": true
}
```

---

## Messages API

### List Messages

```http
GET /api/messages
```

**Response:**
```json
{
  "messages": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "message": "Hey, love your content!",
      "created_at": "2025-01-01T12:00:00",
      "is_read": false
    }
  ]
}
```

### Send Message

```http
POST /api/contact
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "message": "Great work on your latest video!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully!"
}
```

### Mark Message as Read

```http
PUT /api/messages/{message_id}/read
```

**Response:**
```json
{
  "success": true
}
```

### Delete Message

```http
DELETE /api/messages/{message_id}
```

**Response:**
```json
{
  "success": true
}
```

---

## Error Codes

All API endpoints return standard HTTP status codes:

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Not logged in |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 422 | Unprocessable Entity - Validation error |
| 500 | Internal Server Error |

**Error Response Format:**
```json
{
  "detail": "Error message describing what went wrong"
}
```

**Validation Error Format:**
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

---

## Rate Limiting

Currently, there are no rate limits on authenticated API endpoints. However, public endpoints (like `/api/track-click` and `/api/contact`) may be rate-limited in the future to prevent abuse.

**Best Practices:**
- Cache responses when possible
- Use bulk operations (like `/api/items/reorder`) instead of multiple individual requests
- Implement exponential backoff for retries

---

## Webhooks

Webhook support is planned for future releases. This will allow you to receive real-time notifications when:
- Items are created, updated, or deleted
- Clicks are tracked
- Subscribers are added
- Messages are received

---

## Examples

### JavaScript/Fetch Example

```javascript
// Get analytics
async function getAnalytics() {
  const response = await fetch('/api/analytics');
  const data = await response.json();
  console.log('Total clicks:', data.total_clicks);
  return data;
}

// Create new item
async function createItem(itemData) {
  const response = await fetch('/api/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(itemData),
  });
  return await response.json();
}

// Upload image
async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  return await response.json();
}
```

### Python Example

```python
import requests

# Base URL
BASE_URL = 'http://localhost:8000'

# Login first
session = requests.Session()
session.post(f'{BASE_URL}/login', data={'password': 'your_password'})

# Get analytics
response = session.get(f'{BASE_URL}/api/analytics')
analytics = response.json()
print(f"Total clicks: {analytics['total_clicks']}")

# Create item
new_item = {
    'title': 'My New Link',
    'url': 'https://example.com',
    'item_type': 'link',
    'page_id': 1
}
response = session.post(f'{BASE_URL}/api/items', json=new_item)
item = response.json()
print(f"Created item with ID: {item['id']}")
```

### cURL Example

```bash
# Login
curl -X POST http://localhost:8000/login \
  -d "password=your_password" \
  -c cookies.txt

# Get analytics
curl http://localhost:8000/api/analytics \
  -b cookies.txt

# Create item
curl -X POST http://localhost:8000/api/items \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Discord Server",
    "url": "https://discord.gg/example",
    "item_type": "link",
    "page_id": 1
  }'

# Upload image
curl -X POST http://localhost:8000/api/upload \
  -b cookies.txt \
  -F "file=@image.png"
```

---

## Changelog

### Version 1.0 (Current)
- Initial API release
- Full CRUD operations for pages, items, media
- Analytics endpoints
- Subscriber and message management

### Planned Features
- Webhook system
- OAuth2 authentication
- API key authentication (for non-session-based access)
- GraphQL endpoint
- Bulk operations for subscribers and messages

---

## Support

For API support or bug reports:
- Open an issue on GitHub
- Check the documentation in `/docs`
- Review example code in `/examples` (if available)

---

**Last Updated:** November 2025  
**API Version:** 1.0  
**Status:** Stable
