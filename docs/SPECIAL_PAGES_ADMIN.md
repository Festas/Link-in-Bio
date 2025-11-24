# Besondere Seiten Admin Panel

## Übersicht

Das neue, eigenständige Admin Panel für besondere Seiten (Media Kit, Impressum, Datenschutz, Über-mich, Kontakt) bietet eine moderne, benutzerfreundliche Oberfläche zur Verwaltung aller speziellen Inhaltsseiten.

## Zugriff

Das Admin Panel ist unter folgenden URLs erreichbar:

- **Übersicht**: `/admin` - Zeigt alle besonderen Seiten
- **Media Kit**: `/admin/mediakit`
- **Impressum**: `/admin/impressum`
- **Datenschutz**: `/admin/datenschutz`
- **Über mich**: `/admin/ueber-mich`
- **Kontakt**: `/admin/kontakt`

Alle Admin-Routen erfordern Authentifizierung.

## Features

### Allgemeine Features

- **Block-basierter Editor**: Flexible Gestaltung mit verschiedenen Blocktypen
- **Drag & Drop**: Blöcke können per Drag & Drop neu angeordnet werden
- **Vorschau**: Direkte Vorschau der öffentlichen Seite
- **Navigation**: Schnelle Navigation zwischen allen besonderen Seiten
- **Mobile-optimiert**: Vollständig responsive Design

### Block-Typen

#### Standard-Blöcke (alle Seiten)
- **Überschrift**: Große Überschriften für Abschnitte
- **Text**: Freitext-Absätze
- **Bild**: Bilder mit Alt-Text
- **Liste**: Aufzählungen und Listen
- **Trennlinie**: Visuelle Trennung von Abschnitten

#### Media Kit spezifische Blöcke
- **Statistiken**: Automatisch aktualisierte Social Media Statistiken
- **Plattformen**: Übersicht aller Social Media Plattformen
- **Preise**: Kooperationspreise und Pakete

#### Kontakt spezifische Blöcke
- **Kontaktformular**: Integriertes Kontaktformular

### Media Kit Spezial-Features

- **Zugriffskontrolle**: 
  - Öffentlich - Jeder kann ansehen
  - Gated - Anfrage erforderlich
  - Privat - Nur mit Link

- **Video Pitch**: Optional YouTube/Vimeo Video einbinden
- **Analytics**: 
  - Gesamtaufrufe
  - Aufrufe der letzten 7 Tage
  - Zugriffs-Anfragen

## Technische Details

### Backend
- **Router**: `app/routers/special_pages_admin.py`
- **Routen**: Alle unter `/admin/<page_key>`
- **Authentifizierung**: Via `require_auth` Dependency
- **API-Endpunkte**: Nutzt bestehende `/api/special-pages/*` Endpunkte

### Frontend
- **Templates**:
  - `templates/admin_special_pages_index.html` - Übersicht
  - `templates/admin_special_page.html` - Einzelseiten-Editor
  
- **JavaScript**:
  - `static/js/admin_special_pages_editor.js` - Haupteditor
  - `static/js/admin_mediakit_enhanced.js` - Media Kit Funktionen

### Datenbank
Nutzt bestehende Tabellen:
- `special_pages` - Seitenmetadaten
- `special_page_blocks` - Inhaltsblöcke
- `mediakit_blocks` - Media Kit spezifische Blöcke
- `mediakit_settings` - Media Kit Einstellungen
- `mediakit_views` - Analytics Daten

## Verwendung

### Block hinzufügen
1. Im Editor auf gewünschten Block-Typ klicken
2. Inhalt eingeben
3. "Speichern" klicken

### Block bearbeiten
1. Direkt im Block-Feld Text eingeben
2. Änderungen werden automatisch gespeichert (mit Debouncing)

### Block löschen
1. Auf Papierkorb-Icon im Block klicken
2. Bestätigung

### Block verschieben
1. Drag-Handle (≡) gedrückt halten
2. Block an neue Position ziehen
3. Automatisches Speichern

### Block ein-/ausblenden
1. Auf Augen-Icon klicken
2. Block wird ausgeblendet/eingeblendet
3. Automatisches Speichern

## Integration mit bestehendem System

Das neue Admin Panel ist vollständig rückwärtskompatibel:
- Öffentliche Routen (`/mediakit`, `/impressum`, etc.) funktionieren weiterhin
- Bestehende API-Endpunkte werden genutzt
- Keine Breaking Changes
- Alte Admin-Features können parallel existieren

## Anpassungen

### Neue Seite hinzufügen

In `app/routers/special_pages_admin.py`:

```python
SPECIAL_PAGES = {
    "neue-seite": {
        "title": "Neue Seite",
        "description": "Beschreibung der neuen Seite",
        "icon": "icon-name",  # Lucide Icon Name
    },
    # ...
}
```

### Neue Block-Typen hinzufügen

In `static/js/admin_special_pages_editor.js` die Methoden erweitern:
- `getBlockTypeLabel()` - Label für Block-Typ
- `getBlockIcon()` - Icon für Block-Typ
- `renderBlockContent()` - Rendering-Logik

## Best Practices

1. **Speichern**: Regelmäßig speichern, auch wenn Auto-Save aktiv ist
2. **Vorschau**: Vor Veröffentlichung immer Vorschau prüfen
3. **Bilder**: Optimierte Bilder verwenden für bessere Performance
4. **Text**: Klare, prägnante Texte für bessere Lesbarkeit
5. **Mobile**: Inhalte auch auf mobilen Geräten testen

## Fehlerbehebung

### Blöcke werden nicht geladen
- Authentifizierung prüfen (eingeloggt?)
- Browser-Console auf Fehler prüfen
- Cache leeren und neu laden

### Änderungen werden nicht gespeichert
- Netzwerkverbindung prüfen
- Authentifizierung prüfen
- Browser-Console auf API-Fehler prüfen

### Media Kit Stats werden nicht aktualisiert
- Social Media Handles in Profil-Tab konfigurieren
- "Stats aktualisieren" Button verwenden
- Einige Minuten warten (Rate Limiting)

## Sicherheit

- Alle Admin-Routen erfordern Authentifizierung
- CSRF-Schutz aktiv
- Input-Sanitization für alle Blöcke
- XSS-Schutz durch HTML-Escaping
- Rate Limiting für API-Anfragen

## Support

Bei Fragen oder Problemen:
1. Browser-Console auf Fehler prüfen
2. Server-Logs überprüfen
3. GitHub Issues erstellen mit Details
