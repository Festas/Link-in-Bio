import uvicorn
import os
import sys
import asyncio
import logging
from pathlib import Path
from fastapi import FastAPI, Request, Response, Depends
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from contextlib import asynccontextmanager
from urllib.parse import urljoin
from dotenv import load_dotenv
from starlette.exceptions import HTTPException as StarletteHTTPException

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('app.log') if not os.getenv('DISABLE_FILE_LOGGING') else logging.NullHandler()
    ]
)
logger = logging.getLogger(__name__)

# --- WINDOWS FIX FÜR CURL_CFFI ---
# Dies verhindert den "NotImplementedError" auf Windows-Systemen
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
# ---------------------------------

from database import init_db, get_settings_from_db
from endpoints import router as api_router
from services import APP_DOMAIN
from rate_limit import limiter_standard

BASE_DIR = Path(__file__).resolve().parent
load_dotenv() 
UPLOAD_DIR = BASE_DIR / "static" / "uploads" 
os.makedirs(UPLOAD_DIR, exist_ok=True)

templates = Jinja2Templates(directory=BASE_DIR / "templates")

# --- VENDOR CONFIGURATION ---
CDN_URLS = {
    "tailwindcss": "https://cdn.tailwindcss.com",
    "lucide": "https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.js",
    "sortable": "https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js",
    "chartjs": "https://cdn.jsdelivr.net/npm/chart.js",
    "swiper_css": "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css",
    "swiper_js": "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"
}

LOCAL_URLS = {
    "tailwindcss": "/static/vendor/tailwindcss.js",
    "lucide": "/static/vendor/lucide.js",
    "sortable": "/static/vendor/sortable.min.js",
    "chartjs": "/static/vendor/chart.js",
    "swiper_css": "/static/vendor/swiper-bundle.min.css",
    "swiper_js": "/static/vendor/swiper-bundle.min.js"
}

VENDOR_DIR = BASE_DIR / "static" / "vendor"

def configure_template_globals():
    use_local = True
    check_files = ["tailwindcss.js", "lucide.js", "sortable.min.js"]
    
    if not VENDOR_DIR.exists():
        use_local = False
    else:
        for f_name in check_files:
            f_path = VENDOR_DIR / f_name
            if not f_path.exists():
                use_local = False
                break
            
    if use_local:
        print("✅ Lokale Vendor-Dateien gefunden.")
        templates.env.globals["vendor"] = LOCAL_URLS
    else:
        print("🌐 Nutze CDNs (Online-Modus).")
        templates.env.globals["vendor"] = CDN_URLS
    
    # Version global
    templates.env.globals["version"] = "1.1"

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting Link-in-Bio application...")
    try:
        init_db()
        logger.info("✅ Database initialized")
        configure_template_globals()
        logger.info("✅ Templates configured")
        logger.info("🎉 Application startup complete")
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise
    
    yield
    
    logger.info("👋 Shutting down application...")

app = FastAPI(lifespan=lifespan)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
app.include_router(api_router, prefix="/api")

@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.warning(f"HTTP {exc.status_code} error on {request.url.path}: {exc.detail}")
    if request.url.path.startswith("/api/"):
        return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)
    return templates.TemplateResponse("error.html", {"request": request, "status_code": exc.status_code, "detail": exc.detail}, status_code=exc.status_code)

@app.exception_handler(500)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Internal server error on {request.url.path}: {exc}", exc_info=True)
    if request.url.path.startswith("/api/"):
        return JSONResponse({"detail": "Interner Serverfehler"}, status_code=500)
    return templates.TemplateResponse("error.html", {"request": request, "status_code": 500, "detail": "Interner Serverfehler"}, status_code=500)

@app.get("/sw.js", response_class=FileResponse)
async def get_service_worker():
    return FileResponse(BASE_DIR / "static" / "js" / "sw.js", media_type="application/javascript")

@app.get("/manifest.json", response_class=JSONResponse)
async def get_manifest():
    settings = get_settings_from_db()
    title = settings.get('title', 'Link-in-Bio')
    icon_src = settings.get('image_url') if settings.get('image_url') and settings.get('image_url').startswith('/static') else '/static/uploads/default-icon.png'
    if icon_src.startswith('http'):
        icon_src = "https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/layout-grid.svg"
    theme_color = "#111827"
    return {
        "name": f"{title} - Admin",
        "short_name": "Admin Panel",
        "start_url": "/admin",
        "display": "standalone",
        "background_color": theme_color,
        "theme_color": theme_color,
        "icons": [{"src": icon_src, "sizes": "192x192", "type": "image/png"}]
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
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    xml_content += f'  <url><loc>{base_url}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n'
    xml_content += f'  <url><loc>{base_url}/privacy</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>\n'
    xml_content += '</urlset>'
    return Response(content=xml_content, media_type="application/xml")

@app.get("/admin", response_class=HTMLResponse)
async def get_admin_page(request: Request):
    return templates.TemplateResponse("admin.html", {"request": request})

@app.get("/analytics", response_class=HTMLResponse)
async def get_analytics_page(request: Request):
    return templates.TemplateResponse("analytics.html", {"request": request})

@app.get("/login", response_class=HTMLResponse)
async def get_login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})
    
@app.get("/privacy", response_class=HTMLResponse)
async def get_privacy_page(request: Request):
    settings = get_settings_from_db()
    page_url = f"https://{APP_DOMAIN}/privacy" if APP_DOMAIN != "127.0.0.1" else f"http://{APP_DOMAIN}/privacy"
    context = {
        "request": request,
        "page_title": "Datenschutzerklärung",
        "page_description": "Datenschutzbestimmungen",
        "page_image": "", 
        "page_url": page_url,
        "custom_html_head": settings.get('custom_html_head', ''),
        "custom_html_body": settings.get('custom_html_body', '')
    }
    return templates.TemplateResponse("privacy.html", context)

@app.get("/", response_class=HTMLResponse, dependencies=[Depends(limiter_standard)])
async def get_index_html(request: Request):
    settings = get_settings_from_db()
    page_title = settings.get('title', 'Link-in-Bio')
    page_description = settings.get('bio', 'Willkommen!')
    page_image_url = settings.get('image_url', '')
    if page_image_url.startswith('/static'):
        base_url = f"{'https' if APP_DOMAIN != '127.0.0.1' else 'http'}://{APP_DOMAIN}"
        page_image_url = urljoin(base_url, page_image_url)
    else:
        base_url = f"{'https' if APP_DOMAIN != '127.0.0.1' else 'http'}://{APP_DOMAIN}"
        page_image_url = urljoin(base_url, "/api/social/card.png")
    
    page_url = f"https://{APP_DOMAIN}" if APP_DOMAIN != "127.0.0.1" else f"http://{APP_DOMAIN}"
    context = {
        "request": request,
        "page_title": page_title,
        "page_description": page_description,
        "page_image": page_image_url,
        "page_url": page_url,
        "custom_html_head": settings.get('custom_html_head', ''),
        "custom_html_body": settings.get('custom_html_body', '')
    }
    return templates.TemplateResponse("index.html", context)

if __name__ == "__main__":
    logger.info(f"Starte Server auf http://127.0.0.1:8000")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)