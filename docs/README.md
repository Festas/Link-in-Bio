# 📚 Dokumentation

Diese Dokumentation enthält technische Details und Anleitungen für das Link-in-Bio Projekt.

## 📁 Struktur

### Kern-Dokumentation

| Dokument | Beschreibung |
|----------|--------------|
| **[API_REFERENCE.md](API_REFERENCE.md)** | Vollständige API-Referenz aller Endpoints |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Projekt-Architektur und Modulstruktur |
| **[DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md)** | Datenbank-Struktur (alle DBs im `data/` Ordner) |

### Features & Integrationen

| Dokument | Beschreibung |
|----------|--------------|
| **[ENHANCED_FEATURES.md](ENHANCED_FEATURES.md)** | Übersicht aller erweiterten Features |
| **[SPECIAL_PAGES_ADMIN.md](SPECIAL_PAGES_ADMIN.md)** | Admin Panel für besondere Seiten |
| **[MEDIAKIT_AUTO_STATS.md](MEDIAKIT_AUTO_STATS.md)** | Automatische Social Media Stats im MediaKit |

### Web Scraping

| Dokument | Beschreibung |
|----------|--------------|
| **[SCRAPER_DOCUMENTATION.md](SCRAPER_DOCUMENTATION.md)** | Ausführliche Scraper-Dokumentation |
| **[SCRAPER_ARCHITECTURE.md](SCRAPER_ARCHITECTURE.md)** | Technische Architektur des Scrapers |
| **[SCRAPER_QUICK_REFERENCE.md](SCRAPER_QUICK_REFERENCE.md)** | Schnellreferenz für den Scraper |
| **[BROWSER_SCRAPING_DE.md](BROWSER_SCRAPING_DE.md)** | Browser-basiertes Scraping mit Playwright |

### Social Media Integrationen

| Dokument | Beschreibung |
|----------|--------------|
| **[INSTAGRAM_INTEGRATION.md](INSTAGRAM_INTEGRATION.md)** | Instagram API Integration & Token-Erneuerung |
| **[TIKTOK_INTEGRATION.md](TIKTOK_INTEGRATION.md)** | TikTok API Integration & Token-Erneuerung |

### Migration & Setup

| Dokument | Beschreibung |
|----------|--------------|
| **[QUICK_START.md](QUICK_START.md)** | Schnelleinstieg für das MediaKit |
| **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** | Migration von Linktree/Beacons.ai |
| **[COMPETITIVE_ANALYSIS_2025.md](COMPETITIVE_ANALYSIS_2025.md)** | Wettbewerbsanalyse und Positionierung |

### Anleitungen (`guides/`)

| Dokument | Beschreibung |
|----------|--------------|
| **[DESIGN_SYSTEM.md](guides/DESIGN_SYSTEM.md)** | Design-System und UI-Komponenten |
| **[DEPLOY_CHECKLIST.md](guides/DEPLOY_CHECKLIST.md)** | Deployment-Checkliste für Hetzner |

### Archiv (`archive/`)

Historische Dokumentation von früheren Implementierungsphasen. Diese Dateien werden zu Referenzzwecken aufbewahrt, sind aber möglicherweise veraltet.

## 🏗️ Projekt-Struktur

```
Link-in-Bio/
├── app/                     # Hauptanwendung
│   ├── routers/            # API Router (modular)
│   ├── scraper/            # Web Scraping Module
│   └── *.py                # Core-Module
├── data/                    # 📁 Alle Datenbanken (NEU)
│   ├── linktree.db         # Hauptdatenbank
│   ├── special_pages.db    # Spezielle Seiten
│   ├── pages.db            # Custom Pages
│   └── mediakit.db         # MediaKit
├── static/                  # Statische Assets
│   ├── css/
│   ├── js/
│   ├── uploads/            # User Uploads
│   └── vendor/             # Frontend Libraries
├── templates/               # Jinja2 Templates
├── tests/                   # Test Suite
├── docs/                    # 📚 Dokumentation
│   ├── guides/             # Anleitungen
│   └── archive/            # Archivierte Docs
└── .github/workflows/       # CI/CD Workflows
```

## 📝 Root-Dokumentation

Die wichtigsten Dokumente im Projekt-Root:
- `README.md` - Haupt-Dokumentation und Quick Start
- `CHANGELOG.md` - Versionshistorie
- `CONTRIBUTING.md` - Beitragsrichtlinien
- `LICENSE` - MIT Lizenz
