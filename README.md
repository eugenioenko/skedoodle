# Skedoodle: Real-Time Collaborative Sketching

**Skedoodle** is a real-time, interactive sketching and drawing tool designed for seamless collaboration. It empowers teams and individuals to brainstorm, visualize ideas, and co-create on a shared digital canvas.

## Features

- **Real-time Collaboration**: Multiple users can draw, erase, and edit on the same board simultaneously, with changes reflected instantly via WebSockets.
- **Passkey Authentication**: Passwordless login using WebAuthn/Passkeys for secure, modern authentication.
- **Rich Drawing Tools**: Freehand sketching, shapes (rectangles, circles, lines), eraser, and more.
- **Customizable Brush**: Adjust brush size and color.
- **Vector Graphics**: Two.js for smooth, scalable vector rendering.
- **Persistent Storage**: Sketches are stored in SQLite via Prisma ORM.
- **Time Travel**: Scrub through drawing history and branch from any point.
- **Undo/Redo**: Session-scoped undo/redo with inverse command generation.

## Tech Stack

**Frontend** (`client/`):
- Vite, React, TypeScript
- Two.js (2D vector rendering)
- Tailwind CSS, Zustand (state management)
- `@simplewebauthn/browser` (passkey client)

**Backend** (`server/`):
- Express 5, TypeScript
- Prisma + SQLite
- WebSocket (`ws`) for real-time sync
- `@simplewebauthn/server` (passkey verification)
- JWT for session tokens

## Project Structure

```
skedoodle/
├── client/               # React frontend (Vite)
│   ├── src/
│   │   ├── canvas/       # Core canvas logic, tools, rendering
│   │   ├── components/   # React UI components
│   │   ├── services/     # API clients (storage, sync, auth)
│   │   └── stores/       # Zustand stores
│   └── .env.example
├── server/               # Express + WebSocket backend
│   ├── src/
│   │   ├── routes/       # REST API routes (auth, sketches)
│   │   ├── services/     # Passkey service
│   │   └── utils/        # JWT auth utilities
│   ├── prisma/           # Schema and migrations
│   └── .env.example
└── solomon/              # Reference implementation (Prisma + Express + Passkeys)
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Installation

```bash
git clone https://github.com/eugenioenko/skedoodle.git
cd skedoodle
```

Install dependencies for both client and server:

```bash
cd client && pnpm install && cd ..
cd server && pnpm install && cd ..
```

### Environment Setup

Copy the example env files and adjust values as needed:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

**Server** (`server/.env`):
| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | SQLite database path | `file:./dev.db` |
| `JWT_SECRET` | Secret for signing JWT tokens | `change-me-to-a-secure-random-string` |
| `HTTP_PORT` | Express HTTP server port | `3013` |
| `WS_PORT` | WebSocket server port | `3014` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `RP_ID` | WebAuthn Relying Party ID | `localhost` |
| `RP_NAME` | WebAuthn Relying Party name | `Skedoodle` |
| `RP_ORIGIN` | WebAuthn expected origin | `http://localhost:5173` |

**Client** (`client/.env`):
| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Base URL for the REST API | `http://localhost:3013/api` |
| `VITE_WS_URL` | WebSocket server URL | `ws://localhost:3014` |

### Database Setup

Run Prisma migrations to create the database:

```bash
cd server
npx prisma migrate dev
```

### Running Locally

Start the server:
```bash
cd server
pnpm run dev:http
```

Start the client (in a new terminal):
```bash
cd client
pnpm dev
```

The app will be available at `http://localhost:5173`.

## Usage

1. **Register**: Create an account using a passkey (WebAuthn).
2. **Create a Sketch**: Click "New Sketch" on the sketches page.
3. **Draw**: Select tools from the toolbar and draw on the canvas.
4. **Collaborate**: Share the sketch URL with others - they'll see your cursor and drawings in real-time.

## License

Distributed under the MIT License. See `LICENSE` for more information.
