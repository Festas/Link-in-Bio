import uvicorn
import sys
import asyncio
import os
from fastapi import FastAPI, Request, Response, Depends
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

from app.database import init_db, get_settings_from_db, get_page_by_slug
from app.endpoints import router as api_router
from app.endpoints_enhanced import router as api_router_enhanced
from app.services import APP_DOMAIN
from app.rate_limit import limiter_standard
from app.config import BASE_DIR, UPLOAD_DIR, templates, configure_template_globals
from app.middleware import add_security_headers, add_request_id
from app.exceptions import custom_http_exception_handler, general_exception_handler


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.auth import validate_admin_password
    from app.auth_enhanced import validate_admin_password_on_startup

    logger.info("Starting Link-in-Bio application...")
    init_db()
    configure_template_globals()
    validate_admin_password()  # Legacy password validation
    validate_admin_password_on_startup()  # Enhanced password validation
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

app.middleware("http")(add_request_id)
app.middleware("http")(add_security_headers)

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
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
            {
                "src": icon_src,
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "maskable"
            },
            {
                "src": icon_src,
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any"
            }
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
    from app.database import get_all_pages
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
            xml_content += f"  <url><loc>{base_url}/{slug}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\n"
    
    # Add special legal pages
    xml_content += f"  <url><loc>{base_url}/datenschutz</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>\n"
    xml_content += f"  <url><loc>{base_url}/impressum</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>\n"
    xml_content += f"  <url><loc>{base_url}/ueber-mich</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>\n"
    
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
    page_url = f"https://{APP_DOMAIN}/datenschutz" if APP_DOMAIN != "127.0.0.1" else f"http://{APP_DOMAIN}/datenschutz"
    context = {
        "page_title": "Datenschutzerklärung",
        "page_description": "Datenschutzbestimmungen",
        "page_image": "",
        "page_url": page_url,
        "custom_html_head": settings.get("custom_html_head", ""),
        "custom_html_body": settings.get("custom_html_body", ""),
    }
    return templates.TemplateResponse(request=request, name="privacy.html", context=context)


@app.get("/impressum", response_class=HTMLResponse)
async def get_impressum_page(request: Request):
    settings = get_settings_from_db()
    page_url = f"https://{APP_DOMAIN}/impressum" if APP_DOMAIN != "127.0.0.1" else f"http://{APP_DOMAIN}/impressum"
    context = {
        "page_title": "Impressum",
        "page_description": "Impressum und rechtliche Angaben",
        "page_image": "",
        "page_url": page_url,
        "custom_html_head": settings.get("custom_html_head", ""),
        "custom_html_body": settings.get("custom_html_body", ""),
    }
    return templates.TemplateResponse(request=request, name="impressum.html", context=context)


@app.get("/ueber-mich", response_class=HTMLResponse)
async def get_about_page(request: Request):
    settings = get_settings_from_db()
    page_url = f"https://{APP_DOMAIN}/ueber-mich" if APP_DOMAIN != "127.0.0.1" else f"http://{APP_DOMAIN}/ueber-mich"
    context = {
        "page_title": "Über mich - Eric | Tech & Gaming",
        "page_description": "Tech & Gaming Enthusiast aus Hamburg - Erfahre mehr über mich und meine Projekte",
        "page_image": "",
        "page_url": page_url,
        "custom_html_head": settings.get("custom_html_head", ""),
        "custom_html_body": settings.get("custom_html_body", ""),
    }
    return templates.TemplateResponse(request=request, name="ueber-mich.html", context=context)


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
    # Skip special routes
    if page_slug in ["admin", "analytics", "login", "privacy", "datenschutz", "impressum", "ueber-mich", "health", "api", "static", "robots.txt", "sitemap.xml", "favicon.ico", "manifest.json", "sw.js"]:
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
