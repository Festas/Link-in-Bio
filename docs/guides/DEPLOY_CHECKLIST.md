# Schnell-Checkliste für den Go-Live

## Voraussetzungen

- [ ] Docker und Docker Compose installiert
- [ ] Domain konfiguriert mit DNS A-Record auf Server-IP
- [ ] SSH-Zugang zum Server

## 1. Lokale Vorbereitung

### 1.1 Code vorbereiten
```bash
# Dependencies installieren
make install

# Code formatieren
make format

# Tests ausführen
make test

# Assets für Produktion optimieren (optional)
make build-assets
```

### 1.2 Caddyfile anpassen
Öffne `Caddyfile` und ersetze `deine-domain.de` mit deiner Domain:
```
deine-domain.de {
    reverse_proxy app:8000
    encode gzip zstd
    
    # Static file caching for production
    @static {
        path /static/*
    }
    header @static Cache-Control "public, max-age=31536000, immutable"
}
```

## 2. Git Repository Setup

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/DEIN-USERNAME/link-in-bio.git
git push -u origin main
```

## 3. Server Setup (Hetzner/VPS)

### 3.1 Basis-Installation
```bash
# System aktualisieren
apt update && apt upgrade -y

# Docker installieren
apt install docker.io docker-compose-v2 -y

# Deploy-Benutzer erstellen (empfohlen)
useradd -m -s /bin/bash deploy
usermod -aG docker deploy
```

### 3.2 Verzeichnisse erstellen
```bash
mkdir -p /srv/link-in-bio/static/uploads
mkdir -p /srv/link-in-bio/data
chown -R deploy:deploy /srv/link-in-bio
```

## 4. GitHub Secrets konfigurieren

Gehe zu: Repository → Settings → Secrets and variables → Actions

Erforderliche Secrets:

| Secret | Beschreibung | Beispiel |
|--------|-------------|----------|
| `HOST` | Server IP-Adresse | `123.45.67.89` |
| `USERNAME` | SSH Benutzer | `deploy` |
| `SSH_PRIVATE_KEY` | Privater SSH-Key | `-----BEGIN OPENSSH...` |
| `DOMAIN` | Deine Domain | `example.com` |
| `ENV_FILE` | Inhalt der .env Datei | Siehe .env.example |

Optionale Secrets für Social Media Integration:
- `INSTAGRAM_SECRET` - Instagram API Credentials
- `TIKTOK_SECRET` - TikTok API Credentials

## 5. Deployment

### Automatisches Deployment
Jeder Push auf `main` triggert das automatische Deployment via GitHub Actions.

### Manuelles Deployment
```bash
# Auf dem Server
cd /srv/link-in-bio
docker-compose pull
docker-compose up -d
```

## 6. Post-Deployment Checks

- [ ] Website erreichbar unter https://deine-domain.de
- [ ] Admin Panel erreichbar unter https://deine-domain.de/admin
- [ ] SSL-Zertifikat aktiv (Caddy stellt automatisch aus)
- [ ] Bilder-Upload funktioniert
- [ ] Datenbank wird persistent gespeichert

## 7. Produktions-Optimierung

### Caddy Konfiguration für optimale Performance

```
deine-domain.de {
    reverse_proxy app:8000
    
    # Kompression aktivieren
    encode {
        gzip
        zstd
        minimum_length 1024
    }
    
    # Static Assets mit Cache-Headers
    @static {
        path /static/*
    }
    header @static {
        Cache-Control "public, max-age=31536000, immutable"
        X-Content-Type-Options "nosniff"
    }
    
    # Security Headers
    header {
        X-Frame-Options "SAMEORIGIN"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

### Asset-Minifizierung

```bash
# CSS und JS minifizieren
make minify

# Assets mit Hash-Manifest erstellen
make build-assets
```

## 8. Monitoring & Backup

### Health Check
```bash
curl https://deine-domain.de/health
```

### Datenbank Backup
```bash
make backup
```

### Logs prüfen
```bash
docker-compose logs -f app
```

## Troubleshooting

### Container startet nicht
```bash
docker-compose logs app
docker-compose down && docker-compose up -d
```

### SSL-Zertifikat Probleme
```bash
docker-compose logs caddy
# Sicherstellen, dass Port 80 und 443 offen sind
```

### Datenbank-Fehler
```bash
# Datenbanken neu initialisieren
docker-compose exec app python init_databases.py
```
