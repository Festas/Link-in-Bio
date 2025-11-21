# Link-in-Bio 🔗

Eine selbst-gehostete Link-in-Bio Plattform - die Alternative zu Linktree, Linkfire & Co.

## ✨ Features

- 🎨 **Anpassbares Design** - Verschiedene Themes und vollständige Farbanpassung
- 🔗 **Unbegrenzte Links** - Füge so viele Links hinzu, wie du möchtest
- 📊 **Analytics** - Verfolge Klicks, Länder und Referrer
- 🎥 **Video-Embeds** - YouTube, Vimeo, Spotify, Twitch
- 📱 **Responsive Design** - Perfekt auf allen Geräten
- 🖼️ **Slider & Grids** - Organisiere Inhalte in Gruppen
- ❓ **FAQ-Sektion** - Beantworte häufige Fragen
- 💬 **Kontaktformular** - Empfange Nachrichten von Besuchern
- 📧 **Newsletter** - Sammle Subscriber
- 🔒 **Selbst-gehostet** - Volle Kontrolle über deine Daten
- 🚀 **Einfaches Deployment** - Mit Docker in Minuten live

## 🚀 Schnellstart

### Voraussetzungen

- Python 3.11+ oder Docker
- Einen Server (z.B. Hetzner, DigitalOcean) für Production

### Lokale Entwicklung

1. **Repository klonen**
```bash
git clone https://github.com/Festas/Link-in-Bio.git
cd Link-in-Bio
```

2. **Environment-Datei erstellen**
```bash
cp .env.example .env
```

3. **`.env` Datei bearbeiten** - Setze sichere Credentials!
```env
ADMIN_USERNAME=dein-username
ADMIN_PASSWORD=ein-sehr-sicheres-passwort
APP_DOMAIN=127.0.0.1
```

4. **Dependencies installieren**
```bash
pip install -r requirements.txt
```

5. **Server starten**
```bash
python main.py
```

Die Anwendung läuft jetzt auf `http://127.0.0.1:8000`

### Docker Deployment

1. **`.env` Datei erstellen** (siehe oben)

2. **Docker Container starten**
```bash
docker compose up -d --build
```

3. **Fertig!** Die App läuft jetzt auf Port 80/443

## 📁 Projekt-Struktur

```
Link-in-Bio/
├── main.py              # FastAPI Hauptanwendung
├── endpoints.py         # API Endpoints
├── models.py            # Pydantic Models
├── database.py          # SQLite Datenbank-Layer
├── auth.py              # Authentifizierung
├── services.py          # Business Logic
├── scraper.py           # Link Metadata Scraper
├── cache.py             # Caching Layer
├── rate_limit.py        # Rate Limiting
├── static/              # CSS, JS, Uploads
│   ├── css/
│   ├── js/
│   └── uploads/
├── templates/           # Jinja2 Templates
│   ├── index.html       # Hauptseite
│   ├── admin.html       # Admin Panel
│   └── ...
├── dockerfile           # Docker Image
├── docker-compose.yml   # Docker Orchestration
└── Caddyfile           # Caddy Reverse Proxy
```

## 🔧 Konfiguration

### Environment Variables

| Variable | Beschreibung | Default | Erforderlich |
|----------|--------------|---------|--------------|
| `ADMIN_USERNAME` | Admin Login | - | ✅ |
| `ADMIN_PASSWORD` | Admin Passwort (min. 12 Zeichen) | - | ✅ |
| `APP_DOMAIN` | Deine Domain | `127.0.0.1` | ✅ |
| `JSONLINK_API_KEY` | Optional: API Key für besseres Link-Scraping | - | ❌ |
| `SCRAPER_MAX_RETRIES` | Max. Scraper-Versuche | `5` | ❌ |
| `ENVIRONMENT` | `development` oder `production` | `development` | ❌ |

### Domain anpassen

Öffne `Caddyfile` und ersetze die Domain:

```
deine-domain.de {
    reverse_proxy linktree:8000
}
```

## 📱 Nutzung

### Admin Panel

1. Öffne `https://deine-domain.de/admin`
2. Login mit deinen Credentials aus `.env`
3. Füge Links, Videos, FAQs, etc. hinzu
4. Passe Design und Profil an

### Öffentliche Seite

- Haupt-Link-Seite: `https://deine-domain.de/`
- Analytics: `https://deine-domain.de/analytics`
- Datenschutz: `https://deine-domain.de/privacy`

## 🔒 Sicherheit

### Wichtige Sicherheitsmaßnahmen

✅ **Implementiert:**
- HTTPS via Caddy (Let's Encrypt)
- Rate Limiting
- SSRF Protection im Scraper
- Security Headers (X-XSS-Protection, X-Frame-Options, etc.)
- Basic Authentication mit Secrets-Vergleich

⚠️ **Empfehlungen:**
- Verwende ein **starkes Passwort** (min. 12 Zeichen)
- Halte Dependencies aktuell: `pip install -U -r requirements.txt`
- Mache regelmäßige Backups der `linktree.db`
- Überwache Logs auf verdächtige Aktivitäten

## 📊 Analytics

Das Analytics-Dashboard zeigt:
- Total Klicks
- Klicks pro Tag (Chart)
- Top Links
- Top Länder
- Top Referrer
- Subscriber-Anzahl

## 🎨 Theming

Verfügbare Themes:
- `theme-dark` - Dunkler Modus (Standard)
- `theme-picasso` - Künstlerischer Farbverlauf
- Custom - Eigene Farben über Admin Panel

Button-Stile:
- `style-rounded` - Abgerundete Ecken
- `style-sharp` - Scharfe Kanten
- `style-pill` - Vollständig rund

## 🛠️ Development

### Testing

```bash
# Tests ausführen
pytest

# Mit Coverage
pytest --cov=. --cov-report=html
```

### Code Quality

```bash
# Linting
flake8 .

# Formatting
black .

# Type Checking
mypy .
```

## 📦 Deployment auf Hetzner/VPS

Siehe [DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md) für eine detaillierte Anleitung.

**Kurzversion:**
1. Ubuntu Server mieten
2. Docker installieren: `apt install docker.io docker-compose-v2 -y`
3. GitHub Repository klonen
4. `.env` Datei erstellen
5. `docker compose up -d --build`
6. Fertig!

## 🔄 Updates

```bash
# Neueste Version holen
git pull origin main

# Container neu starten
docker compose up -d --build

# Alte Images aufräumen
docker image prune -f
```

## 🐛 Troubleshooting

### App startet nicht

**Problem:** "ADMIN_USERNAME und ADMIN_PASSWORD müssen gesetzt sein"
- **Lösung:** Erstelle `.env` Datei basierend auf `.env.example`

### Links werden nicht gescraped

**Problem:** Metadata von Links wird nicht geladen
- **Lösung:** Prüfe Internet-Verbindung, evtl. `JSONLINK_API_KEY` setzen

### Datenbank gesperrt

**Problem:** "Database is locked"
- **Lösung:** SQLite unterstützt keine gleichzeitigen Schreibzugriffe. Für High-Traffic auf PostgreSQL migrieren.

## 📈 Performance-Tipps

- **Caching:** Redis statt In-Memory für Production
- **Datenbank:** PostgreSQL für viele gleichzeitige Nutzer
- **Assets:** CDN für statische Dateien
- **Monitoring:** Sentry für Error Tracking

## 📄 Lizenz

MIT License - siehe LICENSE Datei

## 🤝 Contributing

Contributions sind willkommen! Bitte:
1. Fork das Repository
2. Erstelle einen Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit deine Änderungen (`git commit -m 'Add AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

## 📞 Support

Bei Fragen oder Problemen öffne ein [GitHub Issue](https://github.com/Festas/Link-in-Bio/issues).

## 🙏 Danksagungen

- FastAPI - Web Framework
- Tailwind CSS - Styling
- Lucide Icons - Icons
- Caddy - Web Server

---

Made with ❤️ by [Festas](https://github.com/Festas)
