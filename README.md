# Skedoodle

A real-time collaborative sketching app built with event sourcing and WebSockets.

**Try it live:** [skedoodle.top](https://skedoodle.top)

## What it does

Multiple people draw on the same canvas at once. Every stroke, shape, and edit is captured as an immutable command in an append-only log. The log is the single source of truth — the canvas is just a projection of it.

### Performance
- **0% CPU at idle** — fully event-driven rendering, no polling or animation loops when nothing is changing
- **~40% CPU during heavy brush usage** on a single core (measured against Figma's 150–200% under comparable conditions)
- **~20% CPU max with throttling enabled**
- Configurable frame rate: 120fps, 60fps, or 15fps battery-saver mode

### Drawing tools
- **Freehand brush** with configurable stabilization (1–10 pixel smoothing) and real-time path simplification during drawing:
  - Douglas-Peucker algorithm (1–100 tolerance)
  - Visvalingam-Whyatt with three variants: angle-based, distance-based, and triangle-area (1–100 sensitivity each)
  - Simplification runs on the stroke as it's drawn, not as a post-processing step
- Lines with optional arrowheads
- Rectangles with configurable stroke, fill, and corner radius
- Bezier curves with control points
- Text with inline editing
- Pointer for selecting and dragging shapes
- Eraser, hand/pan, zoom

### Canvas
- Infinite canvas with pan and zoom up to 10,000% (practical precision limit, expandable)
- Incremental rendering — only dirty regions are redrawn, not the full canvas
- Configurable grid system: line or dot rendering with customizable color
- Grid auto-hides at configured zoom thresholds to reduce visual clutter
- Viewport culling: off-screen shapes are excluded from the render pass

### Collaboration
- Real-time sync via WebSocket rooms — commands broadcast to all participants
- Remote cursor tracking with color-coded labels
- User presence indicators
- Offline-first: works locally with localStorage, reconciles on reconnect

### Time travel
- Scrub through the full command history at any point
- Branch from any position to create a new sketch from that state

## Architecture & design decisions

### Event sourcing with an append-only command log

All mutations go through a command pipeline:

```
User action → Command { id, ts, uid, type, sid, data } → append to log → broadcast → render
```

Commands are typed as `create`, `update`, `remove`, `undo`, or `redo`. Each has a ULID for global ordering and deduplication. Undo generates inverse commands (create/remove swap, updates store pre-mutation snapshots for field-level rollback) rather than popping from a stack — this keeps the log append-only even across undo/redo.

The server is stateless: rooms load their command log from the database when the first client joins, then relay commands between participants. On reconnect, the client compares log lengths and replays the delta in either direction.

### Authentication: passkeys today, identity provider next

Authentication uses WebAuthn/passkeys via `@simplewebauthn` — no passwords, no OAuth provider. The server issues JWTs after passkey verification. This keeps the auth stack self-contained with zero external dependencies.

The next step is integrating an identity provider and switching to [OpenTDF](https://opentdf.io/) for attribute-based access control (ABAC). This would allow fine-grained authorization — e.g., per-sketch permissions based on user attributes, roles, or organizational policies — without hardcoding access rules into the application layer.

### SQLite, optimized for append-only writes

The database stores users, credentials, sketches (metadata), and the command log. The schema is designed around the append-only pattern: commands are inserted but never updated or deleted. SQLite is a good fit here — single-writer, no connection pool overhead, and the write pattern is sequential appends.

### Sync and conflict resolution

WebSocket rooms handle the real-time layer:
- Client sends `join` with auth token → server sends full command log + active users
- Commands relay to all room members (excluding sender)
- Cursors broadcast at ~10fps with throttling
- Empty rooms clean up after a 30-second grace period

Conflict resolution is last-write-wins by command order. If user A deletes a shape that user B is editing, B's update silently no-ops. All clients converge to the same state by replaying the same ordered command log.

### Rendering pipeline
- Event-driven rendering: the render loop only runs in response to user input or incoming sync events — zero idle CPU
- Incremental dirty-region updates: only shapes that changed are re-rendered
- Viewport culling skips shapes outside the visible area
- Real-time path simplification (Douglas-Peucker / Visvalingam-Whyatt) reduces vertex count during drawing, not after
- Configurable frame throttling (120/60/15fps) trades smoothness for CPU headroom

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React, Vite, TypeScript, Two.js (vector rendering), Zustand, Tailwind CSS |
| Backend | Express 5, TypeScript, WebSocket (`ws`), JWT |
| Database | SQLite via Prisma ORM |
| Auth | WebAuthn passkeys (`@simplewebauthn`) |
| Infra | Docker, Caddy, GitHub Actions → GHCR → VPS |

## Getting started

### Prerequisites

- Node.js 22+
- pnpm

### Setup

```bash
git clone https://github.com/eugenioenko/skedoodle.git
cd skedoodle

# Install dependencies
cd client && pnpm install && cd ..
cd server && pnpm install && cd ..

# Configure environment
cp client/.env.example client/.env
cp server/.env.example server/.env

# Create database
cd server && npx prisma migrate dev && cd ..
```

### Run

```bash
# Terminal 1: server
cd server && pnpm run dev:http

# Terminal 2: client
cd client && pnpm dev
```

Open `http://localhost:5173`.

## Project structure

```
skedoodle/
├── client/                # React frontend (Vite)
│   └── src/
│       ├── canvas/        # Drawing tools, rendering, history/command system
│       ├── components/    # UI components
│       ├── services/      # API and storage clients
│       ├── stores/        # Zustand state stores
│       └── sync/          # WebSocket sync client and models
├── server/                # Express + WebSocket backend
│   └── src/
│       ├── routes/        # REST API (auth, sketches)
│       ├── services/      # Passkey verification
│       └── utils/         # JWT utilities
│   └── prisma/            # Schema and migrations
├── scripts/               # Docker build/run helpers
├── Dockerfile             # Multi-stage build (client + server)
├── docker-compose.yml     # Production deployment
└── Caddyfile              # Reverse proxy config
```

## Deployment

The app runs as a single Docker container behind a Caddy reverse proxy on a VPS.

### How it works

```
GitHub push to main
  → CI builds Docker image (multi-stage: Vite client + Node server)
  → Push to GitHub Container Registry (ghcr.io)
  → SSH into VPS, pull image, docker compose up -d
```

The Dockerfile produces one image that serves both the client (static files via Express) and the server (REST API + WebSocket). Prisma migrations run automatically on container startup.

### Infrastructure

- **VPS**: Single node running Docker
- **Reverse proxy**: Caddy (auto HTTPS, routes HTTP to port 3013 and WebSocket `/ws` to port 3014)
- **Networking**: Shared Docker network (`web`) connecting Caddy to app containers
- **Database**: SQLite file mounted as a Docker volume for persistence across deploys
- **CI/CD**: GitHub Actions — `ci.yml` validates builds on PRs, `deploy.yml` ships to production on merge to main

### Local Docker testing

```bash
./scripts/docker-build.sh   # Build image
./scripts/docker-run.sh     # Run at http://localhost:3013
```

See [deploying.md](deploying.md) for the full step-by-step VPS setup guide.

## License

MIT — see [LICENSE](LICENSE).
