# Deploying Skedoodle to VPS

## Overview

Skedoodle is deployed as a Docker container to a VPS, behind a shared Caddy reverse proxy.
The VPS already runs another app (solomon) with the same pattern.

## Architecture

```
Internet
  │
  ▼
Caddy (ports 80/443, auto HTTPS)
  ├── firenice.top        → solomon-app:3000
  └── skedoodle.domain    → skedoodle-app:3013 (HTTP API + SPA)
                           → skedoodle-app:3014 (WebSocket via /ws)

All containers share a Docker network called "web"
```

## Files in this repo

- `Dockerfile` — Multi-stage build: client (Vite/React) + server (Express/Prisma/WebSocket)
- `docker-compose.yml` — App service only (Caddy is shared separately)
- `Caddyfile` — Caddy config for both solomon and skedoodle (copy to VPS)
- `.github/workflows/deploy.yml` — CI: build image → push to GHCR → SSH deploy

## Step-by-step VPS setup

### 1. Create the shared Docker network

```bash
docker network create web
```

### 2. Set up shared Caddy

Create `~/caddy/docker-compose.yml`:

```yaml
services:
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - caddy_data:/data
      - caddy_config:/config
      - ./Caddyfile:/etc/caddy/Caddyfile
    networks:
      - web

volumes:
  caddy_data:
  caddy_config:

networks:
  web:
    external: true
```

Copy `Caddyfile` from this repo to `~/caddy/Caddyfile`. It contains both domains:

```
firenice.top {
    reverse_proxy solomon-app:3000
}

skedoodle.yourdomain.com {
    @websocket {
        path /ws
        header Connection *Upgrade*
        header Upgrade websocket
    }
    reverse_proxy @websocket skedoodle-app:3014
    reverse_proxy skedoodle-app:3013
}
```

Replace `skedoodle.yourdomain.com` with your actual domain (or use the `SKEDOODLE_DOMAIN` env var).

### 3. Update solomon's docker-compose

Remove the `caddy` service from `~/solomon/docker-compose.yml` and add the shared network:

```yaml
services:
  app:
    container_name: solomon-app
    # ... keep everything else ...
    networks:
      - web

networks:
  web:
    external: true
```

### 4. Set up skedoodle on the VPS

Create `~/skedoodle/.env`:

```env
SKEDOODLE_DOMAIN=skedoodle.yourdomain.com
JWT_SECRET=generate-a-secure-random-string
```

Create `~/skedoodle/data/` directory for the SQLite database:

```bash
mkdir -p ~/skedoodle/data
```

The `docker-compose.yml` is pulled by CI or you can copy it manually.

### 5. Start everything

```bash
# Stop solomon's old setup (which includes Caddy)
docker compose -f ~/solomon/docker-compose.yml down

# Start with new setup
docker compose -f ~/solomon/docker-compose.yml up -d
docker compose -f ~/skedoodle/docker-compose.yml up -d
docker compose -f ~/caddy/docker-compose.yml up -d
```

## GitHub Secrets to configure

Go to GitHub repo → Settings → Secrets and variables → Actions:

| Secret | Value | Purpose |
|---|---|---|
| `VITE_API_URL` | `https://skedoodle.yourdomain.com/api` | Baked into client at build time |
| `VITE_WS_URL` | `wss://skedoodle.yourdomain.com/ws` | Baked into client at build time |
| `VPS_HOST` | `123.45.67.89` | VPS IP address |
| `VPS_USER` | `root` (or your user) | SSH username |
| `VPS_SSH_KEY` | SSH private key content | For SSH access |

## CI/CD flow

On push to `main`:

1. **Build** — Docker multi-stage build (client + server) with `VITE_API_URL` and `VITE_WS_URL` as build args
2. **Push** — Image pushed to `ghcr.io/eugenioenko/skedoodle:latest`
3. **Deploy** — SSH into VPS, pull new image, `docker compose up -d` (recreates only changed containers)

## Database persistence

- SQLite DB lives at `/app/data/skedoodle.db` inside the container
- Mapped to `~/skedoodle/data/skedoodle.db` on the host via volume mount
- Prisma migrations run automatically on container startup (`prisma migrate deploy`)
- Upgrading the container preserves the DB

## Useful commands

```bash
# View skedoodle logs
docker compose -f ~/skedoodle/docker-compose.yml logs -f

# View caddy logs
docker compose -f ~/caddy/docker-compose.yml logs -f

# Restart skedoodle after config change
docker compose -f ~/skedoodle/docker-compose.yml up -d

# Reload caddy after Caddyfile change
docker compose -f ~/caddy/docker-compose.yml exec caddy caddy reload --config /etc/caddy/Caddyfile

# Check which containers are on the web network
docker network inspect web

# Manual deploy (without CI)
docker pull ghcr.io/eugenioenko/skedoodle:latest
docker compose -f ~/skedoodle/docker-compose.yml up -d
```
