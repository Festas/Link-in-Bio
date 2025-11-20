import os

print("🚀 Starte Projekt-Setup: Link-in-Bio (Final & Verified)...")

directories = [
    "static/css", "static/js", "static/uploads", "static/vendor", "static/fonts", "templates"
]

files = {
    "requirements.txt": "fastapi\nuvicorn[standard]\njinja2\nrequests\nbeautifulsoup4\npython-dotenv\nhttpx\nqrcode[pil]\npython-multipart",
    ".env": 'ADMIN_USERNAME="admin"\nADMIN_PASSWORD="change_me"\nJSONLINK_API_KEY=""\nAPP_DOMAIN="127.0.0.1"',
    "download_vendor.py": "", 
    
    # Backend
    "main.py": "", "models.py": "", "database.py": "", "auth.py": "", 
    "rate_limit.py": "", "services.py": "", "cache.py": "", "endpoints.py": "",

    # Frontend CSS
    "static/css/style.css": "", "static/css/admin.css": "",

    # Frontend JS
    "static/js/app.js": "", "static/js/api.js": "", "static/js/ui.js": "", "static/js/utils.js": "",
    "static/js/login.js": "", "static/js/admin.js": "", "static/js/admin_api.js": "", 
    "static/js/admin_ui.js": "", "static/js/media.js": "", "static/js/analytics.js": "", 
    "static/js/subscribers.js": "", "static/js/inbox.js": "", "static/js/consent.js": "", "static/js/sw.js": "",

    # Templates
    "templates/layout.html": "", "templates/index.html": "", "templates/privacy.html": "",
    "templates/login.html": "", "templates/admin.html": "", "templates/analytics.html": "", "templates/error.html": ""
}

for d in directories: os.makedirs(d, exist_ok=True)
for f, c in files.items(): 
    if not os.path.exists(f): 
        with open(f, "w", encoding="utf-8") as file: file.write(c)

print("✅ Struktur erstellt. Bitte fülle nun die Dateien mit dem Code aus dem Chat.")