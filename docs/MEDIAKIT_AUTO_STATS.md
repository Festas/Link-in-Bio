# Media Kit Auto-Stats Feature

## 🎯 Übersicht

Das Media Kit wurde komplett überarbeitet und bietet jetzt **automatische Synchronisation** deiner Social Media Statistiken - ähnlich wie bei Beacons.ai. Deine Follower-Zahlen werden direkt von Instagram, TikTok und anderen Plattformen abgerufen.

## ✨ Features

### 1. **Automatische Daten-Synchronisation**
- 📊 Automatisches Abrufen von Follower-Zahlen
- 🔄 Einfache Aktualisierung per Knopfdruck
- 💾 Intelligentes Caching zur Performance-Optimierung
- ⏱️ Zeitstempel für letzte Aktualisierung

### 2. **Unterstützte Plattformen**
- **Instagram**: Follower, Following, Posts
- **TikTok**: Follower, Likes, Videos
- **YouTube**: In Vorbereitung

### 3. **Optimiertes Design**
- 🎨 Professionelles, verkaufsförderndes Layout
- 💼 "Why Work With Me?" Sektion mit Value Propositions
- 🏆 Trust Badges (Auto-Updated Stats, Verified Data)
- 🚀 Verbesserte Call-to-Actions
- 📱 Vollständig responsive für alle Geräte

## 🚀 Schnellstart

### Schritt 1: Social Media Handles eingeben

1. Gehe zum **Admin Panel** → Tab **"Media Kit"**
2. Scrolle zu **"Social Media Accounts"**
3. Gib deine Handles ein:
   - Instagram: `@dein_handle` oder `dein_handle`
   - TikTok: `@dein_handle` oder `dein_handle`

### Schritt 2: Daten speichern

Klicke auf **"Alle Änderungen speichern"** um die Handles zu speichern.

### Schritt 3: Stats aktualisieren

Klicke auf den Button **"Social Stats aktualisieren"** (neben der Überschrift). 

Das System wird:
- ✅ Deine Profile besuchen
- ✅ Aktuelle Follower-Zahlen abrufen
- ✅ Daten im Cache speichern
- ✅ Media Kit automatisch aktualisieren

### Schritt 4: Ergebnis anschauen

Klicke auf **"Media Kit ansehen"** um dein aktualisiertes Media Kit zu sehen!

## 📊 Verfügbare Daten

### Instagram
- **Follower** - Anzahl der Follower
- **Following** - Anzahl der gefolgten Accounts
- **Posts** - Gesamtzahl der Posts
- **Verified Status** - Verifizierungsstatus

### TikTok
- **Follower** - Anzahl der Follower
- **Following** - Anzahl der gefolgten Accounts
- **Likes** - Gesamtzahl aller Likes
- **Videos** - Anzahl der Videos

## 🔧 Technische Details

### Wie funktioniert es?

1. **Scraping Service** (`app/social_stats.py`)
   - Ruft öffentliche Profildaten ab
   - Keine API-Keys erforderlich
   - Funktioniert mit öffentlichen Profilen

2. **Caching** (`social_stats_cache` Tabelle)
   - Speichert abgerufene Daten
   - Verhindert zu häufige Anfragen
   - Verbessert Performance

3. **API Endpoints**
   - `POST /api/mediakit/refresh-social-stats` - Stats aktualisieren
   - `GET /api/mediakit/social-stats-cache` - Gecachte Daten abrufen

### Datenbank-Schema

```sql
CREATE TABLE social_stats_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    username TEXT NOT NULL,
    stats_data TEXT NOT NULL,
    fetched_at DATETIME DEFAULT (datetime('now', 'localtime')),
    UNIQUE(platform, username)
);
```

## 💡 Best Practices

### Wann solltest du die Stats aktualisieren?

- **Wöchentlich**: Für regelmäßige Updates
- **Nach Kampagnen**: Um neue Follower-Zahlen zu zeigen
- **Vor Kooperationsgesprächen**: Um aktuelle Daten zu präsentieren

### Tipps für bessere Ergebnisse

1. **Public Profile**: Stelle sicher, dass deine Profile öffentlich sind
2. **Korrekte Handles**: Verwende exakt deinen Username (ohne Sonderzeichen)
3. **Geduld**: Der erste Abruf kann 10-30 Sekunden dauern
4. **Cache**: Die Daten werden gespeichert, spätere Aufrufe sind schneller

## 🔒 Datenschutz & Sicherheit

- ✅ Es werden nur **öffentliche** Daten abgerufen
- ✅ Keine Passwörter oder Login-Daten erforderlich
- ✅ Keine persönlichen Informationen gespeichert
- ✅ Daten werden lokal in deiner Datenbank gespeichert

## 🐛 Troubleshooting

### "Keine Daten gefunden"
**Lösung**: 
- Überprüfe, ob dein Profil öffentlich ist
- Stelle sicher, dass der Username korrekt ist (ohne @ am Anfang)
- Versuche es in ein paar Minuten erneut

### "Network Error"
**Lösung**:
- Überprüfe deine Internetverbindung
- Instagram/TikTok könnten temporär nicht erreichbar sein
- Firewall-Einstellungen prüfen

### "Rate Limit"
**Lösung**:
- Warte 15-30 Minuten
- Die Plattformen limitieren zu häufige Anfragen
- Nutze die gecachten Daten

## 📈 Nächste Schritte

### Geplante Features
- [ ] Engagement Rate Berechnung
- [ ] TikTok Video Performance
- [ ] YouTube Channel Stats
- [ ] Automatische wöchentliche Updates
- [ ] Export als PDF
- [ ] Vergleich mit vorherigen Monaten

## 🤝 Support

Bei Fragen oder Problemen:
1. Prüfe diese Dokumentation
2. Schaue in die Logs (Console im Browser)
3. Erstelle ein Issue auf GitHub

## 📝 Changelog

### Version 2.0.0 (November 2024)
- ✨ Automatische Social Media Stats
- 🎨 Komplettes Media Kit Redesign
- 🚀 Verkaufsoptimiertes Layout
- 📊 Live-Daten von Instagram & TikTok
- 💾 Intelligentes Caching-System
- 🔄 One-Click Update Button

---

**Viel Erfolg mit deinem neuen automatisierten Media Kit! 🚀**
