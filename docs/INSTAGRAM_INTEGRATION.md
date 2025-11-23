# Instagram MediaKit Integration - Dokumentation

## Übersicht

Diese Integration ermöglicht das automatische Abrufen von Instagram-Statistiken über die Meta Graph API und deren Integration in das MediaKit-System.

## Features

- ✅ **Meta Graph API Integration**: Verwendet offizielle Instagram Business API für präzise Daten
- ✅ **Automatische Token-Erneuerung**: Long-lived Access Tokens werden automatisch alle 60 Tage erneuert
- ✅ **Tägliche Updates**: GitHub Actions aktualisiert Statistiken täglich um 3 Uhr UTC
- ✅ **Manuelle Updates**: Admin-Panel Button für sofortige Aktualisierung
- ✅ **Datenbank-Integration**: Statistiken werden in der bestehenden `social_stats_cache` Tabelle gespeichert
- ✅ **TikTok-vorbereitet**: Struktur ermöglicht einfache Erweiterung für weitere Plattformen

## Dateien

### Neue Dateien

1. **`app/instagram_fetcher.py`** - Instagram API Fetcher Klasse
   - Holt Instagram Account ID
   - Fetcht Analytics (Follower, Posts, Reach, Impressions, Profile Views)
   - Erneuert Access Token automatisch
   - Formatiert Daten für MediaKit

2. **`fetch_instagram_stats.py`** - CLI-Script für manuelle/automatische Updates
   - Lädt Credentials aus `.env.social`
   - Initialisiert Datenbank
   - Fetcht und speichert Instagram Stats
   - Zeigt Zusammenfassung

3. **`.env.social`** - Social Media API Credentials (NICHT in Git!)
   - Instagram Access Token
   - Instagram Username
   - App ID & App Secret (für Token Refresh)
   - Wird 1:1 als GitHub Secret `INSTAGRAM_SECRET` gespeichert

4. **`.env.social.example`** - Template für `.env.social`
   - Mit Platzhaltern für alle benötigten Credentials
   - Vorbereitet für TikTok, YouTube

5. **`.github/workflows/fetch-instagram-stats.yml`** - GitHub Action Workflow
   - Läuft täglich um 3 Uhr UTC
   - Kann manuell getriggert werden
   - Deployed Stats auf Production Server
   - Speichert Logs als Artifact

### Geänderte Dateien

1. **`app/endpoints.py`** 
   - Neue Route: `POST /api/mediakit/refresh-instagram-api`
   - Integriert Instagram Fetcher in bestehendes System
   - Speichert Stats in Cache und mediakit_data

2. **`static/js/admin_mediakit.js`**
   - Neue Funktion: `refreshInstagramAPI()`
   - Handelt API-Aufruf und Token-Refresh-Warnung
   - Export für globalen Zugriff

3. **`templates/admin.html`**
   - Neuer Button "Instagram API aktualisieren" im MediaKit-Tab
   - Info-Text über automatische Updates

4. **`.gitignore`**
   - `.env.social` hinzugefügt (verhindert Commit von Secrets)

## Setup

### 1. Instagram API Credentials erhalten

1. Gehe zu [Meta for Developers](https://developers.facebook.com/)
2. Erstelle eine App (falls noch nicht vorhanden)
3. Verbinde deine Instagram Business Account
4. Hole Long-Lived Access Token:
   - Gehe zu [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
   - Wähle deine App
   - Wähle "Instagram Business Account"
   - Klicke "Generate Access Token"
   - Kopiere den Token

5. Notiere:
   - `INSTAGRAM_ACCESS_TOKEN`: Dein Long-Lived Token
   - `INSTAGRAM_USERNAME`: Dein Instagram Username (z.B. `festas_builds`)
   - `INSTAGRAM_APP_ID`: Deine App ID
   - `INSTAGRAM_APP_SECRET`: Dein App Secret

### 2. `.env.social` Datei erstellen

Kopiere `.env.social.example` zu `.env.social` und fülle die Werte aus:

```bash
cp .env.social.example .env.social
```

Editiere `.env.social`:
```
INSTAGRAM_ACCESS_TOKEN=dein_token_hier
INSTAGRAM_USERNAME=festas_builds
INSTAGRAM_APP_ID=deine_app_id
INSTAGRAM_APP_SECRET=dein_app_secret
```

### 3. GitHub Secret erstellen

1. Gehe zu deinem Repository → Settings → Secrets and variables → Actions
2. Klicke "New repository secret"
3. Name: `INSTAGRAM_SECRET`
4. Value: **Kompletter Inhalt** der `.env.social` Datei (kopiere alle Zeilen 1:1)
5. Klicke "Add secret"

### 4. Testen (lokal)

```bash
# Stats manuell abrufen
python3 fetch_instagram_stats.py

# Mock-Test (ohne Netzwerk)
python3 test_instagram_fetcher.py
```

## Nutzung

### Automatisch (täglich)

Die GitHub Action läuft automatisch jeden Tag um 3 Uhr UTC und:
1. Lädt Instagram Stats
2. Deployed sie auf den Production Server
3. Erneuert den Access Token (alle ~30 Tage)

### Manuell (Admin-Panel)

1. Gehe zum Admin-Panel → Media Kit Tab
2. Klicke auf "Instagram API aktualisieren" Button
3. Warte auf Bestätigung
4. Falls Token erneuert wurde, erscheint eine Warnung → Update GitHub Secret!

### Token-Erneuerung

Long-lived Tokens sind 60 Tage gültig. Der Fetcher erneuert sie automatisch:

1. Script zeigt neue Token in Console/Logs
2. `.env.social` wird lokal automatisch aktualisiert
3. **WICHTIG**: GitHub Secret `INSTAGRAM_SECRET` muss manuell aktualisiert werden!

## API Endpoints

### `POST /api/mediakit/refresh-instagram-api`
**Auth**: Required

Fetcht frische Instagram Stats über Meta Graph API.

**Response**:
```json
{
  "message": "Instagram Statistiken erfolgreich über API aktualisiert",
  "data": {
    "username": "festas_builds",
    "followers": 104700,
    "followers_formatted": "104.7k",
    "posts": 456,
    "reach_daily": 15000,
    "impressions_daily": 25000,
    "profile_views": 3500
  },
  "source": "Meta Graph API",
  "updated_at": "2025-11-23T18:00:00.000Z",
  "token_refreshed": false
}
```

Falls Token erneuert:
```json
{
  ...,
  "token_refreshed": true,
  "warning": "Access Token wurde erneuert. Bitte GitHub Secret 'INSTAGRAM_SECRET' aktualisieren!",
  "new_token": "EAAMPNv2JuZBQBQI..."
}
```

## Datenstruktur

Stats werden in `social_stats_cache` Tabelle gespeichert:

```sql
CREATE TABLE social_stats_cache (
    id INTEGER PRIMARY KEY,
    platform TEXT NOT NULL,
    username TEXT NOT NULL,
    stats_data TEXT NOT NULL,  -- JSON
    fetched_at DATETIME,
    UNIQUE(platform, username)
);
```

**JSON Format** (stats_data):
```json
{
  "meta": {
    "updated_at": "2025-11-23T18:00:00Z",
    "source": "Meta Graph API",
    "api_version": "v18.0"
  },
  "profile": {
    "username": "festas_builds",
    "name": "Eric | Tech & Gaming",
    "avatar": "https://...",
    "bio": "Tech & Gaming Influencer...",
    "url": "https://instagram.com/festas_builds"
  },
  "stats": {
    "followers": 104700,
    "posts": 456,
    "reach_daily": 15000,
    "impressions_daily": 25000,
    "profile_views": 3500
  },
  "platform": "instagram",
  "followers": 104700,
  "posts": 456,
  "fetched_at": "2025-11-23T18:00:00Z"
}
```

## Erweiterung für TikTok

Die Struktur ist bereits vorbereitet:

1. Erstelle `app/tiktok_fetcher.py` (ähnlich wie `instagram_fetcher.py`)
2. Füge TikTok Credentials in `.env.social` hinzu:
   ```
   TIKTOK_ACCESS_TOKEN=...
   TIKTOK_USERNAME=...
   TIKTOK_APP_ID=...
   TIKTOK_APP_SECRET=...
   ```
3. Update `fetch_instagram_stats.py` → Umbenennen zu `fetch_social_stats.py` und beide Plattformen fetchen
4. Update GitHub Action Workflow
5. Fertig!

## Sicherheit

- ✅ `.env.social` ist in `.gitignore` → NIE in Git committed
- ✅ Secrets nur in GitHub Secrets gespeichert
- ✅ Access Tokens haben 60 Tage Laufzeit
- ✅ Automatische Token-Rotation
- ✅ API verwendet HTTPS
- ✅ Admin-Panel erfordert Authentifizierung

## Troubleshooting

### "Kein Access Token in der .env Datei gefunden"
- Stelle sicher, dass `.env.social` existiert und `INSTAGRAM_ACCESS_TOKEN` enthält

### "Kein Instagram Business Account für [username] gefunden"
- Prüfe, ob der Account ein Business Account ist
- Prüfe, ob der Account mit deiner Meta App verbunden ist
- Prüfe, ob der Username korrekt ist (ohne @)

### "Token refresh failed"
- Prüfe `INSTAGRAM_APP_ID` und `INSTAGRAM_APP_SECRET`
- Stelle sicher, dass die App noch aktiv ist
- Generiere neuen Long-Lived Token manuell

### GitHub Action schlägt fehl
- Prüfe, ob `INSTAGRAM_SECRET` Secret existiert
- Prüfe, ob der Inhalt korrekt ist (alle 4 Zeilen)
- Prüfe GitHub Action Logs für Details

## Monitoring

- **GitHub Actions**: Siehe Actions Tab → "Daily Instagram Stats Update"
- **Server Logs**: `docker compose logs -f web`
- **Admin Panel**: Erfolgs-/Fehlermeldungen nach Button-Klick

## License

Teil des Link-in-Bio Projekts.
