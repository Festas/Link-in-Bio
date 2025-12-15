# Link-in-Bio 🎮⚡

Eine moderne, selbst-gehostete Link-in-Bio Lösung die **besser als Linktree & Beacons.ai** ist - gebaut mit FastAPI und modernen Web-Technologien. Optimiert für Content Creators, Influencer und Gaming-Enthusiasten.

## 🏆 Warum besser als die Konkurrenz?

| Feature | Link-in-Bio | Beacons.ai | Linktree |
|---------|-------------|------------|----------|
| **💰 Transaction Fees** | ✅ **0% Forever** | ❌ 2.5-9% | ❌ 2-5% |
| **🏠 Self-Hosted** | ✅ **Full Control** | ❌ Cloud Only | ❌ Cloud Only |
| **🔐 2FA Security** | ✅ **Free** | ⚠️ Paid Only | ⚠️ Paid Only |
| **📊 Advanced Analytics** | ✅ **Free** | ✅ Yes | ⚠️ $9-24/mo |
| **📄 Media Kit** | ✅ **Free** | ✅ Yes | ❌ No |
| **🎨 Custom CSS** | ✅ **Full Control** | ❌ Limited | ❌ Limited |
| **📁 Multiple Pages** | ✅ **Unlimited** | ❌ Single | ❌ Single |
| **💾 Data Ownership** | ✅ **100% Yours** | ❌ No | ❌ No |
| **🔓 Open Source** | ✅ **MIT License** | ❌ Proprietary | ❌ Proprietary |

**💵 Cost Savings:** $300-5,000/year in transaction fees saved!

👉 **[Full Competitive Analysis](./docs/COMPETITIVE_ANALYSIS_2025.md)** | **[Migration Guide](./docs/MIGRATION_GUIDE.md)**

## ✨ Features

### Core Features
- 🎨 **Professionelles Gaming/Tech Design**: Moderne Glassmorphism-Effekte mit Neon-Akzenten
- 🔗 **Vielseitige Content-Typen**: Links, Videos, Produkte, FAQs, Testimonials, Countdowns und mehr
- 📊 **Advanced Analytics**: Conversion tracking, UTM campaigns, funnel analysis, real-time dashboard
- 📧 **Community Features**: Newsletter-Abonnements und Kontaktformular
- 🖼️ **Media Management**: Bild-Upload mit automatischer Optimierung
- 🎯 **SEO-Optimiert**: Meta-Tags, Sitemap, Robots.txt und Social Cards
- 🚀 **High Performance**: Redis caching, async/await, connection pooling, optimized queries
- 🔒 **Enterprise Security**: Bcrypt password hashing, 2FA, session management, CSRF protection
- 📱 **PWA-Ready**: Service Worker und Manifest für Installation als App
- 🐳 **Docker-Ready**: Vollständige Docker-Compose-Konfiguration mit Caddy

### 🆕 NEW: Enhanced Features (v2.0)
- 🔐 **Password Hashing**: Bcrypt-based secure password storage
- 🔑 **Two-Factor Auth**: TOTP-based 2FA for extra security
- ⚡ **Redis Caching**: Distributed caching for horizontal scaling
- 📈 **Conversion Tracking**: Track and optimize conversion goals
- 🎯 **Funnel Analytics**: Multi-step conversion funnel analysis
- 🔗 **UTM Tracking**: Campaign performance tracking
- 📊 **Real-Time Analytics**: Live dashboard with current activity
- 🎨 **Event System**: Custom event tracking for any action
- 🔄 **Session Management**: Secure session-based authentication

### 🛡️ NEW: Security & Infrastructure (v2.1)
- 🔒 **Input Sanitization**: Comprehensive input validation helpers (`app/sanitization.py`)
- 📋 **Audit Logging**: Track all admin actions with database-backed logging (`app/audit_log.py`)
- 🌍 **i18n Foundation**: Translation system with German and English locales
- 📡 **Enhanced Offline Mode**: Improved PWA with request queueing
- 🚨 **Custom Error Pages**: User-friendly 404 and 500 error pages
- 🔧 **Modular Routers**: Extracted special pages and mediakit into separate modules
- 📦 **Asset Optimization**: Makefile targets for CSS/JS minification

👉 **[See all enhanced features](./docs/ENHANCED_FEATURES.md)** | **[Competitive Analysis 2025](./docs/COMPETITIVE_ANALYSIS_2025.md)** | **[Migrate from Linktree/Beacons](./docs/MIGRATION_GUIDE.md)**

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

# Option 1: Use interactive setup (recommended)
python setup_enhanced.py

# Option 2: Manual configuration
# Edit .env and set password + domain
# Generate password hash: python -c "from app.auth_enhanced import hash_password; print(hash_password('your-password'))"
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

2. **Nginx und SSL einrichten**
```bash
# Automatisches Setup-Script (empfohlen)
sudo ./scripts/setup-nginx-ssl.sh

# Oder siehe docs/NGINX_MIGRATION.md für manuelle Schritte
```

3. **Container starten**
```bash
# Empfohlen: Nutze make, um sicherzustellen dass alle Datenbanken vorhanden sind
make docker-up

# Oder manuell:
./ensure_databases.sh  # Prüft/erstellt data/*.db Dateien
docker-compose up -d
```

> **Hinweis**: 
> - Alle Datenbanken werden im `data/` Ordner gespeichert und als Volume gemountet.
> - Der Web-Container exponiert Port 8000 auf 127.0.0.1 für Nginx Reverse Proxy
> - SSL-Zertifikate werden via Certbot/Let's Encrypt verwaltet

## 🔧 Konfiguration

### Umgebungsvariablen

Siehe `.env.example` für alle verfügbaren Optionen:

- `ADMIN_USERNAME`: Admin-Benutzername (Standard: admin)
- `ADMIN_PASSWORD`: **WICHTIG**: Unbedingt ändern!
- `APP_DOMAIN`: Deine Domain (z.B. example.com)
- `JSONLINK_API_KEY`: Optional für erweiterte Link-Vorschau
- `SCRAPER_MAX_RETRIES`: Anzahl Retries beim Scraping (Standard: 5)
- `SCRAPER_CACHE_TTL`: Cache-TTL für Scraping in Sekunden (Standard: 3600)
- `SCRAPER_BROWSER_ENABLED`: Browser-Scraping aktivieren (Standard: true)

### Datenbanken

Alle Datenbanken werden automatisch im `data/` Ordner gespeichert:
- `data/linktree.db` - Hauptdatenbank (Items, Clicks, Settings)
- `data/special_pages.db` - Spezielle Seiten
- `data/pages.db` - Custom Pages
- `data/mediakit.db` - MediaKit

Siehe [docs/DATABASE_ARCHITECTURE.md](docs/DATABASE_ARCHITECTURE.md) für Details.

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
├── init_databases.py         # Datenbank-Initialisierung
├── app/                      # Hauptanwendung
│   ├── config.py             # Konfiguration
│   ├── database.py           # Datenbank-Layer (alle DBs in data/)
│   ├── models.py             # Pydantic Models
│   ├── auth_unified.py       # Authentifizierung
│   ├── cache_unified.py      # Caching
│   ├── sanitization.py       # 🆕 Input-Validierung & Sanitization
│   ├── audit_log.py          # 🆕 Audit Logging für Admin-Aktionen
│   ├── i18n.py               # 🆕 Internationalisierung
│   ├── exceptions.py         # Custom Error Handling
│   ├── routers/              # Modulare API Router
│   │   ├── pages.py
│   │   ├── items.py
│   │   ├── analytics.py
│   │   ├── special_pages.py  # 🆕 Extrahierte Special Pages API
│   │   ├── mediakit.py       # 🆕 Extrahierte MediaKit API
│   │   └── ...
│   └── scraper/              # Web Scraping Module
│       ├── scraper.py        # Haupt-Scraper
│       └── scraper_browser.py # Browser-basiertes Scraping
├── data/                     # 📁 Alle Datenbanken (zentralisiert)
│   ├── linktree.db           # Hauptdatenbank
│   ├── special_pages.db      # Spezielle Seiten
│   ├── pages.db              # Custom Pages
│   ├── mediakit.db           # MediaKit
│   └── audit.db              # 🆕 Audit Log
├── locales/                  # 🆕 Übersetzungsdateien
│   ├── de.json               # Deutsch
│   └── en.json               # English
├── templates/                # Jinja2 Templates
│   ├── errors/               # 🆕 Custom Error Pages
│   │   ├── 404.html
│   │   └── 500.html
│   └── ...
├── static/                   # Statische Assets
│   ├── css/
│   ├── js/
│   │   ├── logger.js         # 🆕 Debug-aware Logging
│   │   ├── sw.js             # 🆕 Enhanced Service Worker
│   │   └── ...
│   ├── uploads/              # User Uploads
│   └── vendor/               # Frontend Libraries
├── tests/                    # Test Suite
│   ├── test_sanitization.py  # 🆕 Sanitization Tests
│   ├── test_audit_log.py     # 🆕 Audit Log Tests
│   └── ...
├── docs/                     # 📚 Dokumentation
│   ├── API_REFERENCE.md      # API Dokumentation
│   ├── ARCHITECTURE.md       # Architektur
│   ├── DATABASE_ARCHITECTURE.md
│   ├── guides/               # Anleitungen
│   │   └── DEPLOY_CHECKLIST.md # 🆕 Erweiterte Deployment-Anleitung
│   └── archive/              # Archivierte Docs
├── .github/workflows/        # CI/CD Workflows
│   ├── ci.yml                # Tests & Linting
│   └── deploy.yml            # Auto-Deploy zu Hetzner
├── docker-compose.yml        # Docker Compose Config
├── dockerfile                # Docker Image
├── Makefile                  # 🆕 Build-Targets inkl. Asset-Minifizierung
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
- ✅ HTTPS via Nginx mit Let's Encrypt (Certbot)
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

Siehe `docs/guides/DEPLOY_CHECKLIST.md` für eine Schnell-Checkliste.

### 📚 Umfassende Deployment-Anleitung

Für eine vollständige Schritt-für-Schritt-Anleitung zur Hetzner-Server-Konfiguration:
👉 **[HETZNER_DEPLOYMENT.md](./docs/HETZNER_DEPLOYMENT.md)**

Diese Anleitung enthält:
- Server-Setup mit Docker
- DNS-Konfiguration
- GitHub Secrets einrichten
- Sicherheits-Konfiguration (Passwort-Hash, 2FA)
- Troubleshooting-Tipps

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
