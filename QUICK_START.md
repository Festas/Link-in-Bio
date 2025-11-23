# Instagram MediaKit Integration - Quick Start Guide

## 🎯 Was wurde implementiert?

Du hast jetzt eine **vollautomatische Instagram-Integration** für dein MediaKit:

- ✅ **Meta Graph API**: Offizielle Instagram Business API (keine Scraper!)
- ✅ **Täglich automatisch**: GitHub Actions holt jeden Tag um 3 Uhr neue Stats
- ✅ **Token erneuert sich selbst**: Alle ~30 Tage automatisch
- ✅ **Admin-Panel Button**: Sofortige manuelle Updates möglich

---

## 🚀 Setup in 3 Schritten

### Schritt 1: GitHub Secret erstellen

1. Öffne den Inhalt dieser Datei im Repository: `.env.social`
2. **Kopiere den kompletten Inhalt** (alle 4 Zeilen)
3. Gehe zu: **Repository → Settings → Secrets and variables → Actions**
4. Klicke: **"New repository secret"**
5. Name: `INSTAGRAM_SECRET`
6. Value: **Paste den kopierten Inhalt**
7. Klicke: **"Add secret"**

### Schritt 2: Auf Server kopieren

SSH auf deinen Server und erstelle die `.env.social` Datei:

```bash
cd /var/www/app
nano .env.social
```

Paste den Inhalt (die 4 Zeilen) und speichere (Ctrl+X, Y, Enter).

### Schritt 3: Fertig! 🎉

Ab jetzt:
- **Täglich 3 Uhr**: GitHub Action aktualisiert automatisch die Instagram-Statistiken
- **Jederzeit**: Du kannst im Admin-Panel → Media Kit → "Instagram API aktualisieren" klicken

---

## 🔄 Token-Erneuerung (alle ~30 Tage)

Wenn der Token erneuert wird:

1. Du siehst eine **gelbe Warnung** im Admin-Panel
2. Der neue Token wird in den **GitHub Actions Logs** angezeigt
3. **Aktualisiere das GitHub Secret** `INSTAGRAM_SECRET` mit dem neuen Token

Das war's!

---

## 📊 Welche Daten werden geholt?

| Metrik | Beschreibung |
|--------|--------------|
| **Followers** | Anzahl deiner Follower |
| **Posts** | Anzahl deiner Posts |
| **Daily Reach** | Wie viele Accounts du täglich erreichst |
| **Daily Impressions** | Wie oft dein Content täglich angezeigt wird |
| **Profile Views** | Wie oft dein Profil angeschaut wird |

Alle Daten kommen direkt von Instagram's offizieller API!

---

## 🎮 Nutzung

### Automatisch (empfohlen)
Mach nichts - die GitHub Action läuft täglich automatisch!

### Manuell
1. Gehe ins **Admin-Panel**
2. Klicke auf **"Media Kit"** Tab
3. Scrolle zu "Social Media Integration"
4. Klicke **"Instagram API aktualisieren"**
5. Warte auf ✓ Erfolgsmeldung

---

## 🔍 Monitoring

### GitHub Actions überprüfen
1. Gehe zu: **Repository → Actions**
2. Wähle: **"Daily Instagram Stats Update"**
3. Siehst du alle täglichen Runs + Status

### Logs anschauen
```bash
# Auf dem Server
docker compose logs -f web | grep instagram
```

---

## 🆘 Troubleshooting

### "Token refresh failed"
➜ Prüfe in `.env.social`:
- `INSTAGRAM_APP_ID` korrekt?
- `INSTAGRAM_APP_SECRET` korrekt?

### "Keine Daten"
➜ Stelle sicher:
- Instagram Account ist **Business Account**
- Account ist mit deiner Meta App verbunden
- Token ist noch gültig (nicht älter als 60 Tage)

### GitHub Action schlägt fehl
➜ Prüfe:
- Secret `INSTAGRAM_SECRET` existiert
- Inhalt ist korrekt (alle 4 Zeilen)
- Schaue in Action Logs für Details

---

## 🔜 Nächste Schritte (optional)

### TikTok hinzufügen
Die Struktur ist bereits vorbereitet! Du kannst später genauso TikTok integrieren:

1. Hole TikTok API Credentials
2. Füge sie in `.env.social` hinzu
3. Erstelle `app/tiktok_fetcher.py` (ähnlich wie Instagram)
4. Update `fetch_instagram_stats.py` → `fetch_social_stats.py`
5. Fertig!

---

## 📖 Weitere Dokumentation

- **Vollständige Doku**: `docs/INSTAGRAM_INTEGRATION.md`
- **Verifikationsreport**: `VERIFICATION_REPORT.md`
- **API-Endpoints**: Siehe Doku Sektion "API Endpoints"

---

## ✅ Checkliste für Go-Live

- [ ] GitHub Secret `INSTAGRAM_SECRET` erstellt
- [ ] `.env.social` auf Server kopiert
- [ ] Erste manuelle Aktualisierung im Admin-Panel getestet
- [ ] GitHub Action einmal manuell getriggert
- [ ] MediaKit angeschaut - Stats werden angezeigt

**Danach**: Entspannen und die täglichen Auto-Updates genießen! 🎉

---

**Fragen?** Schaue in die vollständige Dokumentation: `docs/INSTAGRAM_INTEGRATION.md`
