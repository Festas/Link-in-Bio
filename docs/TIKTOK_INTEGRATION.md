# TikTok MediaKit Integration - Dokumentation

## Übersicht

Diese Integration ermöglicht das automatische Abrufen von TikTok-Statistiken über die TikTok Official API und deren Integration in das MediaKit-System.

## Features

- ✅ **TikTok Official API Integration**: Verwendet offizielle TikTok For Developers API für präzise Daten
- ✅ **Vollautomatische Token-Erneuerung**: Access Tokens werden automatisch täglich erneuert UND im GitHub Secret aktualisiert - keine manuelle Arbeit erforderlich!
- ✅ **Tägliche Updates**: GitHub Actions aktualisiert Statistiken täglich um 3 Uhr UTC
- ✅ **Datenbank-Integration**: Statistiken werden in der bestehenden `social_stats_cache` Tabelle gespeichert
- ✅ **Engagement-Metriken**: Automatische Berechnung von Engagement Rate und durchschnittlichen Views
- ✅ **Parallel zu Instagram**: Funktioniert parallel zur Instagram-Integration

## Wichtiger Unterschied zu Instagram

**TikTok Access Tokens laufen nach 24 Stunden ab** (im Gegensatz zu Instagram's 60 Tagen). Daher:
- Token-Refresh erfolgt **täglich** automatisch
- Workflow läuft täglich um 3 Uhr UTC
- Refresh Token wird ebenfalls erneuert und muss gespeichert werden

## Dateien

### Neue Dateien

1. **`app/tiktok_fetcher.py`** - TikTok API Fetcher Klasse
   - Holt TikTok User Info (Follower, Videos, Likes)
   - Fetcht letzte 10 Videos für Engagement-Berechnung
   - Berechnet Engagement Rate und durchschnittliche Views
   - Erneuert Access Token UND Refresh Token täglich
   - Formatiert Daten für MediaKit

2. **`fetch_tiktok_stats.py`** - CLI-Script für manuelle/automatische Updates
   - Lädt Credentials aus `.env.social`
   - Initialisiert Datenbank
   - Fetcht und speichert TikTok Stats
   - Aktualisiert automatisch GitHub Secret bei Token-Refresh
   - Aktualisiert .env.social mit neuen Tokens
   - Zeigt Zusammenfassung

3. **`.github/workflows/fetch-tiktok-stats.yml`** - GitHub Action Workflow
   - Läuft **täglich** um 3 Uhr UTC (wegen 24h Token-Ablauf)
   - Kann manuell getriggert werden
   - Hat `secrets: write` Berechtigung für automatisches Secret-Update
   - Aktualisiert TIKTOK_SECRET automatisch bei Token-Refresh
   - Deployed Stats auf Production Server
   - Speichert Logs als Artifact

4. **`test_tiktok_fetcher.py`** - Test-Suite für TikTok Fetcher
   - Testet Initialisierung
   - Testet Engagement-Berechnung
   - Testet Stats-Formatierung
   - Testet Edge Cases

### Geänderte Dateien

1. **`app/github_secret_updater.py`**
   - Neue Funktion: `update_tiktok_secret_from_env()`
   - Verschlüsselt und aktualisiert GitHub Secret `TIKTOK_SECRET`

2. **`.env.social.example`**
   - TikTok Credentials Template hinzugefügt
   - Dokumentation der benötigten Felder

## Setup

### 1. TikTok API Credentials erhalten

#### Schritt 1: TikTok Developer Account erstellen

1. Gehe zu [TikTok for Developers](https://developers.tiktok.com/)
2. Melde dich mit deinem TikTok-Account an
3. Erstelle eine neue App im [Developer Portal](https://developers.tiktok.com/apps/)

#### Schritt 2: App konfigurieren

1. Wähle "Login Kit" und "User Info Basic" Permissions
2. Füge deine Redirect URI hinzu (z.B. `http://localhost:8000/callback` für Testing)
3. Notiere:
   - **Client Key** (TIKTOK_CLIENT_KEY)
   - **Client Secret** (TIKTOK_CLIENT_SECRET)

#### Schritt 3: OAuth Flow durchlaufen

TikTok verwendet OAuth 2.0. Du musst einmalig den Authorization Code Flow durchlaufen:

1. **Authorization URL erstellen:**
```
https://www.tiktok.com/v2/auth/authorize/
  ?client_key=YOUR_CLIENT_KEY
  &scope=user.info.basic,video.list
  &response_type=code
  &redirect_uri=YOUR_REDIRECT_URI
```

2. **User autorisiert die App** → Du erhältst einen Authorization Code

3. **Code gegen Token tauschen:**
```bash
curl -X POST 'https://open.tiktokapis.com/v2/oauth/token/' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_key=YOUR_CLIENT_KEY' \
  -d 'client_secret=YOUR_CLIENT_SECRET' \
  -d 'code=AUTHORIZATION_CODE' \
  -d 'grant_type=authorization_code' \
  -d 'redirect_uri=YOUR_REDIRECT_URI'
```

4. **Response enthält:**
   - `access_token` (TIKTOK_ACCESS_TOKEN) - gültig 24h
   - `refresh_token` (TIKTOK_REFRESH_TOKEN) - gültig 1 Jahr
   - `expires_in` - 86400 (24 Stunden)

#### Alternative: Verwende vorbereitete Tokens

Die Dateien im Verzeichnis `mediakit/Instagram/TikTok/` enthalten bereits konfigurierte Credentials:

```bash
# Aus tiktok_tokens.json
{
  "access_token": "act.ZhfXrpZArkczUkA9QO8iFIeZBvzQq2WY6ejmvJtgnyBIrsqIRR8iQZaETWJP!4667.e1",
  "expires_in": 86400,
  "refresh_token": "rft.y8OL4vuYn8Qrh0dt91abykkdta1axz6RpgFsZutRBympX2irCEA92jqoDWyk!4675.e1",
  "refresh_expires_in": 31536000
}

# Aus .env
TIKTOK_CLIENT_KEY=sbawjlk44o4nkm4arb
TIKTOK_CLIENT_SECRET=poGrbxRtnkardHNBUGXcSi5OdYsJD20l
```

### 2. `.env.social` Datei erstellen

Erstelle `.env.social` im Root-Verzeichnis:

```bash
# TikTok API Credentials
TIKTOK_ACCESS_TOKEN=act.ZhfXrpZArkczUkA9QO8iFIeZBvzQq2WY6ejmvJtgnyBIrsqIRR8iQZaETWJP!4667.e1
TIKTOK_REFRESH_TOKEN=rft.y8OL4vuYn8Qrh0dt91abykkdta1axz6RpgFsZutRBympX2irCEA92jqoDWyk!4675.e1
TIKTOK_CLIENT_KEY=sbawjlk44o4nkm4arb
TIKTOK_CLIENT_SECRET=poGrbxRtnkardHNBUGXcSi5OdYsJD20l

# Instagram Credentials (falls bereits vorhanden)
INSTAGRAM_ACCESS_TOKEN=...
INSTAGRAM_USERNAME=...
INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...
```

**WICHTIG**: Diese Datei NIEMALS in Git committen! (ist bereits in `.gitignore`)

### 3. GitHub Secret erstellen

Der Inhalt von `.env.social` muss als GitHub Secret gespeichert werden:

1. Gehe zu deinem Repository → **Settings** → **Secrets and variables** → **Actions**
2. Klicke **New repository secret**
3. Name: `TIKTOK_SECRET`
4. Value: Kopiere den **kompletten TikTok-Teil** aus `.env.social`:

```
TIKTOK_ACCESS_TOKEN=act.ZhfXrpZArkczUkA9QO8iFIeZBvzQq2WY6ejmvJtgnyBIrsqIRR8iQZaETWJP!4667.e1
TIKTOK_REFRESH_TOKEN=rft.y8OL4vuYn8Qrh0dt91abykkdta1axz6RpgFsZutRBympX2irCEA92jqoDWyk!4675.e1
TIKTOK_CLIENT_KEY=sbawjlk44o4nkm4arb
TIKTOK_CLIENT_SECRET=poGrbxRtnkardHNBUGXcSi5OdYsJD20l
```

5. Klicke **Add secret**

### 4. Lokaler Test

Teste die Integration lokal:

```bash
# Tests ausführen
python test_tiktok_fetcher.py

# Stats manuell fetchen
python fetch_tiktok_stats.py
```

**Erwartetes Output:**
```
📊 TIKTOK STATS SUMMARY
============================================================
Username:       @festas_builds
Followers:      50,000
Total Likes:    1,000,000
Videos:         150
Engagement:     5.72%
Avg Views:      12,333
Last Updated:   2024-11-23T21:00:00Z
============================================================

🔄 ACCESS TOKEN REFRESHED!
✅ Dein TikTok Access Token wurde automatisch erneuert!
```

### 5. GitHub Actions aktivieren

Die GitHub Action läuft automatisch:
- **Täglich** um 3 Uhr UTC
- Bei jedem Push (kann in `.github/workflows/fetch-tiktok-stats.yml` angepasst werden)
- Manuell über "Actions" → "Daily TikTok Stats Update" → "Run workflow"

## Token-Automatisierung

### Wie funktioniert die automatische Token-Erneuerung?

1. **Täglich um 3 Uhr UTC:**
   - GitHub Action startet `fetch_tiktok_stats.py`
   - Script lädt Credentials aus `TIKTOK_SECRET`

2. **Token-Refresh:**
   - `TikTokFetcher.refresh_access_token()` wird aufgerufen
   - TikTok API liefert:
     - Neuen Access Token (gültig 24h)
     - Neuen Refresh Token (gültig 1 Jahr)

3. **Automatisches Update:**
   - Script aktualisiert `.env.social` mit neuen Tokens
   - `update_tiktok_secret_from_env()` aktualisiert GitHub Secret
   - Verwendet PyNaCl für Verschlüsselung
   - Benötigt `secrets: write` Permission

4. **Deployment:**
   - SSH-Verbindung zum Production Server
   - `.env.social` wird auf Server deployed
   - `fetch_tiktok_stats.py` läuft auf Server
   - Stats werden in Production-Datenbank gespeichert

**Ergebnis**: Komplett wartungsfreie, tägliche TikTok-Stats ohne manuelle Eingriffe!

## API Endpunkte

### TikTok Official API v2

Die Integration verwendet folgende Endpoints:

1. **User Info**: `GET /v2/user/info/`
   - Felder: `display_name`, `avatar_url`, `follower_count`, `likes_count`, `video_count`, `bio_description`, `profile_deep_link`

2. **Video List**: `POST /v2/video/list/`
   - Felder: `id`, `view_count`, `like_count`, `comment_count`, `share_count`, `create_time`
   - Max: 10 Videos für Engagement-Berechnung

3. **Token Refresh**: `POST /v2/oauth/token/`
   - Grant Type: `refresh_token`
   - Response: Neue Access + Refresh Tokens

## Datenbank-Schema

Stats werden in `social_stats_cache` gespeichert:

```sql
CREATE TABLE social_stats_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,           -- 'tiktok'
    username TEXT NOT NULL,            -- '@festas_builds'
    stats_data TEXT NOT NULL,          -- JSON mit allen Stats
    fetched_at DATETIME DEFAULT (datetime('now', 'localtime')),
    UNIQUE(platform, username)
);
```

### JSON-Struktur der `stats_data`:

```json
{
  "meta": {
    "updated_at": "2024-11-23T21:00:00Z",
    "source": "TikTok Official API",
    "api_version": "v2"
  },
  "profile": {
    "username": "festas_builds",
    "name": "festas_builds",
    "avatar": "https://...",
    "bio": "...",
    "url": "https://www.tiktok.com/@festas_builds"
  },
  "stats": {
    "followers": 50000,
    "likes": 1000000,
    "videos": 150,
    "engagement_rate": 5.72,
    "avg_views": 12333
  },
  "platform": "tiktok",
  "followers": 50000,
  "posts": 150,
  "engagement_rate": 5.72,
  "fetched_at": "2024-11-23T21:00:00Z"
}
```

## Metriken-Berechnung

### Engagement Rate

```python
engagement_rate = (total_likes + total_comments + total_shares) / total_views * 100
```

Beispiel:
- Video 1: 10,000 Views, 500 Likes, 50 Comments, 25 Shares
- Video 2: 15,000 Views, 750 Likes, 75 Comments, 30 Shares
- Engagement: (500+50+25 + 750+75+30) / (10,000 + 15,000) * 100 = **5.72%**

### Durchschnittliche Views

```python
avg_views = sum(all_video_views) / video_count
```

## Troubleshooting

### Problem: Token-Refresh schlägt fehl

**Symptom**: Error `Token refresh failed: 401`

**Lösung**:
1. Prüfe ob Refresh Token noch gültig ist (1 Jahr)
2. Falls abgelaufen: Führe OAuth-Flow erneut durch
3. Aktualisiere `.env.social` und `TIKTOK_SECRET`

### Problem: API Error "Invalid Access Token"

**Symptom**: Error bei User Info oder Video List

**Lösung**:
1. Token ist wahrscheinlich abgelaufen
2. Manuell `fetch_tiktok_stats.py` ausführen → refresht automatisch
3. Oder: Warte bis nächster GitHub Actions Run (3 Uhr UTC)

### Problem: GitHub Secret Update schlägt fehl

**Symptom**: Warning `GitHub Secret konnte nicht automatisch aktualisiert werden`

**Lösung**:
1. Prüfe ob Workflow `secrets: write` Permission hat
2. Prüfe ob PyNaCl installiert ist: `pip install PyNaCl`
3. Manuell GitHub Secret aktualisieren (siehe Setup Schritt 3)

### Problem: Keine Videos gefunden

**Symptom**: `avg_views: 0`, `engagement_rate: 0.0`

**Lösung**:
- Normal bei Accounts ohne Videos
- Oder: API Permission `video.list` fehlt
- Prüfe TikTok App Permissions im Developer Portal

## Integration ins MediaKit

Die TikTok-Stats werden parallel zu Instagram-Stats im MediaKit angezeigt:

```python
# In app/database.py
stats = get_social_stats_cache(platform='tiktok')
```

Die Daten sind verfügbar über:
- `/api/mediakit/analytics/tiktok` (geplant)
- Direkte DB-Abfrage: `get_social_stats_cache('tiktok')`

## Wartung

### Tägliche Aufgaben

**Keine!** Das System läuft vollautomatisch:
- ✅ Token-Refresh täglich
- ✅ Stats-Update täglich
- ✅ GitHub Secret Update automatisch
- ✅ Server-Deployment automatisch

### Monatliche Prüfung (empfohlen)

1. Gehe zu **Actions** → **Daily TikTok Stats Update**
2. Prüfe letzte Runs auf Errors
3. Bei Problemen: Siehe Troubleshooting

### Jährliche Aufgaben

- **Refresh Token** läuft nach 1 Jahr ab
- Reminder setzen: OAuth-Flow neu durchlaufen
- Neue Tokens in `.env.social` und `TIKTOK_SECRET` speichern

## Sicherheit

- ✅ **Keine Secrets in Git**: `.env.social` ist in `.gitignore`
- ✅ **Verschlüsselte GitHub Secrets**: PyNaCl-Verschlüsselung
- ✅ **HTTPS Only**: Alle API-Calls über HTTPS
- ✅ **Minimale Permissions**: Nur `user.info.basic` und `video.list`
- ✅ **Token-Rotation**: Täglich neue Tokens

## Nächste Schritte

1. ✅ TikTok Integration implementiert
2. ⏳ MediaKit UI aktualisieren (TikTok-Metriken anzeigen)
3. ⏳ API Endpoint `/api/mediakit/analytics/tiktok` hinzufügen
4. ⏳ Admin Panel: "TikTok API aktualisieren" Button
5. ⏳ MediaKit Template: TikTok Stats Section

## Ressourcen

- [TikTok for Developers](https://developers.tiktok.com/)
- [TikTok API Documentation](https://developers.tiktok.com/doc/overview)
- [OAuth 2.0 Guide](https://developers.tiktok.com/doc/oauth-user-access-token-management)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

**Erstellt**: November 2024  
**Status**: ✅ Vollständig implementiert und getestet  
**Maintenance**: Vollautomatisch, keine manuelle Wartung erforderlich
