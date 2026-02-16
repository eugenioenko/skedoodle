# Skedoodle: Real-Time Collaboration with WebSocket

## Context

Phases 1-4 established an append-only command log as the single source of truth for canvas state. Every mutation (create, update, remove, undo, redo) is a `Command` appended to the log with a unique `id`, `ts`, and `uid`. This architecture is inherently collaboration-ready — the server becomes the authoritative ordering of commands, and clients simply send/receive commands over WebSocket.

No changes to the `Command` interface are needed.

---

## Phase 1: WebSocket Server

**Goal:** A minimal Node.js WebSocket server that manages sketch rooms and relays commands.

### New files

#### `server/package.json`
Node.js project with `ws` dependency. No socket.io — raw WebSocket is simpler for this use case and requires no client dependency (browser-native `WebSocket`).

#### `server/src/index.ts` — Entry point
- `WebSocketServer` on port 3003
- Parses JSON messages, delegates to room handlers

#### `server/src/protocol.ts` — Message types

Client → Server:
- `join { sketchId, user: { uid, name, color } }` — join a sketch room
- `command { command: Command }` — broadcast a command
- `cursor { x, y }` — cursor position (Phase 3)

Server → Client:
- `joined { commandLog: Command[], users: UserInfo[] }` — full state on join
- `command { command: Command }` — relayed from another user
- `user-joined { user }` / `user-left { uid }` — presence
- `cursor { uid, x, y }` — relayed cursor

#### `server/src/room.ts` — Room management
- `Map<string, Room>` where `Room = { commands: Command[], clients: Map<WebSocket, UserInfo> }`
- **On join:** add client, send full `commandLog`, broadcast `user-joined`
- **On command:** append to `room.commands`, broadcast to other clients (sender already applied locally)
- **On disconnect:** remove from room, broadcast `user-left`, clean up empty rooms after grace period

#### `server/src/persistence.ts` — Optional file persistence
- Debounce-write `room.commands` to `data/{sketchId}.json`
- Load on server start

---

## Phase 2: Client Sync Service

**Goal:** Connect to server, send local commands, receive and apply remote commands. Existing offline/localStorage behavior stays as fallback.

### New files

#### `src/services/sync.client.ts` — Core sync service

Key functions:
- `connect(sketchId, user)` — open WebSocket, send `join`, handle `joined` response
- `disconnect()` — clean close
- `sendCommand(cmd)` — send to server (no-op if offline)

**Reconciliation on join:** compare server log against local log by length. If server has more, replay the delta. If local has commands server doesn't (offline edits), re-send them.

#### `src/services/sync.store.ts` — Zustand store for connection state
```
isConnected, roomUsers, localUser
```

#### `src/services/identity.ts` — User identity
- Generate random name + color on first visit, persist in localStorage
- Returns `{ uid, name, color }`

### Modified files

#### `src/canvas/history.service.ts`
- **`pushCommand`**: add `syncService.sendCommand(cmd)` after existing setState
- **New `applyRemoteCommand(cmd)`**: appends to `commandLog` and calls `executeForward` but does NOT touch `sessionUndoStack/RedoStack` (other users' actions aren't locally undoable)

#### `src/canvas/history.store.ts`
- Replace hardcoded `LOCAL_USER_ID` with dynamic uid from identity service (fallback to `"local-user"` when offline)

#### `src/canvas/canvas.hook.tsx`
- After `loadDoodles()`, call `syncService.connect(sketchId, identity)`
- On cleanup, call `syncService.disconnect()`
- Remove commented-out socket.io code

---

## Phase 3: User Presence & Cursors

**Goal:** Show other users' cursors on the canvas and a user list.

### New files

#### `src/components/cursors.tsx` — Remote cursor overlay
- Reads `remoteCursors` from sync store
- Renders colored cursor arrows with name labels
- Converts surface coordinates to screen coordinates via ZUI
- `pointer-events-none` overlay on top of canvas

### Modified files

#### `src/canvas/canvas.service.ts`
- Add throttled cursor broadcast (~10fps) alongside existing `throttledCursorUpdate`

#### `src/services/sync.store.ts`
- Add `remoteCursors: Map<string, { x, y, name, color }>`
- Clear cursor entry on `user-left`

#### `src/components/app.tsx`
- Add `<RemoteCursors />` overlay inside the canvas area

#### `src/components/status-bar.tsx`
- Show connected user dots/avatars with tooltips

---

## Phase 4: Polish

**Goal:** Reconnection, offline resilience, edge cases.

### `src/services/sync.client.ts`
- **Reconnection:** exponential backoff (1s → 2s → 4s → ... → 30s max), reset on success
- **Offline fallback:** when disconnected, app works normally via localStorage. On reconnect, reconciliation uploads local-only commands

### `server/src/room.ts`
- **Dedup:** reject commands with duplicate `id` (prevents double-apply on reconnect)
- **Shape conflicts:** if User A removes a shape User B is editing, the update silently no-ops in `executeForward` (existing behavior)

### `src/components/status-bar.tsx`
- Connection indicator: green dot (connected), yellow (reconnecting), gray (offline)

---

## Data Flow

**Local draw:**
```
tool → pushCommand(cmd) → setState (log + undo stack)
                        → scheduleSave (localStorage)
                        → syncService.sendCommand(cmd) → WebSocket → server
                        → server broadcasts to other clients
```

**Remote draw:**
```
WebSocket receives cmd → applyRemoteCommand(cmd) → setState (log only, no undo stack)
                                                  → executeForward(cmd)
                                                  → scheduleSave (localStorage)
```

**Offline → Reconnect:**
```
disconnect → app works normally (localStorage)
reconnect  → join room → server sends full log
           → reconcile: replay server delta, re-send local-only commands
```

---

## Files Summary

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| 1 | `server/package.json`, `server/tsconfig.json`, `server/src/index.ts`, `server/src/room.ts`, `server/src/protocol.ts`, `server/src/persistence.ts` | — |
| 2 | `src/services/sync.client.ts`, `src/services/sync.store.ts`, `src/services/identity.ts` | `history.service.ts`, `history.store.ts`, `canvas.hook.tsx` |
| 3 | `src/components/cursors.tsx` | `canvas.service.ts`, `sync.store.ts`, `app.tsx`, `status-bar.tsx` |
| 4 | — | `sync.client.ts`, `server/src/room.ts`, `status-bar.tsx` |
