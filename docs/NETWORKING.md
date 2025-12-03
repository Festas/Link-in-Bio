# Networking Architecture

This repository hosts the **main Caddy reverse proxy** for all festas-builds.com services. This document explains the networking architecture and how to add new services.

## Overview

The Link-in-Bio repository acts as the single entry point for all HTTP/HTTPS traffic:

```
                    ┌─────────────────────────────────────────────────┐
                    │           Caddy Reverse Proxy                    │
                    │         (ports 80/443 on host)                   │
                    └─────────────────────────────────────────────────┘
                              │              │              │
                              ▼              ▼              ▼
                    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
                    │    web      │ │    web      │ │  rigpilot   │
                    │   :8000     │ │   :8000     │ │   :3000     │
                    └─────────────┘ └─────────────┘ └─────────────┘
                    festas-builds.com  admin.*        rigpilot.*
```

## Network Configuration

All services communicate over a shared Docker network called `caddy-network`.

### Link-in-Bio (this repository)

This repository defines and creates the `caddy-network`:

```yaml
# docker-compose.yml
networks:
  caddy-network:
    name: caddy-network
    driver: bridge

services:
  web:
    networks:
      - caddy-network

  caddy:
    ports:
      - "80:80"
      - "443:443"
    networks:
      - caddy-network
```

### External Services (e.g., PC-Builder)

Other services should join the network as **external**:

```yaml
# In other repository's docker-compose.yml
networks:
  caddy-network:
    external: true  # Join existing network, don't create

services:
  rigpilot:
    container_name: rigpilot  # Must match Caddyfile reverse_proxy target
    networks:
      - caddy-network
    # NO ports exposed - Caddy handles all external traffic
```

## Domain Routing

The Caddyfile defines routing for all domains:

| Domain | Target | Description |
|--------|--------|-------------|
| `festas-builds.com` | `web:8000` | Main Link-in-Bio site |
| `admin.festas-builds.com` | `web:8000` | Admin interface |
| `rigpilot.festas-builds.com` | `rigpilot:3000` | PC Builder app |

## Adding a New Service

### 1. Update the Caddyfile

Add a new block to the Caddyfile:

```caddyfile
# New service subdomain
newservice.festas-builds.com {
    tls eric@festas-builds.com
    reverse_proxy newservice:PORT
}
```

### 2. Update deploy.yml

Add the new domain block to the printf command that generates the Caddyfile during deployment.

### 3. Configure the External Service

In the other service's docker-compose.yml:

```yaml
networks:
  caddy-network:
    external: true

services:
  newservice:
    container_name: newservice  # This name is used in Caddyfile
    # ... other configuration
    networks:
      - caddy-network
    # Do NOT expose ports - Caddy handles this
```

### 4. DNS Configuration

Add an A record for the new subdomain pointing to the server IP:

| Type | Name | Value |
|------|------|-------|
| A | newservice | YOUR_SERVER_IP |

### 5. Deploy

1. Deploy Link-in-Bio first (to create/update the network and Caddyfile)
2. Deploy the new service (to join the network)

## Benefits

- **Single SSL termination point**: Caddy manages all Let's Encrypt certificates
- **No port conflicts**: Only Caddy binds to ports 80/443
- **Centralized certificate management**: One place for all domain certificates
- **Easy to add services**: Just add a Caddyfile block and join the network

## Troubleshooting

### Service Not Reachable

1. Check if the service is on the `caddy-network`:
   ```bash
   docker network inspect caddy-network
   ```

2. Verify the container name matches the Caddyfile target:
   ```bash
   docker ps --format '{{.Names}}'
   ```

3. Check Caddy logs:
   ```bash
   docker compose logs caddy
   ```

### SSL Certificate Issues

1. Ensure DNS is pointing to the server
2. Check Caddy logs for ACME errors
3. Verify the domain is correctly spelled in Caddyfile

### Network Doesn't Exist

If an external service fails to start because `caddy-network` doesn't exist:

1. Deploy Link-in-Bio first, or
2. Create the network manually:
   ```bash
   docker network create caddy-network
   ```

## Security Considerations

- Only Caddy exposes ports to the internet (80/443)
- Internal services communicate over the Docker bridge network
- TLS is enforced for all domains via Let's Encrypt
- Service containers don't need to bind to host ports
