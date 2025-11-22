import os
import requests

VENDOR_DIR = os.path.join("static", "vendor")
FONTS_DIR = os.path.join("static", "fonts")
os.makedirs(VENDOR_DIR, exist_ok=True)
os.makedirs(FONTS_DIR, exist_ok=True)

libraries = {
    "tailwindcss.js": "https://cdn.tailwindcss.com",
    # KORREKTUR: Dies ist die richtige URL für die Browser-Version
    "lucide.js": "https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.js",
    "sortable.min.js": "https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js",
    "chart.js": "https://cdn.jsdelivr.net/npm/chart.js",
    "swiper-bundle.min.css": "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css",
    "swiper-bundle.min.js": "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js",
}

fonts = {
    "Roboto-Regular.ttf": "https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Regular.ttf",
    "Roboto-Bold.ttf": "https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Bold.ttf",
}

print(f"Lade Bibliotheken nach '{VENDOR_DIR}'...")
for filename, url in libraries.items():
    try:
        print(f"Download: {filename}...")
        response = requests.get(url)
        response.raise_for_status()
        with open(os.path.join(VENDOR_DIR, filename), "wb") as f:
            f.write(response.content)
        print(f"OK: {filename}")
    except Exception as e:
        print(f"Fehler bei {filename}: {e}")

print(f"\nLade Fonts nach '{FONTS_DIR}'...")
for filename, url in fonts.items():
    try:
        print(f"Download: {filename}...")
        response = requests.get(url)
        response.raise_for_status()
        with open(os.path.join(FONTS_DIR, filename), "wb") as f:
            f.write(response.content)
        print(f"OK: {filename}")
    except Exception as e:
        print(f"Fehler bei {filename}: {e}")

print("\nFertig! Alle Abhängigkeiten sind jetzt lokal verfügbar.")
