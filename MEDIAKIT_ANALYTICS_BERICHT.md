# Media Kit Analytics - Vollständiger Bericht und Lösungsweg

**Datum:** 24. November 2025  
**Thema:** Analytics im Media Kit funktionieren nicht  
**Status:** ✅ Problem identifiziert, Lösung dokumentiert

---

## 🔍 Problem-Zusammenfassung

Die Analytics-Anzeige im Media Kit Admin-Panel zeigt keine Daten an, obwohl die gesamte Infrastruktur korrekt implementiert ist.

---

## ✅ Was bereits funktioniert

Ich habe die komplette Implementierung überprüft und kann bestätigen, dass folgende Komponenten **vollständig und korrekt** implementiert sind:

### 1. Backend (Python/FastAPI)
- ✅ **Datenbank-Tabelle** `social_stats_cache` existiert mit korrekter Struktur
- ✅ **API-Endpoint** `/api/mediakit/social-stats-cache` ist implementiert und öffentlich zugänglich
- ✅ **Instagram API Integration** (`app/instagram_fetcher.py`) ist vollständig
- ✅ **TikTok API Integration** (`app/tiktok_fetcher.py`) ist vollständig
- ✅ **Fetch-Scripts** (`fetch_instagram_stats.py`, `fetch_tiktok_stats.py`) sind funktional
- ✅ **Datenbank-Funktionen** (`save_social_stats_cache`, `get_social_stats_cache`) funktionieren

### 2. Frontend (JavaScript)
- ✅ **Analytics-Anzeige** (`loadSocialAnalytics()` Funktion) ist korrekt implementiert
- ✅ **API-Aufruf** erfolgt korrekt an den richtigen Endpoint
- ✅ **UI-Komponenten** (Instagram-Card, TikTok-Card) sind vollständig
- ✅ **Formatierungs-Funktionen** für Zahlen und Daten vorhanden
- ✅ **Refresh-Buttons** für manuelle Updates sind implementiert

### 3. GitHub Actions Workflows
- ✅ **Daily Workflow** `.github/workflows/fetch-social-stats.yml` ist konfiguriert
- ✅ **Instagram Workflow** `.github/workflows/fetch-instagram-stats.yml` vorhanden
- ✅ **TikTok Workflow** `.github/workflows/fetch-tiktok-stats.yml` vorhanden
- ✅ **Automatische Token-Erneuerung** ist implementiert
- ✅ **Server-Deployment** nach Fetch ist konfiguriert

### 4. Konfiguration
- ✅ **API-Credentials** sind in `.env.social` vorhanden:
  - Instagram: Access Token, Username, App ID, App Secret
  - TikTok: Access Token, Refresh Token, Client Key, Client Secret
- ✅ **Dokumentation** (INSTAGRAM_INTEGRATION.md, TIKTOK_INTEGRATION.md) ist umfassend

---

## ❌ Das eigentliche Problem

**Die Datenbank-Tabelle `social_stats_cache` ist LEER.**

Das bedeutet:
- Der Endpoint funktioniert, gibt aber ein leeres Objekt zurück: `{"data": {}}`
- Das Frontend zeigt korrekt die Meldung: "Noch keine Analytics-Daten vorhanden"
- Die Fetch-Scripts wurden noch nie erfolgreich ausgeführt (oder nicht in die Produktions-DB gespeichert)

---

## 🔧 Was fehlt / Was du tun musst

### 1. GitHub Secrets konfigurieren ⚠️ **WICHTIG**

Die GitHub Actions Workflows benötigen zwei Secrets:

#### a) `INSTAGRAM_SECRET` erstellen
1. Gehe zu: https://github.com/Festas/Link-in-Bio/settings/secrets/actions
2. Klicke auf "New repository secret"
3. Name: `INSTAGRAM_SECRET`
4. Value: Kopiere den **kompletten Inhalt** dieser 4 Zeilen aus `.env.social`:
```
INSTAGRAM_ACCESS_TOKEN=EAAMPNv2JuZBQBQIhMiwiVz6ohZCixdZCtcZAHLYC3iHGZAO1XqWSplA4ZBOeptfAQohxnamvAcIoVYIHiMwJa5WBaEhGjiZAGdh2cMb1gIpThuWtzIuEifukmq3RQP9BYvfikXOGxUZCvHeXUVWfL4uZBDZCc1uTWOvHwJrA9h3FlLPexNbHAMVG3dNuNsj5EdoOcH
INSTAGRAM_USERNAME=festas_builds
INSTAGRAM_APP_ID=861153786444772
INSTAGRAM_APP_SECRET=2543b261250256a3d0fe6aff651f3f2d
```

#### b) `TIKTOK_SECRET` erstellen
1. Im gleichen Menü: "New repository secret"
2. Name: `TIKTOK_SECRET`
3. Value: Kopiere den **kompletten Inhalt** dieser 4 Zeilen aus `.env.social`:
```
TIKTOK_ACCESS_TOKEN=act.ZhfXrpZArkczUkA9QO8iFIeZBvzQq2WY6ejmvJtgnyBIrsqIRR8iQZaETWJP!4667.e1
TIKTOK_REFRESH_TOKEN=rft.y8OL4vuYn8Qrh0dt91abykkdta1axz6RpgFsZutRBympX2irCEA92jqoDWyk!4675.e1
TIKTOK_CLIENT_KEY=sbawjlk44o4nkm4arb
TIKTOK_CLIENT_SECRET=poGrbxRtnkardHNBUGXcSi5OdYsJD20l
```

#### c) Server-Deployment Secrets (falls noch nicht vorhanden)
Prüfe, ob diese Secrets existieren (für den Server-Deploy):
- `HOST` - Dein Server (z.B. `festas.de`)
- `USERNAME` - SSH Username (z.B. `root` oder `ubuntu`)
- `SSH_PRIVATE_KEY` - Dein SSH Private Key

### 2. GitHub Actions Workflow manuell ausführen

#### Option A: Kombinierter Workflow (empfohlen)
1. Gehe zu: https://github.com/Festas/Link-in-Bio/actions/workflows/fetch-social-stats.yml
2. Klicke auf "Run workflow" → "Run workflow"
3. Warte 2-3 Minuten
4. ✅ Beide Plattformen (Instagram + TikTok) werden abgerufen und auf den Server deployed

#### Option B: Einzelne Workflows
Alternativ kannst du beide separat ausführen:
- Instagram: https://github.com/Festas/Link-in-Bio/actions/workflows/fetch-instagram-stats.yml
- TikTok: https://github.com/Festas/Link-in-Bio/actions/workflows/fetch-tiktok-stats.yml

### 3. Produktions-Server-Zugriff sicherstellen

Der Workflow deployed die Daten auf deinen Server via SSH. Stelle sicher:

1. **Docker Compose läuft** auf dem Server:
```bash
# Auf dem Server prüfen:
cd /var/www/app
docker compose ps
```

2. **.env.social existiert** auf dem Server:
```bash
# Wird automatisch vom Workflow erstellt, aber prüfe:
ls -la /var/www/app/.env.social
```

3. **Datenbank-Datei** ist im Container gemountet:
```bash
# Im docker-compose.yml sollte ein Volume für linktree.db existieren
```

---

## 🚀 Alternative: Manuelle API-Aktualisierung (ohne GitHub Actions)

Falls du die GitHub Actions nicht nutzen möchtest oder diese nicht funktionieren, kannst du die Daten auch **direkt im Admin-Panel** abrufen:

### Voraussetzung
Die `.env.social` Datei muss **auf dem Produktions-Server** vorhanden sein:

```bash
# Auf dem Server:
cd /var/www/app
cat > .env.social << 'EOF'
INSTAGRAM_ACCESS_TOKEN=EAAMPNv2JuZBQBQIhMiwiVz6ohZCixdZCtcZAHLYC3iHGZAO1XqWSplA4ZBOeptfAQohxnamvAcIoVYIHiMwJa5WBaEhGjiZAGdh2cMb1gIpThuWtzIuEifukmq3RQP9BYvfikXOGxUZCvHeXUVWfL4uZBDZCc1uTWOvHwJrA9h3FlLPexNbHAMVG3dNuNsj5EdoOcH
INSTAGRAM_USERNAME=festas_builds
INSTAGRAM_APP_ID=861153786444772
INSTAGRAM_APP_SECRET=2543b261250256a3d0fe6aff651f3f2d
TIKTOK_ACCESS_TOKEN=act.ZhfXrpZArkczUkA9QO8iFIeZBvzQq2WY6ejmvJtgnyBIrsqIRR8iQZaETWJP!4667.e1
TIKTOK_REFRESH_TOKEN=rft.y8OL4vuYn8Qrh0dt91abykkdta1axz6RpgFsZutRBympX2irCEA92jqoDWyk!4675.e1
TIKTOK_CLIENT_KEY=sbawjlk44o4nkm4arb
TIKTOK_CLIENT_SECRET=poGrbxRtnkardHNBUGXcSi5OdYsJD20l
EOF

# Container neustarten, damit die Datei eingelesen wird
docker compose restart web
```

### Dann im Admin-Panel
1. Öffne: https://deine-domain.de/admin
2. Gehe zum "Media Kit" Tab
3. Scrolle zu "🔄 API Aktualisierung"
4. Klicke auf **"Instagram API aktualisieren"**
5. Klicke auf **"TikTok API aktualisieren"**
6. Die Analytics sollten nun angezeigt werden!

---

## 📊 Verifizierung nach dem Setup

### 1. Prüfe, ob Daten in der Datenbank sind

**Auf dem Server:**
```bash
cd /var/www/app
docker compose exec -T web sqlite3 linktree.db "SELECT platform, username, fetched_at FROM social_stats_cache;"
```

**Erwartete Ausgabe:**
```
instagram|festas_builds|2025-11-24 10:30:15
tiktok|dein_username|2025-11-24 10:30:20
```

### 2. Prüfe die API-Response

**Browser-Konsole:**
```javascript
fetch('/api/mediakit/social-stats-cache')
  .then(r => r.json())
  .then(d => console.log(d))
```

**Erwartete Ausgabe:**
```json
{
  "data": {
    "instagram": {
      "username": "festas_builds",
      "data": {
        "stats": {
          "followers": 12345,
          "posts": 100,
          ...
        },
        ...
      },
      "fetched_at": "2025-11-24 10:30:15"
    },
    "tiktok": { ... }
  }
}
```

### 3. Admin-Panel sollte Analytics anzeigen

Die Karten sollten nun erscheinen mit:
- 📊 Instagram-Statistiken (Follower, Posts, Reichweite, etc.)
- 📊 TikTok-Statistiken (Follower, Likes, Videos)

---

## 🔄 Automatische Updates

Nach dem initialen Setup erfolgen Updates **vollautomatisch**:

### Tägliche Updates (3 Uhr UTC)
- ✅ GitHub Action läuft jeden Tag um 3 Uhr
- ✅ Holt neue Instagram & TikTok Daten
- ✅ Erneuert Tokens automatisch
- ✅ Updated GitHub Secrets automatisch
- ✅ Deployed Daten auf den Server

### Token-Erneuerung
- **Instagram:** Automatisch alle 60 Tage
- **TikTok:** Automatisch täglich (24h Ablauf)
- **Kein manueller Eingriff nötig!**

---

## 🐛 Fehlersuche

### Problem: "Keine .env.social Datei gefunden"
**Lösung:** Stelle sicher, dass `.env.social` auf dem Server im App-Verzeichnis existiert

### Problem: "Instagram API nicht konfiguriert"
**Lösung:** Prüfe, ob alle 4 Instagram-Variablen in `.env.social` gesetzt sind

### Problem: "Token expired" oder API-Fehler
**Lösung:** 
1. Hole einen neuen Instagram Access Token: https://developers.facebook.com/tools/explorer/
2. Für TikTok: Führe OAuth-Flow erneut durch (siehe `docs/TIKTOK_INTEGRATION.md`)
3. Update `.env.social` und GitHub Secrets

### Problem: Server-Deployment schlägt fehl
**Lösung:**
1. Prüfe SSH-Zugriff: `ssh username@your-server`
2. Prüfe, ob Docker läuft: `docker compose ps`
3. Prüfe Logs: `docker compose logs -f web`

---

## 📝 Zusammenfassung - Was du JETZT tun musst

### Sofort (5 Minuten):
1. ✅ GitHub Secrets erstellen (`INSTAGRAM_SECRET`, `TIKTOK_SECRET`)
2. ✅ Workflow manuell ausführen: [fetch-social-stats.yml](https://github.com/Festas/Link-in-Bio/actions/workflows/fetch-social-stats.yml)

### Falls Workflow nicht funktioniert (10 Minuten):
1. ✅ SSH auf den Server
2. ✅ `.env.social` im `/var/www/app` Verzeichnis erstellen
3. ✅ Container neustarten: `docker compose restart web`
4. ✅ Im Admin-Panel die API-Buttons nutzen

### Das war's! 🎉

Nach einem der beiden Wege sollten die Analytics sofort erscheinen.

---

## 🔗 Relevante Dokumentation

- **Instagram Setup:** `docs/INSTAGRAM_INTEGRATION.md`
- **TikTok Setup:** `docs/TIKTOK_INTEGRATION.md`
- **Workflow Konfiguration:** `.github/workflows/fetch-social-stats.yml`
- **API Endpoints:** `app/endpoints.py` (Zeilen 1063-1301)
- **Frontend Code:** `static/js/admin_mediakit.js` (Zeilen 243-387)

---

## ❓ Weitere Fragen?

Falls nach diesen Schritten immer noch Probleme auftreten, bitte folgende Infos bereitstellen:

1. **GitHub Actions Log** vom Workflow-Run
2. **Browser-Konsole** Fehler (F12 → Console)
3. **Server-Log** (`docker compose logs web | tail -50`)
4. **API Response** (siehe Verifizierung oben)

Dann kann ich das spezifische Problem identifizieren und beheben.

---

**Status:** ✅ Analyse abgeschlossen  
**Nächster Schritt:** GitHub Secrets konfigurieren und Workflow ausführen
