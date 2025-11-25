# Architecture Diagram: Special Pages Admin Panel

## Route Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                     Link-in-Bio Application                      │
└─────────────────────────────────────────────────────────────────┘
                              |
                    ┌─────────┴─────────┐
                    |                   |
            ┌───────▼──────┐    ┌──────▼──────┐
            │ Public Routes│    │ Admin Routes│
            └───────┬──────┘    └──────┬──────┘
                    |                  |
        ┌───────────┼──────────┐       |
        |           |          |       |
    ┌───▼────┐ ┌───▼────┐ ┌───▼────┐  |
    │/mediakit│ │/impressum│ │/ueber-│  |
    │        │ │        │ │mich    │  |
    │(public)│ │(public)│ │(public)│  |
    └────────┘ └────────┘ └────────┘  |
                                       |
                          ┌────────────┼─────────────┐
                          |            |             |
                     ┌────▼─────┐ ┌───▼────────┐ ┌──▼─────────┐
                     │  /admin  │ │ /admin/    │ │ /admin/    │
                     │          │ │ mediakit   │ │ impressum  │
                     │(overview)│ │(editor)    │ │(editor)    │
                     └──────────┘ └────────────┘ └────────────┘
                                       |
                              [+ 3 more editors]
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Backend (FastAPI)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  main.py                                                         │
│    ├─ Include: special_pages_admin.router                       │
│    └─ Public routes: /mediakit, /impressum, etc.                │
│                                                                  │
│  app/routers/special_pages_admin.py (NEW)                       │
│    ├─ GET  /admin           → Overview                          │
│    └─ GET  /admin/{page_key} → Editor                           │
│                                                                  │
│  app/endpoints.py (EXISTING - REUSED)                           │
│    ├─ GET    /api/special-pages/{page_key}                      │
│    ├─ PUT    /api/special-pages/{page_key}                      │
│    ├─ GET    /api/special-pages/{page_key}/blocks               │
│    ├─ POST   /api/special-pages/{page_key}/blocks               │
│    ├─ PUT    /api/special-page-blocks/{block_id}                │
│    ├─ DELETE /api/special-page-blocks/{block_id}                │
│    └─ [Media Kit specific endpoints...]                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       Frontend (Templates)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  templates/admin_special_pages_index.html (NEW)                 │
│    └─ Grid of all special pages                                 │
│                                                                  │
│  templates/admin_special_page.html (NEW)                        │
│    ├─ Navigation bar                                            │
│    ├─ Block editor container                                    │
│    ├─ Add block toolbar                                         │
│    └─ Media Kit settings (conditional)                          │
│                                                                  │
│  templates/admin.html (MODIFIED)                                │
│    └─ "Besondere Seiten" tab → /admin/mediakit                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      JavaScript (Logic)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  static/js/admin_special_pages_editor.js (NEW)                  │
│    ├─ SpecialPageEditor class                                   │
│    ├─ loadBlocks()                                              │
│    ├─ renderBlocks()                                            │
│    ├─ createBlockElement()                                      │
│    ├─ addBlock(type)                                            │
│    ├─ deleteBlock(id)                                           │
│    ├─ toggleBlockVisibility(id)                                 │
│    ├─ updateBlockContent(id, value)                             │
│    └─ saveBlocks()                                              │
│                                                                  │
│  static/js/admin_mediakit_enhanced.js (NEW)                     │
│    ├─ MediaKitAdmin class                                       │
│    ├─ loadSettings()                                            │
│    ├─ saveSettings()                                            │
│    ├─ refreshSocialStats()                                      │
│    └─ loadMediaKitAnalytics()                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Database (SQLite)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  special_pages                                                   │
│    ├─ page_key (unique)                                         │
│    ├─ title                                                     │
│    ├─ subtitle                                                  │
│    └─ content                                                   │
│                                                                  │
│  special_page_blocks                                            │
│    ├─ page_key (FK)                                             │
│    ├─ block_type                                                │
│    ├─ content                                                   │
│    ├─ settings (JSON)                                           │
│    └─ position                                                  │
│                                                                  │
│  mediakit_blocks                                                │
│    ├─ block_type                                                │
│    ├─ content                                                   │
│    ├─ settings (JSON)                                           │
│    └─ is_visible                                                │
│                                                                  │
│  mediakit_settings                                              │
│    ├─ setting_key                                               │
│    └─ setting_value                                             │
│                                                                  │
│  mediakit_views (analytics)                                     │
│    ├─ viewer_email                                              │
│    ├─ viewer_ip                                                 │
│    └─ viewed_at                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Viewing Admin Panel
```
User navigates to /admin/mediakit
           ↓
FastAPI router (special_pages_admin.py)
           ↓
Check authentication (require_auth)
           ↓
Render template (admin_special_page.html)
           ↓
JavaScript loads (admin_special_pages_editor.js)
           ↓
Fetch blocks via API (/api/special-pages/mediakit/blocks)
           ↓
Render blocks in editor
```

### Editing Content
```
User adds/edits block
           ↓
JavaScript (admin_special_pages_editor.js)
           ↓
POST/PUT to API (/api/special-page-blocks/{id})
           ↓
Backend (endpoints.py) validates & saves
           ↓
Database (special_page_blocks table)
           ↓
Response to frontend
           ↓
Update UI (show success message)
```

### Viewing Public Page
```
User visits /mediakit
           ↓
FastAPI route (main.py)
           ↓
Load blocks (get_visible_mediakit_blocks)
           ↓
Render template (mediakit.html)
           ↓
Display blocks to public
```

## Block Types Hierarchy

```
Block Types
├── Standard Blocks (all pages)
│   ├── heading
│   ├── text
│   ├── image
│   ├── list
│   └── divider
│
├── Media Kit Blocks
│   ├── stats (social media statistics)
│   ├── platforms (platform overview)
│   └── rates (pricing information)
│
└── Page-Specific Blocks
    └── contact-form (Kontakt page)
```

## Authentication Flow

```
/admin/* routes
      ↓
require_auth dependency
      ↓
Check JWT token in headers/cookies
      ↓
Valid? → Allow access
      ↓
Invalid? → 401 Unauthorized
```

## Security Layers

```
┌──────────────────────────────┐
│  1. Route Protection         │ ← require_auth dependency
├──────────────────────────────┤
│  2. Input Validation         │ ← Backend validation
├──────────────────────────────┤
│  3. HTML Escaping            │ ← escapeHtml() in JS
├──────────────────────────────┤
│  4. XSS Protection           │ ← Template escaping
├──────────────────────────────┤
│  5. CSRF Protection          │ ← FastAPI built-in
└──────────────────────────────┘
```

## Key Design Decisions

1. **Separate Admin Routes**: Each special page has its own admin route (`/admin/{page_key}`) for clear organization

2. **Reuse Existing APIs**: No new API endpoints needed - leverages existing `/api/special-pages/*` endpoints

3. **Block-Based Editor**: Flexible system allows different block types per page while sharing core editor logic

4. **Backward Compatible**: Public routes unchanged, old admin features can coexist

5. **Minimal Changes**: Only 2 existing files modified (main.py, admin.html)

6. **Mobile First**: Responsive design works on all screen sizes

7. **Extensible**: Easy to add new pages by adding to SPECIAL_PAGES dict
