# festas-builds.com

Personal landing page for [festas-builds.com](https://festas-builds.com) — a lightweight, static single-page site that showcases who Festas/Eric is and links to his projects.

## How It Works

Pure static HTML/CSS/JS — no framework, no build step, no server required. Nginx serves the files directly from `/srv/landing-page` on the Hetzner server.

## Deploy

Push to `main` → GitHub Actions automatically:
1. Copies Nginx configs for all subdomains to the server
2. Copies the static site files (`index.html`, `css/`, `js/`, `assets/`) to `/srv/landing-page/`
3. Tests and reloads Nginx

**Secrets required:** `HOST`, `USERNAME`, `SSH_PRIVATE_KEY`, `DOMAIN`

## Editing Content

Just edit `index.html` — all content is inline. Push to `main` to deploy.

For styles, edit `css/style.css`. For animations and interactivity, edit `js/main.js`.

## Infrastructure

The server hosts several subdomains beyond the main landing page:

| Subdomain | Project |
|---|---|
| `mc.festas-builds.com` | Minecraft RPG Server (custom MMO) |
| `rigpilot.festas-builds.com` | RigPilot — PC hardware configurator |
| `immocalc.festas-builds.com` | ImmoCalc — German real estate calculator |
| `fire.festas-builds.com` | FIRE Simulator — early retirement planner |
| `cs.festas-builds.com` | Cosmic Survivor — browser game |
| `panel.festas-builds.com` | Pterodactyl game server panel |
| `mc-map.festas-builds.com` | BlueMap — Minecraft live map |
| `mc-stats.festas-builds.com` | Plan — Minecraft player analytics |

Nginx configs for all subdomains live in `nginx/sites-available/` and are deployed automatically on every push to `main`.

## File Structure

```
index.html          Landing page
css/style.css       All styles
js/main.js          Scroll animations and interactivity
assets/favicon.svg  Favicon
nginx/              Nginx configs for all subdomains
.github/workflows/  CI/CD (deploy.yml)
```

## License

[MIT](LICENSE)
