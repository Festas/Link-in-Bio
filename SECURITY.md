# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

Wir nehmen Sicherheit ernst. Wenn Sie eine Sicherheitslücke entdecken, melden Sie diese bitte **verantwortungsvoll**.

### Meldeprozess

1. **Öffnen Sie KEIN öffentliches GitHub Issue** für Sicherheitslücken
2. Senden Sie stattdessen eine E-Mail an: [security contact email]
3. Beschreiben Sie die Schwachstelle detailliert:
   - Art der Schwachstelle
   - Schritte zur Reproduktion
   - Potenzielle Auswirkungen
   - Vorgeschlagene Lösung (falls vorhanden)

### Was Sie erwarten können

- Bestätigung Ihrer Meldung innerhalb von 48 Stunden
- Regelmäßige Updates zum Fortschritt
- Anerkennung Ihres Beitrags (falls gewünscht)

## Bekannte Sicherheitshinweise

### Kritisch
- **Basic Authentication:** Die Anwendung verwendet Basic Auth. Daher ist HTTPS **zwingend erforderlich** für Production!
- **Default Credentials:** Ändern Sie **immer** die Standard-Credentials in der `.env` Datei

### Wichtig
- **SQLite für Single-User:** SQLite ist nicht für High-Traffic mit vielen gleichzeitigen Schreibzugriffen geeignet
- **Custom HTML:** Admin-Nutzer können Custom HTML/JavaScript einfügen. Nutzen Sie nur vertrauenswürdige Admin-Accounts

## Best Practices für Deployment

### Credentials
```bash
# ✅ Gut: Starkes, zufälliges Passwort
ADMIN_PASSWORD=$(openssl rand -base64 32)

# ❌ Schlecht: Schwaches oder Default-Passwort
ADMIN_PASSWORD=admin123
```

### HTTPS
```bash
# ✅ Caddy konfiguriert automatisch Let's Encrypt
# Stelle sicher, dass deine Domain korrekt im Caddyfile steht
```

### Firewall
```bash
# Nur notwendige Ports öffnen
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 22/tcp    # SSH
ufw enable
```

### Updates
```bash
# Regelmäßig Dependencies aktualisieren
pip install -U -r requirements.txt

# Docker Images aktualisieren
docker compose pull
docker compose up -d --build
```

## Sicherheits-Features

### Implementiert
- ✅ Rate Limiting auf API Endpoints
- ✅ SSRF Protection im Web Scraper
- ✅ Security Headers (X-XSS-Protection, X-Frame-Options, etc.)
- ✅ Input Sanitization für URLs
- ✅ Secrets-Vergleich (Timing-Attack-Schutz)
- ✅ SQL Injection Schutz via parametrisierte Queries

### Geplant/Empfohlen
- 🔜 Content Security Policy (CSP)
- 🔜 HTML Sanitization für Custom HTML Fields
- 🔜 2-Factor Authentication
- 🔜 Session Management mit JWT
- 🔜 Audit Logging
- 🔜 Automated Dependency Scanning

## Häufige Sicherheitsfragen

### Q: Ist mein Passwort sicher gespeichert?
**A:** Nein, aktuell werden Passwörter nicht gehasht. Verwenden Sie ein **einzigartiges** Passwort nur für diese Anwendung. Passwort-Hashing ist für zukünftige Versionen geplant.

### Q: Kann ich mehrere Admin-Nutzer haben?
**A:** Aktuell nicht. Nur ein Admin-Account wird unterstützt.

### Q: Wie sichere ich meine Daten?
**A:** 
1. Regelmäßige Backups der `linktree.db` Datei
2. Backups verschlüsselt speichern
3. 3-2-1 Backup-Strategie: 3 Kopien, 2 verschiedene Medien, 1 offsite

### Q: Ist die Anwendung DSGVO-konform?
**A:** Das kommt auf Ihre Nutzung an:
- ✅ Selbst-gehostet = Sie kontrollieren die Daten
- ⚠️ Passen Sie `privacy.html` an Ihre Datenschutzerklärung an
- ⚠️ Implementieren Sie Cookie-Consent falls nötig
- ⚠️ Daten-Export und -Löschung für DSGVO-Compliance

## Security Checklist für Production

- [ ] Starkes, einzigartiges Admin-Passwort gesetzt
- [ ] HTTPS aktiviert (Caddy/Let's Encrypt)
- [ ] `.env` Datei mit korrekten Permissions (600)
- [ ] Firewall konfiguriert
- [ ] Regelmäßige Backups eingerichtet
- [ ] Monitoring/Alerting aktiviert
- [ ] Dependencies auf dem neuesten Stand
- [ ] Datenschutzerklärung angepasst
- [ ] Security Headers geprüft (Mozilla Observatory)
- [ ] Rate Limits getestet
- [ ] Penetration Test durchgeführt (optional aber empfohlen)

## Responsible Disclosure

Wir glauben an **Responsible Disclosure**:

1. Melden Sie Sicherheitslücken privat
2. Geben Sie uns angemessene Zeit zum Patchen (90 Tage)
3. Veröffentlichen Sie Details erst nach dem Patch

Vielen Dank, dass Sie helfen, diese Software sicher zu halten! 🛡️
