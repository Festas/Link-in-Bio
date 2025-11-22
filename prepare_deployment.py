import os
from pathlib import Path

print("🚀 Erstelle Deployment-Konfigurationen für Hetzner/Docker...")

base_dir = Path(".")

# 1. Ordner für GitHub Actions erstellen
github_workflow_dir = base_dir / ".github" / "workflows"
os.makedirs(github_workflow_dir, exist_ok=True)
print(f"✅ Ordner erstellt: {github_workflow_dir}")

# --- DATEI INHALTE ---

# 1. .gitignore (Verhindert, dass Müll oder Passwörter hochgeladen werden)
gitignore_content = """__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/
.git
.gitignore
.DS_Store
.vscode/
.idea/

# WICHTIG: Datenbank und Uploads nicht ins Git!
# Wir wollen die Live-Datenbank auf dem Server nicht überschreiben.
linktree.db
static/uploads/*
!static/uploads/.gitkeep
.env
"""

# 2. Caddyfile (Dein Webserver & SSL Zertifikat Automat)
caddyfile_content = """# Ersetze 'deine-domain.de' mit deiner echten Domain!
deine-domain.de {
    reverse_proxy linktree:8000
}
"""

# 3. docker-compose.yml (Die Produktions-Version mit Caddy)
docker_compose_content = """services:
  linktree:
    build: .
    container_name: linktree_app
    restart: unless-stopped
    volumes:
      # Persistente Daten: Wir mappen die Dateien vom Server in den Container
      - ./linktree.db:/app/linktree.db
      - ./static/uploads:/app/static/uploads
      # Die .env Datei wird auf dem Server erstellt/hinterlegt
      - ./.env:/app/.env
    # Kein Port-Mapping nach außen nötig, Caddy übernimmt das intern

  caddy:
    image: caddy:latest
    container_name: caddy_server
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - linktree

volumes:
  caddy_data:
  caddy_config:
"""

# 4. GitHub Action (deploy.yml) - Automatisiertes Update
github_action_content = """name: Deploy to Hetzner

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # 1. Dateien auf den Server kopieren
      - name: Copy files via SCP
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          source: "."
          target: "/root/linktree"
          # WICHTIG: DB und Uploads ausschließen!
          rm: false 
          exclude: "linktree.db,static/uploads,venv,.git,.github"

      # 2. .env Datei aus Secrets erstellen (Sicherheit!)
      - name: Create .env file
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /root/linktree
            echo "${{ secrets.ENV_FILE }}" > .env

      # 3. Docker neu starten
      - name: Restart Docker Containers
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /root/linktree
            docker compose up -d --build --remove-orphans
            docker image prune -f
"""

# 5. Guide (Zur Erinnerung)
guide_content = """# Schnell-Checkliste für den Go-Live

1.  **Caddyfile anpassen:** Öffne `Caddyfile` und tausche `deine-domain.de` gegen deine echte Domain.
2.  **Git Repository:**
    * Erstelle ein Repo auf GitHub.
    * Pushe den Code (`git init`, `git add .`, `git commit`, `git push`).
3.  **Server Setup (Hetzner):**
    * Miete einen Ubuntu Server.
    * Installiere Docker: `apt update && apt install docker.io docker-compose-v2 -y`
    * Erstelle den Ordner: `mkdir -p /root/linktree/static/uploads`
4.  **GitHub Secrets:**
    * Gehe zu deinem Repo -> Settings -> Secrets -> Actions.
    * Füge hinzu: `HOST` (IP), `USERNAME` (root), `SSH_PRIVATE_KEY` (Dein Key), `ENV_FILE` (Inhalt deiner .env).
5.  **Deploy:**
    * Jeder Push auf `main` aktualisiert jetzt deinen Server!
"""

# --- DATEIEN SCHREIBEN ---

files_map = {
    ".gitignore": gitignore_content,
    "Caddyfile": caddyfile_content,
    "docker-compose.yml": docker_compose_content,
    ".github/workflows/deploy.yml": github_action_content,
    "DEPLOY_CHECKLIST.md": guide_content,
}

for path, content in files_map.items():
    p = base_dir / path
    with open(p, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✅ Erstellt: {path}")

print("\n--- Fertig! ---")
print("Vergiss nicht, 'Caddyfile' zu bearbeiten und deine Domain einzutragen!")
