# Skedoodle: Command Log Architecture Refactor

## Context

Skedoodle is being prepared for real-time collaboration. The current architecture stores canvas state as a snapshot (`doodles: Doodle[]`) with undo/redo as a side effect. We're refactoring to make an **append-only command log** the source of truth, which naturally enables:

- Real-time collaboration (broadcast commands to peers)
- Per-user undo/redo (each user tracks their own session)
- Time travel (replay log to any point)
- Event sourcing readiness (append-only log → future database)
- Sketch management (each sketch = a command log)

---

## Phase 1: Refactor Command Format

**Goal**: Replace `HistoryCommand` with a simplified, network-ready `Command` type. Undo/redo mechanism stays as dual stacks. App behavior is identical after this phase.

### 1.1 Define new `Command` type

**File**: `src/canvas/history.store.ts`

Replace `HistoryCommand` and `PropertyChange` with:

```typescript
export interface Command {
  id: string;                      // crypto.randomUUID()
  ts: number;                      // Date.now()
  uid: string;                     // hardcoded "local-user" for now
  type: "create" | "update" | "remove";
  shapeId: string;                 // target shape ID
  data?: SerializedDoodle;         // only for "create" (and "remove" temporarily for undo)
  changes?: Record<string, any>;   // only for "update" — new values only
}
```

Key changes from `HistoryCommand`:
- Drop `label` — derive in UI from `type` + `data?.t`
- Drop `PropertyChange[]` array — use `Record<string, any>` for new values
- Drop `oldValue` from updates — undo will capture current values at undo time
- Add `id`, `ts`, `uid` metadata fields
- `remove` carries `data` temporarily (Phase 1 only, for local undo)

### 1.2 Create command factory

**File**: `src/canvas/history.store.ts`

```typescript
const LOCAL_USER_ID = "local-user";

export function createCommand(
  type: Command["type"],
  shapeId: string,
  opts?: { data?: SerializedDoodle; changes?: Record<string, any> }
): Command {
  return {
    id: crypto.randomUUID(),
    ts: Date.now(),
    uid: LOCAL_USER_ID,
    type,
    shapeId,
    ...opts,
  };
}
```

### 1.3 Update `history.service.ts`

- `executeForward`: use `cmd.data` instead of `cmd.doodle`, `cmd.shapeId` instead of `cmd.doodle.id`, `Object.entries(cmd.changes)` instead of `PropertyChange[]` loop
- `executeInverse`: same field changes; for updates, use a module-level `inverseData` Map to store old values keyed by command ID (captured at push time)
- Update public API:
  - `pushCreateCommand(doodle: Doodle)` — drop `label` param
  - `pushRemoveCommand(doodle: Doodle)` — drop `label` param
  - `pushUpdateCommand(shapeId, newValues, oldValues)` — new function replacing direct `pushCommand` for updates

### 1.4 Update all tool call sites

Mechanical changes — drop `label` argument:

| File | Before | After |
|------|--------|-------|
| `tools/brush.tool.ts` | `pushCreateCommand("Draw brush stroke", {...})` | `pushCreateCommand({...})` |
| `tools/shape.tool.ts` | `pushCreateCommand("Draw rectangle", {...})` | `pushCreateCommand({...})` |
| `tools/line.tool.ts` | `pushCreateCommand("Draw line", {...})` | `pushCreateCommand({...})` |
| `tools/text.tool.ts` | `pushCreateCommand("Add text", {...})` | `pushCreateCommand({...})` |
| `tools/bezier.tool.ts` | `pushCreateCommand("Draw bezier curve", {...})` | `pushCreateCommand({...})` |
| `tools/eraser.tool.ts` | `pushRemoveCommand("Delete shape", doodle)` | `pushRemoveCommand(doodle)` |
| `tools/pointer.tool.ts` | `pushCommand({type:"update", label, ...})` | `pushUpdateCommand(shapeId, newValues, oldValues)` |
| `components/properties.tsx` | `pushCommand({type:"update", ...})` with `PropertyChange[]` | `pushUpdateCommand(shapeId, newValues, oldValues)` |

### 1.5 Update History UI

**File**: `components/history.tsx`

- Replace `HistoryCommand` → `Command`
- Derive labels: `commandLabel(cmd)` → returns `"Create brush"`, `"Update shape"`, `"Remove shape"` etc.

### 1.6 Update store types

**File**: `history.store.ts` — change `HistoryState` stacks from `HistoryCommand[]` to `Command[]`

**Verification**: All tools work, undo/redo works, history panel shows derived labels, TypeScript compiles clean.

---

## Phase 2: Command Log as Source of Truth

**Goal**: Introduce an append-only `commandLog: Command[]` as the canonical state. Undo appends inverse commands. Save/load switches from `SerializedDoodle[]` to `Command[]`.

### 2.1 Create `useCommandLogStore`

**File**: `src/canvas/history.store.ts`

```typescript
export interface CommandLogState {
  commandLog: Command[];
  sessionUndoStack: string[];    // command IDs from this session
  sessionRedoStack: Command[];   // undone commands available for redo
  appendCommand: (command: Command) => void;
  setCommandLog: (commands: Command[]) => void;
  clearSession: () => void;
}
```

### 2.2 Rewrite undo/redo logic

**File**: `src/canvas/history.service.ts`

- **`pushCommand(cmd)`**: appends to `commandLog` + `sessionUndoStack`, clears `sessionRedoStack`, calls `executeForward`, triggers debounced save
- **`undo()`**: pops last ID from `sessionUndoStack`, creates an **inverse command** (create→remove, remove→create, update→update with previous values), appends inverse to `commandLog`, moves original to `sessionRedoStack`
- **`redo()`**: pops from `sessionRedoStack`, re-creates command with new `id`/`ts`, appends to `commandLog` + `sessionUndoStack`

Inverse command creation:
- `create` → `remove` (just needs `shapeId`)
- `remove` → `create` (serialize the live doodle before removing, store in `data`)
- `update` → `update` (capture current shape values from `preUpdateSnapshots` map before applying)

The `preUpdateSnapshots` map (keyed by command ID → old values) replaces the Phase 1 `inverseData` map. `pushUpdateCommand` still accepts `oldValues` from callers.

### 2.3 Export `executeForward`

Make `executeForward` a public export so `doodler.loadDoodles()` can use it for replay.

### 2.4 Update save/load in `doodler.client.ts`

- **`saveDoodles()`**: saves `commandLog` (Command[]) instead of `SerializedDoodle[]`
- **`loadDoodles()`**: loads `Command[]`, sets `commandLog`, replays via `executeForward`
- **Legacy migration**: detect old format (`SerializedDoodle[]`), convert each to a `create` command, save in new format, delete old key

### 2.5 Debounced auto-save

**File**: `src/canvas/history.service.ts`

Auto-save command log to localStorage on every `pushCommand`/`undo`/`redo` (debounced 1s).

### 2.6 Update UI components

- `panel.tsx`: read `sessionUndoStack.length` / `sessionRedoStack.length` for button state
- `history.tsx`: show full `commandLog` (not just undo stack)
- `canvas.hook.tsx`: call `clearSession()` on unmount

### 2.7 Remove old `useHistoryStore`

Delete the old dual-stack store once all references are migrated.

**Verification**: All tools work, undo appends inverse commands visible in history, redo re-appends, auto-save persists command log, loading replays correctly, legacy data migrates.

---

## Phase 3: Sketches Route and Management

**Goal**: Add `/sketches` page for listing, creating, and deleting sketches. Structured storage with metadata.

### 3.1 Extend storage service

**File**: `src/services/storage.client.ts`

Add sketch-specific helpers:
- `getSketchCommands(id)` / `setSketchCommands(id, commands)`
- `getSketchMeta(id)` / `setSketchMeta(id, meta)` — `SketchMeta: { id, name, createdAt, updatedAt }`
- `deleteSketch(id)` — removes both commands and meta
- `getAllSketchIds()` — scans localStorage for meta keys
- `remove(key)` — general delete helper

Storage key scheme:
- `sketches:{id}:commands` → `Command[]`
- `sketches:{id}:meta` → `SketchMeta`

### 3.2 Update doodler save/load

Use the new `getSketchCommands` / `setSketchCommands` instead of generic `get`/`set`.

### 3.3 Create Sketches page

**File**: `src/components/sketches-page.tsx` (new)

- Grid/list of saved sketches with name, last modified date
- "New Sketch" button → generates UUID, navigates to `/sketch/:id`
- Delete button per sketch
- Link to open each sketch

### 3.4 Update routing

**File**: `src/main.tsx`

```
/            → <SketchesPage />
/sketches    → <SketchesPage />
/sketch/:id  → <App />
```

### 3.5 Update `app.tsx`

- Remove `sketchId` fallback to `"local"` — require an ID
- Redirect to `/sketches` if no ID provided

### 3.6 Update panel sidebar sketches list

Rewrite existing `<Sketches />` component to use new storage format (`getAllSketchIds` + `getSketchMeta`).

**Verification**: `/sketches` shows all sketches, create/delete/open works, auto-save uses new storage keys, legacy migration works, root path shows sketches page.

---

## Phase 4: Canvas History Timeline (Time Travel)

**Goal**: Add a timeline slider to scrub through command history. Read-only preview with branch capability.

### 4.1 Create timeline state

**File**: `src/canvas/history.store.ts`

```typescript
export interface TimelineState {
  isTimeTraveling: boolean;
  timelinePosition: number;  // 0 = blank canvas, N = all commands
}
```

### 4.2 Implement replay engine

**File**: `src/canvas/history.service.ts`

- `enterTimeTravelMode()` — set position to commandLog length
- `exitTimeTravelMode()` — restore full canvas, exit mode
- `scrubTo(position)` — clear canvas, replay commands 0..position via `executeForward`

### 4.3 Block editing in time travel mode

**File**: `src/canvas/canvas.service.ts`

Guard `doMouseDown` and `doKeyDown` — return early if `isTimeTraveling`. Allow Escape to exit.

### 4.4 Create Timeline UI

**File**: `src/components/timeline.tsx` (new)

- Slider (rc-slider) from 0 to commandLog.length
- Step info: command type, timestamp, user ID
- "Branch from here" button
- "Exit Timeline" button
- Integrate into the panel below History

### 4.5 Branch from here

- Copies commands 0..position to a new sketch (new UUID, new metadata)
- Navigates to the new sketch

### 4.6 Read-only mode indicator

**File**: `src/components/app.tsx`

Show a banner when time-traveling: "Time Travel Mode (read-only) — Press Escape to exit"

**Verification**: Timeline slider scrubs through history, canvas is read-only, branch creates new sketch with truncated log, exit restores full state.

---

## Files Modified Per Phase

| Phase | Files Modified | Files Created |
|-------|---------------|---------------|
| 1 | `history.store.ts`, `history.service.ts`, `brush.tool.ts`, `shape.tool.ts`, `line.tool.ts`, `text.tool.ts`, `bezier.tool.ts`, `eraser.tool.ts`, `pointer.tool.ts`, `properties.tsx`, `history.tsx` | — |
| 2 | `history.store.ts`, `history.service.ts`, `doodler.client.ts`, `canvas.hook.tsx`, `panel.tsx`, `history.tsx` | — |
| 3 | `storage.client.ts`, `doodler.client.ts`, `history.service.ts`, `main.tsx`, `app.tsx`, `sketches.tsx`, `properties.tsx` | `sketches-page.tsx` |
| 4 | `history.store.ts`, `history.service.ts`, `canvas.service.ts`, `app.tsx`, `properties.tsx` | `timeline.tsx` |

## Risk Areas

1. **Undo of remove**: inverse command needs the shape's serialized data — capture from live doodle before removal
2. **Auto-save performance**: debounce at 1s; future improvement: incremental append
3. **Legacy migration**: existing `SerializedDoodle[]` auto-converts to `Command[]` on first load
4. **Time travel replay perf**: full replay on each scrub could be slow for large canvases — debounce slider, consider caching snapshots every N commands
