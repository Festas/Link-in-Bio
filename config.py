import os
from pathlib import Path
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv

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
