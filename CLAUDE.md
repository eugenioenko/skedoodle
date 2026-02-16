# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Skedoodle is a real-time collaborative sketching/drawing web app built with React, TypeScript, Two.js (2D vector graphics), and Zustand for state management. It renders an infinite SVG canvas with pan/zoom support.

## Commands

- **Dev server**: `pnpm dev` (Vite, default port 5173)
- **Build**: `pnpm build` (runs `tsc -b && vite build`)
- **Lint**: `pnpm lint` (ESLint with TypeScript rules)
- **Preview prod build**: `pnpm preview`
- No test framework is configured.

## Architecture

### Path alias
`@/*` maps to `src/*` (configured in both tsconfig and vite).

### Canvas system (`src/canvas/`)
- **doodler.client.ts** — `Doodler` class: central canvas manager wrapping Two.js and ZUI (pan/zoom). Handles initialization, shape lifecycle, persistence, and throttled rendering.
- **canvas.comp.tsx** — React component that mounts Two.js into the DOM via `useCanvas` hook.
- **canvas.hook.tsx** — Initializes Two.js instance, attaches event listeners, manages resize.
- **canvas.service.ts** — Event dispatcher: routes mouse/touch events to the currently active tool.
- **canvas.utils.ts** — Coordinate conversion (screen ↔ canvas space), hit-testing helpers.
- **doodle.utils.ts** — Serialization/deserialization of doodles for localStorage persistence.

### Tool system (`src/canvas/tools/`)
Each tool exports `doStart()`, `doMove()`, `doUp()` functions that receive mouse/touch coordinates. Tools read/write Zustand stores for their settings and call `doodler.throttledTwoUpdate()` to batch renders.

Tools: brush, shape, eraser, pointer (selection), drag (pan), zoom, bezier.

### State management (Zustand stores in `src/canvas/canvas.store.ts`)
- **useCanvasStore** — runtime canvas state (doodler instance, cursor, doodles array)
- **useOptionsStore** — persisted global options (selected tool, canvas color, throttle rate, panel visibility)
- **useBrushStore** — persisted brush settings (color, width, tolerance, stabilizer, simplification algo)
- **usePointerStore** — selection state (selected paths, highlighted shape, outlines)
- **useZoomStore** — current zoom level

All persisted stores use Zustand's `persist` middleware backed by localStorage.

### UI components (`src/components/`)
- **app.tsx** — top-level layout: ToolOptions bar → Canvas + Toolbar + Panel → StatusBar
- **toolbar.tsx** — tool selection sidebar
- **panel.tsx** — right-side panel (properties editor, layers)
- **properties.tsx** — edits selected shape properties (position, rotation, scale, colors)
- **components/ui/** — reusable primitives (button, popover, tooltip, color-input, slide-input, toasts, dropdown)

### Routing (`src/main.tsx`)
React Router v7 with two routes: `/` (local sketch) and `/sketch/:id` (collaborative sketch by ID).

### Path simplification (`src/utils/`)
Multiple algorithms for reducing brush stroke vertices: Douglas-Peucker, triangle-area, angle-based. Configurable via brush store `simplifyAlgo` and `tolerance`.

## Key Patterns

- **Event flow**: Canvas component → canvas.service dispatcher → active tool's doStart/doMove/doUp → Zustand store updates + Two.js mutations → throttled render
- **Performance**: 16ms throttled cursor updates (~60fps), debounced resize (250ms), point stabilization to reduce vertices, path simplification on stroke completion
- **Touch support**: Touch events are converted to mouse-like events in the canvas service layer
- **Tabler icons import**: Aliased to `@tabler/icons-react/dist/esm/icons/index.mjs` in vite.config.ts for tree-shaking

## TypeScript

Strict mode enabled with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`. Target ES2020.
