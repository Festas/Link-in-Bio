# Quick Start Guide - Social Media Data Integration

## 🎯 Was wurde implementiert?

Dein Media Kit zeigt jetzt **echte Daten** von deinen Social Media Profilen statt manuell eingegebene Zahlen.

## 🚀 Wie benutzt du es?

### Schritt 1: Social Handles im Profil-Tab eintragen

1. Gehe zum **Admin Panel** → **Profil-Tab**
2. Trage deine Social Media Handles ein:
   - Instagram: `festas_builds` (ohne @)
   - TikTok: `festas_builds` (ohne @)
   - YouTube: Dein Kanal-Name
   - Twitch: Dein Nutzername
   - X (Twitter): Dein Handle
3. Klicke auf **Speichern**

### Schritt 2: Daten synchronisieren

1. Gehe zum **Media Kit-Tab** im Admin Panel
2. Klicke auf **"Social Stats aktualisieren"**
3. Warte 10-30 Sekunden
4. Fertig! ✅

### Schritt 3: Ergebnis anschauen

1. Öffne dein Media Kit: `/mediakit`
2. Du siehst jetzt:
   - **Follower Summary**: Zeigt alle Plattformen mit 1000+ Followern
   - **Platform Analytics**: Wähle eine Plattform für Details

## 📊 Was wird angezeigt?

### Follower Summary Box (NEU)
```
┌────────────────────────────────────┐
│  Verified Follower Summary         │
│  🟢 Live Data                      │
├────────────────────────────────────┤
│                                    │
│        170.5k                      │
│   Total Followers                  │
│                                    │
├────────────────────────────────────┤
│  📸 Instagram    104.7k Followers  │
│  🎵 TikTok        65.8k Followers  │
└────────────────────────────────────┘
```
**Hinweis:** Nur Plattformen mit **1000+ Followern** werden hier angezeigt!

### Analytics Selector Box (NEU)
```
┌────────────────────────────────────┐
│  Platform Analytics                │
├────────────────────────────────────┤
│  [Instagram] [TikTok] [YouTube]    │  ← Buttons zum Wählen
├────────────────────────────────────┤
│  Instagram Analytics               │
│                                    │
│  104,700 Followers                 │
│  523 Following                     │
│  342 Posts                         │
│  ✓ Verified                        │
│                                    │
│  Last updated: 15.01.2024 10:30   │
└────────────────────────────────────┘
```

## 🔄 Datenfluss

```
Profil-Tab
    ↓
  Handles gespeichert
    ↓
Media Kit Tab → "Social Stats aktualisieren" klicken
    ↓
  System holt echte Daten von Instagram, TikTok, etc.
    ↓
  Daten werden gecacht (schneller Zugriff)
    ↓
Media Kit zeigt echte Zahlen
```

## ⚡ Wichtige Punkte

### ✅ Was funktioniert automatisch:
- Follower-Zahlen werden von deinen Profilen geholt
- Posts, Likes, Videos werden gezählt
- Nur Plattformen mit 1000+ Followern werden im Summary gezeigt
- Analytics sind plattform-spezifisch (Instagram ≠ TikTok)

### ⚠️ Was du wissen solltest:
- **Daten kommen vom Profil-Tab**, nicht vom Media Kit-Tab
- **1000+ Follower Filter** bedeutet: Kleine Accounts werden nicht im Summary gezeigt
- **Du musst manuell synchronisieren** (Empfehlung: einmal pro Woche)
- **Profile müssen öffentlich sein** (sonst können keine Daten geholt werden)

### 🔒 Sicherheit:
- Keine Login-Daten nötig
- Nur öffentliche Daten werden geholt
- Daten werden lokal gecacht
- Keine Third-Party Services

## 🛠️ Fehlerbehebung

### Problem: "Keine Social Media Handles konfiguriert"
**Lösung:** Gehe zum Profil-Tab und trage deine Handles ein, dann speichern.

### Problem: "Konnte keine Daten abrufen"
**Mögliche Ursachen:**
- Profile sind privat → Auf öffentlich stellen
- Falscher Benutzername → Im Profil-Tab überprüfen
- Netzwerkproblem → Später nochmal versuchen

### Problem: "Plattform fehlt im Follower Summary"
**Erklärung:** Nur Plattformen mit **1000+ Followern** werden gezeigt.
**Lösung:** Das ist gewollt! Kleine Accounts erscheinen nicht im Summary, aber du kannst sie im Analytics Selector sehen.

### Problem: "Alte Daten werden angezeigt"
**Lösung:** Klicke auf "Social Stats aktualisieren" um neue Daten zu holen.

## 📱 Unterstützte Plattformen

| Plattform | Status | Metriken |
|-----------|--------|----------|
| Instagram | ✅ Funktioniert | Followers, Posts, Following, Verified |
| TikTok | ✅ Funktioniert | Followers, Likes, Videos, Following |
| YouTube | ⏳ Vorbereitet | (API-Key benötigt) |
| Twitch | 🔜 Geplant | - |
| X/Twitter | 🔜 Geplant | - |

## 💡 Tipps

1. **Wöchentlich synchronisieren** - Halte die Daten aktuell
2. **Vor wichtigen Pitches** - Sync kurz vorher für neueste Zahlen
3. **Profil-Tab ist Master** - Dort sind alle Handles gespeichert
4. **1000+ ist professionell** - Der Filter zeigt nur relevante Accounts
5. **Platform Analytics nutzen** - Brands lieben Details!

## 🎨 Für Brands/Viewer

Wenn jemand dein Media Kit ansieht:
- ✅ Sieht echte, verifizierte Zahlen
- ✅ Kann Plattformen einzeln analysieren
- ✅ Sieht wann Daten aktualisiert wurden
- ✅ Nur relevante Plattformen (1000+) im Summary
- ✅ Professionelle Präsentation

## 📚 Weitere Dokumentation

- **SOCIAL_MEDIA_INTEGRATION.md** - Vollständige technische Dokumentation
- **IMPLEMENTATION_SUMMARY.md** - Technische Details für Entwickler

## 🎉 Viel Erfolg!

Dein Media Kit ist jetzt professioneller und zeigt echte, verifizierte Daten. 

**Fragen?** Schau in die SOCIAL_MEDIA_INTEGRATION.md für Details.
