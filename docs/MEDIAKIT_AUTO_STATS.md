# Media Kit Auto-Stats Feature

## 🎯 Übersicht

Das Media Kit synchronisiert automatisch deine Social Media Statistiken von Instagram, TikTok und anderen Plattformen. Deine Follower-Zahlen werden über offizielle APIs abgerufen und täglich aktualisiert.

## ⚠️ WICHTIGER HINWEIS: Scraping ist veraltet

**Web-Scraping für Social Media Stats funktioniert nicht mehr zuverlässig.**

Die alten Scraping-Methoden in `app/social_stats.py` sind deprecated, weil:

### Instagram Probleme
- Das `window._sharedData` Pattern wurde von Instagram vor Jahren entfernt
- `edge_followed_by` Regex-Patterns funktionieren nicht mehr
- Instagram erfordert Authentifizierung und liefert Daten nur über interne GraphQL API

### TikTok Probleme
- TikTok hat starke Bot-Erkennung und CAPTCHAs
- Daten werden via JavaScript geladen (nicht im initialen HTML)
- Das `__UNIVERSAL_DATA_FOR_REHYDRATION__` Pattern ist unzuverlässig
- Rate Limiting und IP-Blocking

## ✅ Empfohlener Ansatz: Offizielle APIs

Das Repository nutzt bereits die richtigen API-basierten Fetcher:

| Plattform | Fetcher-Datei | API | Dokumentation |
|-----------|--------------|-----|---------------|
| Instagram | `app/instagram_fetcher.py` | Meta Graph API | [INSTAGRAM_INTEGRATION.md](INSTAGRAM_INTEGRATION.md) |
| TikTok | `app/tiktok_fetcher.py` | TikTok Official API | [TIKTOK_INTEGRATION.md](TIKTOK_INTEGRATION.md) |

### Automatische Updates via GitHub Actions

Stats werden automatisch täglich um 3 Uhr UTC aktualisiert:
- `fetch_instagram_stats.py` - Läuft via `.github/workflows/fetch-instagram-stats.yml`
- `fetch_tiktok_stats.py` - Läuft via `.github/workflows/fetch-tiktok-stats.yml`

## ✨ Features

### 1. **Automatische Daten-Synchronisation**
- 📊 Automatisches Abrufen von Follower-Zahlen via APIs
- 🔄 Tägliche automatische Aktualisierung via GitHub Actions
- 💾 Intelligentes Caching zur Performance-Optimierung
- ⏱️ Zeitstempel für letzte Aktualisierung
- 🔐 Automatische Token-Erneuerung

### 2. **Unterstützte Plattformen**
- **Instagram**: Follower, Posts, Reach, Impressions, Profile Views
- **TikTok**: Follower, Likes, Videos, Engagement Rate, Avg. Views
- **YouTube**: In Vorbereitung (benötigt YouTube Data API v3)

### 3. **Optimiertes Design**
- 🎨 Professionelles, verkaufsförderndes Layout
- 💼 "Why Work With Me?" Sektion mit Value Propositions
- 🏆 Trust Badges (Auto-Updated Stats, Verified Data)
- 🚀 Verbesserte Call-to-Actions
- 📱 Vollständig responsive für alle Geräte

## 🚀 Setup-Anleitung

### Schritt 1: API Credentials einrichten

#### Instagram (Meta Graph API)

1. Gehe zu [Meta for Developers](https://developers.facebook.com/)
2. Erstelle eine App und verbinde dein Instagram Business Account
3. Hole einen Long-Lived Access Token
4. Erstelle `.env.social`:

```bash
INSTAGRAM_ACCESS_TOKEN=dein_token_hier
INSTAGRAM_USERNAME=dein_username
INSTAGRAM_APP_ID=deine_app_id
INSTAGRAM_APP_SECRET=dein_app_secret
```

Siehe [INSTAGRAM_INTEGRATION.md](INSTAGRAM_INTEGRATION.md) für Details.

#### TikTok (Official API)

1. Gehe zu [TikTok for Developers](https://developers.tiktok.com/)
2. Erstelle eine App und durchlaufe OAuth Flow
3. Erstelle `.env.social`:

```bash
TIKTOK_ACCESS_TOKEN=dein_access_token
TIKTOK_REFRESH_TOKEN=dein_refresh_token
TIKTOK_CLIENT_KEY=dein_client_key
TIKTOK_CLIENT_SECRET=dein_client_secret
```

Siehe [TIKTOK_INTEGRATION.md](TIKTOK_INTEGRATION.md) für Details.

### Schritt 2: GitHub Secrets erstellen

1. Gehe zu Repository → Settings → Secrets → Actions
2. Erstelle Secret `INSTAGRAM_SECRET` mit Inhalt der .env.social (Instagram Teil)
3. Erstelle Secret `TIKTOK_SECRET` mit Inhalt der .env.social (TikTok Teil)

### Schritt 3: Manuell testen

```bash
# Instagram Stats abrufen
python fetch_instagram_stats.py

# TikTok Stats abrufen
python fetch_tiktok_stats.py
```

### Schritt 4: GitHub Actions aktivieren

Die Workflows laufen automatisch täglich. Du kannst sie auch manuell triggern:
- Actions → "Daily Instagram Stats Update" → "Run workflow"
- Actions → "Daily TikTok Stats Update" → "Run workflow"

## 📊 Verfügbare Daten

### Instagram (via Meta Graph API)
| Metrik | Beschreibung |
|--------|-------------|
| Follower | Anzahl der Follower |
| Posts | Gesamtzahl der Posts |
| Daily Reach | Tägliche Reichweite |
| Daily Impressions | Tägliche Impressions |
| Profile Views | Profilaufrufe |

### TikTok (via Official API)
| Metrik | Beschreibung |
|--------|-------------|
| Follower | Anzahl der Follower |
| Likes | Gesamtzahl aller Likes |
| Videos | Anzahl der Videos |
| Engagement Rate | Berechnet aus letzten 10 Videos |
| Avg. Views | Durchschnittliche Views |

## 🔧 API Endpoints

### Empfohlene Endpoints (nutzen offizielle APIs)

| Endpoint | Beschreibung |
|----------|-------------|
| `POST /api/mediakit/refresh-instagram-api` | Instagram Stats via Meta Graph API |
| `POST /api/mediakit/refresh-tiktok-api` | TikTok Stats via Official API |
| `GET /api/mediakit/social-stats-cache` | Gecachte Stats abrufen |
| `GET /api/mediakit/analytics/{platform}` | Platform-spezifische Analytics |

### Deprecated Endpoint

| Endpoint | Status |
|----------|--------|
| `POST /api/mediakit/refresh-social-stats` | ⚠️ **DEPRECATED** - Nutzt Scraping, funktioniert nicht mehr zuverlässig |

## 🔒 Sicherheit

- ✅ Tokens werden nur in GitHub Secrets gespeichert
- ✅ `.env.social` ist in `.gitignore` - niemals committen!
- ✅ Automatische Token-Erneuerung via PyNaCl-Verschlüsselung
- ✅ HTTPS für alle API-Aufrufe
- ✅ Minimale API-Berechtigungen

## 🐛 Troubleshooting

### "API credentials not configured"
**Lösung**: 
- Erstelle `.env.social` mit den erforderlichen Credentials
- Prüfe ob alle Environment Variables gesetzt sind

### "Token refresh failed"
**Lösung**:
- Für Instagram: Prüfe APP_ID und APP_SECRET
- Für TikTok: Prüfe ob Refresh Token noch gültig ist (1 Jahr)
- Bei abgelaufenem Refresh Token: OAuth Flow erneut durchlaufen

### "GitHub Secret Update failed"
**Lösung**:
- Prüfe ob Workflow `secrets: write` Permission hat
- Prüfe ob PyNaCl installiert ist: `pip install PyNaCl`

### "No Instagram Business Account found"
**Lösung**:
- Account muss ein Business/Creator Account sein
- Account muss mit Meta App verbunden sein
- Username muss korrekt sein (ohne @)

## 📈 Vorteile gegenüber Scraping

| Aspekt | Scraping (alt) | Official APIs (neu) |
|--------|----------------|---------------------|
| Zuverlässigkeit | ❌ Bricht regelmäßig | ✅ Stabil |
| Genauigkeit | ⚠️ Approximiert | ✅ Exakt |
| Rate Limits | ❌ Schnell blockiert | ✅ Großzügige Limits |
| Metriken | ⚠️ Nur Follower | ✅ Reach, Impressions, etc. |
| Wartung | ❌ Ständige Anpassung | ✅ Minimal |

## 📝 Migration von Scraping zu APIs

Wenn du bisher Scraping verwendet hast:

1. **Richte API Credentials ein** (siehe Setup-Anleitung oben)
2. **Erstelle GitHub Secrets** für automatische Updates
3. **Teste manuell** mit `fetch_instagram_stats.py` / `fetch_tiktok_stats.py`
4. **Aktiviere GitHub Actions** für tägliche Updates

Die alten Scraping-Methoden in `app/social_stats.py` geben jetzt Deprecation-Warnungen aus und empfehlen die API-basierten Alternativen.

## 🤝 Support

Bei Fragen oder Problemen:
1. Prüfe die Dokumentation:
   - [INSTAGRAM_INTEGRATION.md](INSTAGRAM_INTEGRATION.md)
   - [TIKTOK_INTEGRATION.md](TIKTOK_INTEGRATION.md)
2. Schaue in die GitHub Actions Logs
3. Erstelle ein Issue auf GitHub

## 📝 Changelog

### Version 3.0.0 (Dezember 2024)
- ⚠️ Scraping-basierte Stats als deprecated markiert
- ✅ Integration mit offiziellen APIs empfohlen
- 📚 Dokumentation aktualisiert mit Migration Guide
- 🔧 Bessere Fehlermeldungen bei fehlenden API Credentials

### Version 2.0.0 (November 2024)
- ✨ Instagram Meta Graph API Integration
- ✨ TikTok Official API Integration
- 🔐 Automatische Token-Erneuerung
- 🤖 GitHub Actions für tägliche Updates

---

**Viel Erfolg mit deinem automatisierten Media Kit! 🚀**
