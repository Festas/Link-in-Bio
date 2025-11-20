# Schnell-Checkliste für den Go-Live

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
