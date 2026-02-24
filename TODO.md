# TODO — Feature Roadmap

## Brush Tool

- [ ] **Pressure sensitivity** — switch canvas events from `MouseEvent` to `PointerEvent` to read `e.pressure`; map pressure to stroke width for natural stylus feel
- [ ] **Live simplification** — apply a lightweight simplification pass every N vertices during drawing so the in-progress stroke appearance matches the final result (currently simplification only runs on mouseup, causing a visible shape change)
- [ ] **Opacity slider** — add a dedicated opacity control in the brush toolbar bar (affecting `strokeColor.a`) instead of requiring users to dig into the color picker
- [ ] **Zoom-aware stabilizer** — scale the stabilizer lag by `1 / zui.scale` so the effective smoothing is consistent regardless of zoom level
- [ ] **Stroke catch-up on mouseup** — after mouseup, continue lerping `drawPosition` toward the release point over a few animation frames so the stroke fully reaches the cursor instead of ending at the lag position
- [ ] **Fix mouseout during drawing** — SVG rendering fires `mouseleave` when the cursor passes over child shapes, which can silently interrupt strokes; terminate strokes only on `mouseup` outside the window
- [ ] **Click-only dot (no drag)** — when the user clicks without moving, the start-point circle is removed on mouseup but no path is created, leaving no mark; handle this as a minimum-size dot stroke
- [ ] **Simplify algo UI** — consider collapsing the four algorithm buttons into a simpler choice (e.g. "Smooth" vs "Accurate") since the technical names (Visvalingam-Whyatt, perpendicular distance) are not meaningful to most users

## Drawing Tools

- [ ] **Eyedropper tool** — sample color from any shape on the canvas

## Editing & Transform

- [ ] **Resize handles** — scale shapes via drag handles on the selection bounding box
- [ ] **Rotation handle** — rotate shapes via handle above the selection bounding box
- [ ] **Selection marquee** — drag on empty space with pointer tool to select shapes within a rectangle

## Shape Tools Improvements

- [ ] **Shift-constrain for rectangle** — hold Shift to draw perfect squares
- [ ] **Fill bucket tool** — click a shape to change its fill color to the active color

## Toolbar & UI

- [ ] **Keyboard shortcuts** — implement the shortcuts shown in tooltips (H, P, E, B, R, Z) and add new ones
- [ ] **Toolbar sub-menus** — group related shape tools (rect, ellipse, polygon) under one toolbar slot

## Quality of Life

- [ ] **Snap to grid** — optional grid overlay with shape snapping
- [ ] **Align tools** — align/distribute selected shapes (left, center, right, top, middle, bottom)
- [ ] **Z-order controls** — bring to front, send to back, move up/down for selected shapes
- [ ] **Export** — export canvas as PNG or SVG
