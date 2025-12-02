import uvicorn
import sys
import asyncio
import os
from fastapi import FastAPI, Request, Response, Depends, HTTPException
from fastapi.responses import (
    HTMLResponse,
    JSONResponse,
    PlainTextResponse,
    FileResponse,
    RedirectResponse,
)
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from urllib.parse import urljoin
from starlette.exceptions import HTTPException as StarletteHTTPException

# --- WINDOWS FIX FÜR CURL_CFFI ---
# Dies verhindert den "NotImplementedError" auf Windows-Systemen
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
# ---------------------------------

# Setup logging early
from app.logging_config import setup_logging, get_logger

# Configure logging based on environment
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
JSON_LOGS = os.getenv("JSON_LOGS", "false").lower() in ("true", "1", "yes")
setup_logging(log_level=LOG_LEVEL, json_logs=JSON_LOGS)

logger = get_logger(__name__)

from app.database import (
    init_db,
    get_settings_from_db,
    get_page_by_slug,
    get_all_pages,
    get_special_page,
    get_mediakit_data,
    get_special_page_blocks,
    get_visible_mediakit_blocks,
)
from app.block_system import render_blocks_to_html as render_blocks_enhanced
from app.endpoints import router as api_router  # Legacy endpoints (special pages, mediakit)
from app.endpoints_enhanced import router as api_router_enhanced
from app.services import APP_DOMAIN
from app.rate_limit import limiter_standard
from app.config import BASE_DIR, UPLOAD_DIR, templates, configure_template_globals
from app.middleware import add_security_headers, add_request_id
from app.subdomain_middleware import SubdomainMiddleware, subdomain_middleware
from app.exceptions import custom_http_exception_handler, general_exception_handler

# Import new modular routers
from app.routers import pages, items, media, settings, analytics, subscribers, public, tools
from app.routers import admin_subdomain, special_pages, mediakit


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.auth_unified import validate_admin_password_on_startup

    logger.info("Starting Link-in-Bio application...")
    init_db()
    configure_template_globals()
    validate_admin_password_on_startup()  # Unified password validation
    logger.info("Application startup complete")
    yield
    logger.info("Application shutdown")


app = FastAPI(
    lifespan=lifespan,
    title="Link-in-Bio API",
    description="Eine moderne, selbst-gehostete Link-in-Bio Lösung",
    version="1.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Add ASGI middleware for subdomain handling (path rewriting)
app.add_middleware(SubdomainMiddleware)

app.middleware("http")(add_request_id)
app.middleware("http")(add_security_headers)
app.middleware("http")(subdomain_middleware)

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

# Include new modular routers
app.include_router(pages.router, prefix="/api/pages", tags=["Pages"])
app.include_router(items.router, prefix="/api/items", tags=["Items"])
app.include_router(media.router, prefix="/api/media", tags=["Media"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(subscribers.router, prefix="/api/subscribers", tags=["Subscribers"])
app.include_router(public.router, prefix="/api", tags=["Public"])
app.include_router(tools.router, prefix="/api", tags=["Tools"])

# Include special pages and mediakit routers
app.include_router(special_pages.router, prefix="/api", tags=["Special Pages"])
app.include_router(special_pages.block_router, prefix="/api", tags=["Special Page Blocks"])
app.include_router(mediakit.router, prefix="/api", tags=["Media Kit"])

# Include admin subdomain router (accessible only on admin.domain.com)
app.include_router(admin_subdomain.router, tags=["Admin Subdomain"])

# Include legacy/remaining endpoints
app.include_router(api_router, prefix="/api")
app.include_router(api_router_enhanced, prefix="/api")

app.exception_handler(StarletteHTTPException)(custom_http_exception_handler)
app.exception_handler(500)(general_exception_handler)


# Health Check Endpoint
@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint for monitoring and container orchestration."""
    return {"status": "healthy", "version": "1.1.0"}


@app.get("/sw.js", response_class=FileResponse)
async def get_service_worker():
    return FileResponse(BASE_DIR / "static" / "js" / "sw.js", media_type="application/javascript")


@app.get("/manifest.json", response_class=JSONResponse)
async def get_manifest():
    settings = get_settings_from_db()
    title = settings.get("title", "Link-in-Bio")
    icon_src = (
        settings.get("image_url")
        if settings.get("image_url") and settings.get("image_url").startswith("/static")
        else "/static/uploads/default-icon.png"
    )
    if icon_src.startswith("http"):
        icon_src = "https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/layout-grid.svg"
    theme_color = "#111827"
    return {
        "name": f"{title} - Admin Panel",
        "short_name": "Admin",
        "description": "Admin Panel für Link-in-Bio Verwaltung",
        "start_url": "/admin",
        "scope": "/",
        "display": "standalone",
        "orientation": "portrait-primary",
        "background_color": theme_color,
        "theme_color": theme_color,
        "icons": [
            {"src": icon_src, "sizes": "192x192", "type": "image/png", "purpose": "maskable"},
            {"src": icon_src, "sizes": "512x512", "type": "image/png", "purpose": "any"},
        ],
    }


@app.get("/favicon.ico", include_in_schema=False)
async def get_favicon():
    icon_path = UPLOAD_DIR / "default-icon.png"
    if icon_path.exists() and icon_path.stat().st_size > 0:
        return FileResponse(icon_path)
    return RedirectResponse("https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/link.svg")


@app.get("/robots.txt", response_class=PlainTextResponse)
async def get_robots_txt():
    return f"User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nDisallow: /login\n\nSitemap: https://{APP_DOMAIN}/sitemap.xml\n"


@app.get("/sitemap.xml", response_class=Response)
async def get_sitemap():
    base_url = f"https://{APP_DOMAIN}"
    xml_content = (
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    )
    xml_content += f"  <url><loc>{base_url}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n"

    # Add all active pages to sitemap
    pages = get_all_pages()
    for page in pages:
        if page.get("is_active") and page.get("slug"):  # Skip main page (slug='')
            slug = page.get("slug")
            xml_content += (
                f"  <url><loc>{base_url}/{slug}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\n"
            )

    # Add special legal pages
    xml_content += (
        f"  <url><loc>{base_url}/datenschutz</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>\n"
    )
    xml_content += (
        f"  <url><loc>{base_url}/impressum</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>\n"
    )
    xml_content += (
        f"  <url><loc>{base_url}/ueber-mich</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>\n"
    )
    xml_content += (
        f"  <url><loc>{base_url}/kontakt</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n"
    )
    xml_content += (
        f"  <url><loc>{base_url}/mediakit</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n"
    )

    xml_content += "</urlset>"
    return Response(content=xml_content, media_type="application/xml")


@app.get("/admin", response_class=HTMLResponse)
async def get_admin_page(request: Request):
    return templates.TemplateResponse(request=request, name="admin.html")


@app.get("/analytics", response_class=HTMLResponse)
async def get_analytics_page(request: Request):
    return templates.TemplateResponse(request=request, name="analytics.html")


@app.get("/login", response_class=HTMLResponse)
async def get_login_page(request: Request):
    return templates.TemplateResponse(request=request, name="login.html")


@app.get("/datenschutz", response_class=HTMLResponse)
@app.get("/privacy", response_class=HTMLResponse)  # Keep old route for backwards compatibility
async def get_privacy_page(request: Request):
    settings = get_settings_from_db()
    page_data = get_special_page("datenschutz")
    blocks = get_special_page_blocks("datenschutz")

    # Render blocks to HTML if they exist, otherwise use legacy content
    if blocks:
        page_content = render_blocks_enhanced(blocks)
    else:
        page_content = page_data.get("content", "") if page_data else ""

    page_url = f"https://{APP_DOMAIN}/datenschutz" if APP_DOMAIN != "127.0.0.1" else f"http://{APP_DOMAIN}/datenschutz"
    context = {
        "page_title": page_data.get("title", "Datenschutzerklärung") if page_data else "Datenschutzerklärung",
        "page_description": (
            page_data.get("subtitle", "Datenschutzbestimmungen") if page_data else "Datenschutzbestimmungen"
        ),
        "page_image": "",
        "page_url": page_url,
        "custom_html_head": settings.get("custom_html_head", ""),
        "custom_html_body": settings.get("custom_html_body", ""),
        "page_content": page_content,
        "page_subtitle": page_data.get("subtitle", "") if page_data else "",
    }
    return templates.TemplateResponse(request=request, name="special-page.html", context=context)


@app.get("/impressum", response_class=HTMLResponse)
async def get_impressum_page(request: Request):
    settings = get_settings_from_db()
    page_data = get_special_page("impressum")
    blocks = get_special_page_blocks("impressum")

    # Render blocks to HTML if they exist, otherwise use legacy content
    if blocks:
        page_content = render_blocks_enhanced(blocks)
    else:
        page_content = page_data.get("content", "") if page_data else ""

    page_url = f"https://{APP_DOMAIN}/impressum" if APP_DOMAIN != "127.0.0.1" else f"http://{APP_DOMAIN}/impressum"
    context = {
        "page_title": page_data.get("title", "Impressum") if page_data else "Impressum",
        "page_description": (
            page_data.get("subtitle", "Impressum und rechtliche Angaben")
            if page_data
            else "Impressum und rechtliche Angaben"
        ),
        "page_image": "",
        "page_url": page_url,
        "custom_html_head": settings.get("custom_html_head", ""),
        "custom_html_body": settings.get("custom_html_body", ""),
        "page_content": page_content,
        "page_subtitle": page_data.get("subtitle", "") if page_data else "",
    }
    return templates.TemplateResponse(request=request, name="special-page.html", context=context)


@app.get("/ueber-mich", response_class=HTMLResponse)
async def get_about_page(request: Request):
    settings = get_settings_from_db()
    page_data = get_special_page("ueber-mich")
    blocks = get_special_page_blocks("ueber-mich")

    # Render blocks to HTML if they exist, otherwise use legacy content
    if blocks:
        page_content = render_blocks_enhanced(blocks)
    else:
        page_content = page_data.get("content", "") if page_data else ""

    page_url = f"https://{APP_DOMAIN}/ueber-mich" if APP_DOMAIN != "127.0.0.1" else f"http://{APP_DOMAIN}/ueber-mich"
    context = {
        "page_title": (
            page_data.get("title", "Über mich - Eric | Tech & Gaming")
            if page_data
            else "Über mich - Eric | Tech & Gaming"
        ),
        "page_description": (
            page_data.get(
                "subtitle", "Tech & Gaming Enthusiast aus Hamburg - Erfahre mehr über mich und meine Projekte"
            )
            if page_data
            else "Tech & Gaming Enthusiast aus Hamburg - Erfahre mehr über mich und meine Projekte"
        ),
        "page_image": "",
        "page_url": page_url,
        "custom_html_head": settings.get("custom_html_head", ""),
        "custom_html_body": settings.get("custom_html_body", ""),
        "page_content": page_content,
        "page_subtitle": page_data.get("subtitle", "") if page_data else "",
    }
    return templates.TemplateResponse(request=request, name="special-page.html", context=context)


@app.get("/kontakt", response_class=HTMLResponse)
async def get_contact_page(request: Request):
    settings = get_settings_from_db()
    page_url = f"https://{APP_DOMAIN}/kontakt" if APP_DOMAIN != "127.0.0.1" else f"http://{APP_DOMAIN}/kontakt"
    context = {
        "page_title": "Kontakt - Eric | Tech & Gaming",
        "page_description": "Kontaktiere mich für Kooperationen, Anfragen oder einfach nur zum Austauschen",
        "page_image": "",
        "page_url": page_url,
        "custom_html_head": settings.get("custom_html_head", ""),
        "custom_html_body": settings.get("custom_html_body", ""),
    }
    return templates.TemplateResponse(request=request, name="kontakt.html", context=context)


@app.get("/mediakit", response_class=HTMLResponse)
async def get_mediakit_page(request: Request):
    settings = get_settings_from_db()
    # Use new block-based system
    mediakit_blocks = get_visible_mediakit_blocks()
    page_url = f"https://{APP_DOMAIN}/mediakit" if APP_DOMAIN != "127.0.0.1" else f"http://{APP_DOMAIN}/mediakit"
    context = {
        "page_title": "Media Kit - Professional Content Creator",
        "page_description": "View my media kit with stats, collaborations, and partnership opportunities.",
        "page_image": "",
        "page_url": page_url,
        "custom_html_head": settings.get("custom_html_head", ""),
        "custom_html_body": settings.get("custom_html_body", ""),
        "mediakit_blocks": mediakit_blocks,
    }
    return templates.TemplateResponse(request=request, name="mediakit.html", context=context)


@app.get("/", response_class=HTMLResponse, dependencies=[Depends(limiter_standard)])
async def get_index_html(request: Request):
    # Get the default page (slug = '')
    page = get_page_by_slug("")
    if not page:
        # Fallback to settings if no page exists
        settings = get_settings_from_db()
        page_title = settings.get("title", "Link-in-Bio")
        page_description = settings.get("bio", "Willkommen!")
        page_image_url = settings.get("image_url", "")
        page_id = None
    else:
        page_title = page.get("title", "Link-in-Bio")
        page_description = page.get("bio", "Willkommen!")
        page_image_url = page.get("image_url", "")
        page_id = page.get("id")

    if page_image_url and page_image_url.startswith("/static"):
        base_url = f"{'https' if APP_DOMAIN != '127.0.0.1' else 'http'}://{APP_DOMAIN}"
        page_image_url = urljoin(base_url, page_image_url)
    else:
        base_url = f"{'https' if APP_DOMAIN != '127.0.0.1' else 'http'}://{APP_DOMAIN}"
        page_image_url = urljoin(base_url, "/api/social/card.png")

    page_url = f"https://{APP_DOMAIN}" if APP_DOMAIN != "127.0.0.1" else f"http://{APP_DOMAIN}"
    settings = get_settings_from_db()
    context = {
        "page_title": page_title,
        "page_description": page_description,
        "page_image": page_image_url,
        "page_url": page_url,
        "page_id": page_id,
        "custom_html_head": settings.get("custom_html_head", ""),
        "custom_html_body": settings.get("custom_html_body", ""),
    }
    return templates.TemplateResponse(request=request, name="index.html", context=context)


@app.get("/{page_slug}", response_class=HTMLResponse, dependencies=[Depends(limiter_standard)])
async def get_page_html(request: Request, page_slug: str):
    # Skip special routes (including new admin routes)
    if page_slug in [
        "admin",
        "analytics",
        "login",
        "privacy",
        "datenschutz",
        "impressum",
        "ueber-mich",
        "kontakt",
        "mediakit",
        "health",
        "api",
        "static",
        "robots.txt",
        "sitemap.xml",
        "favicon.ico",
        "manifest.json",
        "sw.js",
    ]:
        raise HTTPException(404, "Not Found")

    page = get_page_by_slug(page_slug)
    if not page or not page.get("is_active"):
        raise HTTPException(404, "Seite nicht gefunden")

    page_title = page.get("title", "Link-in-Bio")
    page_description = page.get("bio", "Willkommen!")
    page_image_url = page.get("image_url", "")
    page_id = page.get("id")

    if page_image_url and page_image_url.startswith("/static"):
        base_url = f"{'https' if APP_DOMAIN != '127.0.0.1' else 'http'}://{APP_DOMAIN}"
        page_image_url = urljoin(base_url, page_image_url)
    else:
        base_url = f"{'https' if APP_DOMAIN != '127.0.0.1' else 'http'}://{APP_DOMAIN}"
        page_image_url = urljoin(base_url, "/api/social/card.png")

    page_url = f"https://{APP_DOMAIN}/{page_slug}" if APP_DOMAIN != "127.0.0.1" else f"http://{APP_DOMAIN}/{page_slug}"
    settings = get_settings_from_db()
    context = {
        "page_title": page_title,
        "page_description": page_description,
        "page_image": page_image_url,
        "page_url": page_url,
        "page_id": page_id,
        "custom_html_head": settings.get("custom_html_head", ""),
        "custom_html_body": settings.get("custom_html_body", ""),
    }
    return templates.TemplateResponse(request=request, name="index.html", context=context)


if __name__ == "__main__":
    print(f"Starte Server auf http://127.0.0.1:8000")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
