# Link-in-Bio 🎮⚡

Eine moderne, selbst-gehostete Link-in-Bio Lösung ähnlich wie Linktree & Beacons.ai - gebaut mit FastAPI und modernen Web-Technologien. Optimiert für Content Creators, Influencer und Gaming-Enthusiasten.

## ✨ Features

- 🎨 **Professionelles Gaming/Tech Design**: Moderne Glassmorphism-Effekte mit Neon-Akzenten
- 🔗 **Vielseitige Content-Typen**: Links, Videos, Produkte, FAQs, Testimonials, Countdowns und mehr
- 📊 **Analytics**: Eingebaute Analytics mit Click-Tracking, Referer-Tracking und Geo-Location
- 📧 **Community Features**: Newsletter-Abonnements und Kontaktformular
- 🖼️ **Media Management**: Bild-Upload mit automatischer Optimierung
- 🎯 **SEO-Optimiert**: Meta-Tags, Sitemap, Robots.txt und Social Cards
- 🚀 **Performance**: Async/Await, Caching und optimiertes Rendering
- 🔒 **Sicher**: Rate Limiting, Security Headers, Input Validation
- 📱 **PWA-Ready**: Service Worker und Manifest für Installation als App
- 🐳 **Docker-Ready**: Vollständige Docker-Compose-Konfiguration mit Caddy

## 🚀 Quick Start

### Voraussetzungen

- Python 3.11 oder höher
- Docker & Docker Compose (für Produktion)

### Lokale Entwicklung

1. **Repository klonen**
```bash
git clone https://github.com/Festas/Link-in-Bio.git
cd Link-in-Bio
```

2. **Virtuelle Umgebung erstellen**
```bash
python -m venv venv
source venv/bin/activate  # Auf Windows: venv\Scripts\activate
```

3. **Dependencies installieren**
```bash
pip install -r requirements.txt
```

4. **Umgebungsvariablen konfigurieren**
```bash
cp .env.example .env
# .env bearbeiten und Passwort + Domain setzen
```

5. **Entwicklungsserver starten**
```bash
python main.py
# Oder mit uvicorn:
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

6. **Browser öffnen**
- Frontend: http://127.0.0.1:8000
- Admin Panel: http://127.0.0.1:8000/admin
- API Docs: http://127.0.0.1:8000/docs

### Produktion mit Docker

1. **.env-Datei erstellen**
```bash
cp .env.example .env
# Passwort und Domain anpassen!
```

2. **Caddyfile anpassen**
```bash
# In Caddyfile: "deine-domain.de" durch echte Domain ersetzen
```

3. **Container starten**
```bash
docker-compose up -d
```

4. **Automatisches SSL**: Caddy konfiguriert automatisch Let's Encrypt SSL-Zertifikate

## 🔧 Konfiguration

### Umgebungsvariablen

Siehe `.env.example` für alle verfügbaren Optionen:

- `ADMIN_USERNAME`: Admin-Benutzername (Standard: admin)
- `ADMIN_PASSWORD`: **WICHTIG**: Unbedingt ändern!
- `APP_DOMAIN`: Deine Domain (z.B. example.com)
- `DATABASE_FILE`: Pfad zur SQLite-Datenbank (Standard: linktree.db)
- `JSONLINK_API_KEY`: Optional für erweiterte Link-Vorschau
- `SCRAPER_MAX_RETRIES`: Anzahl Retries beim Scraping (Standard: 5)
- `SCRAPER_CACHE_TTL`: Cache-TTL für Scraping in Sekunden (Standard: 3600)
- `SCRAPER_VERIFY_TLS`: TLS-Verifikation (Standard: true)
- `SCRAPER_PROXIES`: Optional Proxy-Liste (komma-getrennt)
- `SCRAPER_BROWSER_ENABLED`: Browser-Scraping aktivieren (Standard: true, **NEU**)
- `SCRAPER_BROWSER_FALLBACK`: Browser als Fallback nutzen (Standard: true, **NEU**)
- `SCRAPER_BROWSER_TIMEOUT`: Browser-Timeout in Sekunden (Standard: 30, **NEU**)

### Enhanced Web Scraper mit Browser-Automatisierung 🌐

Der Web Scraper wurde mit **Playwright-basierter Browser-Automatisierung** erweitert:

**Standard-Scraping** (curl_cffi / httpx):
- **Umfassende Metadaten-Extraktion**: JSON-LD, Open Graph, Twitter Cards, Meta Tags
- **Intelligente Bild-Validierung**: Prüft ob Bilder wirklich existieren, automatische Fallbacks
- **Smart Caching**: In-Memory Cache mit konfigurierbarer TTL für bessere Performance
- **Spezial-Domain-Handling**: Optimierte Extraktion für GitHub, LinkedIn, Twitter, Instagram, Amazon, eBay, Etsy
- **Mehrfache Fallback-Strategien**: Garantiert immer ein verwendbares Ergebnis

**NEU: Browser-Scraping** (Playwright / Chromium) 🆕:
- ✅ **Shortlink-Auflösung**: Funktioniert perfekt mit bit.ly, t.co, goo.gl und allen anderen Diensten
- ✅ **Bot-Erkennung umgehen**: Verwendet echten Chromium-Browser statt HTTP-Requests
- ✅ **JavaScript-Rendering**: Scraped Single-Page-Applications (SPAs) korrekt
- ✅ **Anti-Detection**: Entfernt WebDriver-Property, verwendet realistische Browser-Fingerprints
- ✅ **Automatischer Fallback**: Wird nur aktiviert wenn Standard-Scraping fehlschlägt oder blockiert wird

**Funktionsweise**:
1. Versuch mit Standard-HTTP (schnell, < 1s)
2. Bei Fehler/Bot-Block: Browser-Scraping (langsamer, 2-5s, aber zuverlässig)
3. Bei allem Fehlschlag: Intelligente Fallbacks

Siehe [docs/SCRAPER_DOCUMENTATION.md](docs/SCRAPER_DOCUMENTATION.md) und [docs/BROWSER_SCRAPING_DE.md](docs/BROWSER_SCRAPING_DE.md) für Details.

## 📁 Projekt-Struktur

```
Link-in-Bio/
├── main.py                   # FastAPI Application Entry Point
├── download_vendor.py        # Script zum Download von Vendor-Dateien
├── app/                      # Hauptanwendung
│   ├── __init__.py
│   ├── config.py             # Konfiguration und Template-Setup
│   ├── database.py           # Datenbank-Layer (SQLite)
│   ├── models.py             # Pydantic Models
│   ├── endpoints.py          # API Endpoints
│   ├── auth.py               # Authentifizierung
│   ├── services.py           # Business Logic
│   ├── middleware.py         # Security Middleware
│   ├── exceptions.py         # Exception Handlers
│   ├── rate_limit.py         # Rate Limiting
│   ├── cache.py              # In-Memory Cache
│   ├── logging_config.py     # Logging Konfiguration
│   └── scraper/              # Web Scraping Module
│       ├── __init__.py
│       ├── scraper.py        # Haupt-Scraper (Orchestrator)
│       ├── scraper_browser.py      # Browser-basiertes Scraping (Playwright) 🆕
│       ├── scraper_extractors.py   # Metadaten-Extractoren
│       ├── scraper_utils.py        # Scraper Utilities
│       └── scraper_domains.py      # Spezial-Domain-Handler
├── templates/                # Jinja2 Templates
│   ├── layout.html
│   ├── index.html
│   ├── admin.html
│   └── ...
├── static/                   # Statische Assets
│   ├── css/
│   ├── js/
│   ├── uploads/             # User Uploads
│   └── vendor/              # Frontend Libraries
├── tests/                    # Test Suite
├── docs/                     # Dokumentation
│   ├── guides/              # Anleitungen
│   ├── archive/             # Archiv-Dokumentation
│   ├── SCRAPER_ARCHITECTURE.md
│   ├── SCRAPER_DOCUMENTATION.md
│   ├── SCRAPER_QUICK_REFERENCE.md
│   └── BROWSER_SCRAPING_DE.md
├── .github/
│   └── workflows/
│       ├── ci.yml           # CI Workflow
│       └── deploy.yml       # Deployment Workflow
├── docker-compose.yml        # Docker Compose Config
├── dockerfile                # Docker Image
├── requirements.txt          # Python Dependencies
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
└── LICENSE
```

## 🧪 Tests

```bash
# Alle Tests ausführen
pytest

# Mit Coverage
pytest --cov=. --cov-report=html

# Spezifische Tests
pytest tests/test_main.py -v
```

## 🛠️ Entwicklung

### Code-Qualität

```bash
# Linting
flake8 .

# Formatting
black .

# Type Checking
mypy .
```

### Vendor-Dateien herunterladen

```bash
python download_vendor.py
```

Dies lädt TailwindCSS, Lucide Icons, SortableJS und andere Frontend-Bibliotheken herunter für Offline-Nutzung.

## 📊 Content-Typen

- **Link**: Einfacher Link mit Auto-Scraping von Titel und Bild
- **Video**: YouTube, Vimeo, Twitch, Spotify Embeds
- **Product**: Produkt-Links mit Preis und Bild
- **Header**: Textüberschrift zur Gruppierung
- **Divider**: Visueller Trenner
- **FAQ**: Aufklappbare Frage-Antwort-Paare
- **Testimonial**: Kundenbewertungen
- **Countdown**: Countdown zu einem Datum
- **Slider Group**: Bildergalerie (Swiper)
- **Grid**: 2-3 Spalten Grid für Bilder
- **Contact Form**: Kontaktformular
- **Email Form**: Newsletter-Anmeldung

## 🔒 Sicherheit

- ✅ Rate Limiting auf allen Endpoints
- ✅ Security Headers (XSS, Frame Options, etc.)
- ✅ Input Validation mit Pydantic
- ✅ SSRF-Protection beim Scraping
- ✅ SQL Injection Protection
- ✅ HTTPS via Caddy mit Let's Encrypt
- ⚠️ **Wichtig**: Admin-Passwort in `.env` ändern!

## 📈 Analytics

Das Admin-Panel bietet:
- Gesamte Klicks
- Klicks pro Tag (30 Tage)
- Top Links
- Top Referer
- Top Länder
- Subscriber-Liste
- Posteingang (Kontaktformular)

## 🚀 Deployment

### GitHub Actions

Das Repository enthält einen Deployment-Workflow (`.github/workflows/deploy.yml`):

1. Bei jedem Push auf `main` wird automatisch deployed
2. Benötigte Secrets in GitHub Settings:
   - `HOST`: Server-IP
   - `USERNAME`: SSH-Username (z.B. root)
   - `SSH_PRIVATE_KEY`: SSH Private Key
   - `ENV_FILE`: Inhalt der .env-Datei

### Manuelles Deployment

Siehe `DEPLOY_CHECKLIST.md` für eine Schritt-für-Schritt-Anleitung.

## 🤝 Contributing

Contributions sind willkommen! Bitte beachte:

1. Fork das Repository
2. Erstelle einen Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

## 📝 Lizenz

Dieses Projekt ist Open Source. Siehe LICENSE-Datei für Details.

## 💬 Support

Bei Fragen oder Problemen öffne bitte ein Issue auf GitHub.

## 🙏 Credits

Gebaut mit:
- [FastAPI](https://fastapi.tiangolo.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
- [Chart.js](https://www.chartjs.org/)
- [Swiper](https://swiperjs.com/)
- [SortableJS](https://sortablejs.github.io/Sortable/)

---

Made with ❤️ 
