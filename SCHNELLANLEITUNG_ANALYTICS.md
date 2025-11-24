# Media Kit Analytics - Schnellanleitung 🚀

## Problem
Die Analytics im Media Kit zeigen keine Daten an.

## Ursache
Die Datenbank ist leer - die Fetch-Scripts wurden noch nicht ausgeführt.

## ✅ Lösung (5 Minuten)

### Schritt 1: GitHub Secrets erstellen

Gehe zu: https://github.com/Festas/Link-in-Bio/settings/secrets/actions

**Secret 1:** Name: `INSTAGRAM_SECRET`
```
INSTAGRAM_ACCESS_TOKEN=EAAMPNv2JuZBQBQIhMiwiVz6ohZCixdZCtcZAHLYC3iHGZAO1XqWSplA4ZBOeptfAQohxnamvAcIoVYIHiMwJa5WBaEhGjiZAGdh2cMb1gIpThuWtzIuEifukmq3RQP9BYvfikXOGxUZCvHeXUVWfL4uZBDZCc1uTWOvHwJrA9h3FlLPexNbHAMVG3dNuNsj5EdoOcH
INSTAGRAM_USERNAME=festas_builds
INSTAGRAM_APP_ID=861153786444772
INSTAGRAM_APP_SECRET=2543b261250256a3d0fe6aff651f3f2d
```

**Secret 2:** Name: `TIKTOK_SECRET`
```
TIKTOK_ACCESS_TOKEN=act.ZhfXrpZArkczUkA9QO8iFIeZBvzQq2WY6ejmvJtgnyBIrsqIRR8iQZaETWJP!4667.e1
TIKTOK_REFRESH_TOKEN=rft.y8OL4vuYn8Qrh0dt91abykkdta1axz6RpgFsZutRBympX2irCEA92jqoDWyk!4675.e1
TIKTOK_CLIENT_KEY=sbawjlk44o4nkm4arb
TIKTOK_CLIENT_SECRET=poGrbxRtnkardHNBUGXcSi5OdYsJD20l
```

### Schritt 2: Workflow ausführen

Gehe zu: https://github.com/Festas/Link-in-Bio/actions/workflows/fetch-social-stats.yml

Klicke: **"Run workflow"** → **"Run workflow"**

### Schritt 3: Warten (2-3 Minuten)

Der Workflow:
1. ✅ Holt Instagram-Daten
2. ✅ Holt TikTok-Daten
3. ✅ Deployed auf den Server
4. ✅ Analytics erscheinen automatisch!

---

## 📖 Ausführliche Dokumentation

Siehe: **MEDIAKIT_ANALYTICS_BERICHT.md**

Dort findest du:
- Detaillierte Fehleranalyse
- Alternative Lösungen
- Troubleshooting
- Verifizierungs-Schritte

---

## ⚡ Alternative: Manuell im Admin-Panel

Falls GitHub Actions nicht funktionieren:

1. **SSH auf Server:**
```bash
ssh username@your-server
cd /var/www/app
```

2. **.env.social erstellen:**
```bash
cat > .env.social << 'EOF'
[Inhalt von oben einfügen]
EOF
```

3. **Container neustarten:**
```bash
docker compose restart web
```

4. **Im Admin-Panel:**
- Öffne `/admin` → "Media Kit" Tab
- Klicke "Instagram API aktualisieren"
- Klicke "TikTok API aktualisieren"
- ✅ Fertig!

---

**Das war's!** 🎉
