import { MouseEvent } from "react";
import { colord, RgbaColor } from "colord";
import Two from "two.js";
import { Path } from "two.js/src/path";
import { Anchor } from "two.js/src/anchor";
import { Circle } from "two.js/src/shapes/circle";
import { Shape } from "two.js/src/shape";
import { create } from "zustand";
import { ColorHighlight, eventToClientPosition } from "../canvas.utils";
import { getDoodler } from "../doodler.client";
import { pushCreateCommand } from "../history.service";
import { useOptionsStore } from "../canvas.store";

export interface BezierState {
  path?: Path;
  preview?: Path;
  handleLine?: Path;
  anchorDots: Shape[];
  currentAnchor?: Anchor;
  isDragging: boolean;
  fillColor: RgbaColor;
  strokeColor: RgbaColor;
  strokeWidth: number;
  setPath: (path?: Path) => void;
  setFillColor: (fillColor: RgbaColor) => void;
  setStrokeWidth: (strokeWidth: number) => void;
  setStrokeColor: (strokeColor: RgbaColor) => void;
}

export const useBezierStore = create<BezierState>()((set) => ({
  path: undefined,
  preview: undefined,
  handleLine: undefined,
  anchorDots: [],
  currentAnchor: undefined,
  isDragging: false,
  fillColor: { r: 255, g: 255, b: 255, a: 1 },
  strokeWidth: 3,
  strokeColor: { r: 33, g: 33, b: 33, a: 1 },
  setPath: (path) => set(() => ({ path })),
  setFillColor: (fillColor) => set(() => ({ fillColor })),
  setStrokeWidth: (strokeWidth) => set(() => ({ strokeWidth })),
  setStrokeColor: (strokeColor) => set(() => ({ strokeColor })),
}));

// Subscribe to tool changes to clean up unfinished bezier paths
let toolSwitchCleanupInitialized = false;
function initToolSwitchCleanup() {
  if (toolSwitchCleanupInitialized) return;
  toolSwitchCleanupInitialized = true;
  useOptionsStore.subscribe((state, prevState) => {
    if (prevState.selectedTool === "bezier" && state.selectedTool !== "bezier") {
      finalizeBezier();
    }
  });
}

const CLOSE_THRESHOLD = 15; // surface units to snap to first anchor and close
const ANCHOR_DOT_RADIUS = 4;

function createAnchorDot(x: number, y: number): Circle {
  const dot = new Circle(x, y, ANCHOR_DOT_RADIUS);
  dot.fill = ColorHighlight;
  dot.noStroke();
  return dot;
}

function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function doBezierNext(e: MouseEvent<HTMLDivElement>): void {
  initToolSwitchCleanup();
  const doodler = getDoodler();
  const state = useBezierStore.getState();
  const position = doodler.zui.clientToSurface(eventToClientPosition(e));

  // Close detection: clicking near the first anchor closes the shape
  if (state.path && state.path.vertices.length >= 3) {
    const firstVert = state.path.vertices[0];
    if (distanceBetween(position, firstVert) < CLOSE_THRESHOLD) {
      state.path.closed = true;
      finalizeBezier();
      return;
    }
  }

  const { strokeColor, strokeWidth } = state;
  const lineColor = colord(strokeColor).toRgbString();

  if (!state.path) {
    // First point: create the path and helpers
    // Controls are RELATIVE to anchor position (Two.js default: anchor.relative = true)
    // Zero-length handles = corner point
    const anchor = new Two.Anchor(
      position.x, position.y,
      0, 0,
      0, 0,
      "M"
    );

    const path = new Path([anchor], false, false, true);
    path.cap = "round";
    path.join = "round";
    path.noFill().stroke = lineColor;
    path.linewidth = strokeWidth;
    doodler.canvas.add(path);

    // Preview line from last anchor to cursor
    const preview = new Path(
      [
        new Two.Anchor(position.x, position.y),
        new Two.Anchor(position.x, position.y),
      ],
      false,
      false
    );
    preview.noFill().stroke = ColorHighlight;
    preview.linewidth = 1;
    doodler.canvas.add(preview);

    // Handle visualization line (left handle - anchor - right handle)
    const handleLine = new Path(
      [
        new Two.Anchor(position.x, position.y),
        new Two.Anchor(position.x, position.y),
        new Two.Anchor(position.x, position.y),
      ],
      false,
      false
    );
    handleLine.noFill().stroke = ColorHighlight;
    handleLine.linewidth = 1;
    doodler.canvas.add(handleLine);

    // Anchor dot at the first point
    const dot = createAnchorDot(position.x, position.y);
    doodler.canvas.add(dot);

    useBezierStore.setState({
      path,
      preview,
      handleLine,
      anchorDots: [dot],
      currentAnchor: anchor,
      isDragging: true,
    });
  } else {
    // Subsequent points: add a curve anchor
    // Controls are RELATIVE offsets, zero = corner point
    const anchor = new Two.Anchor(
      position.x, position.y,
      0, 0,
      0, 0,
      "C"
    );

    state.path.vertices.push(anchor);

    // Anchor dot at the new point
    const dot = createAnchorDot(position.x, position.y);
    doodler.canvas.add(dot);

    useBezierStore.setState({
      anchorDots: [...state.anchorDots, dot],
      currentAnchor: anchor,
      isDragging: true,
    });
  }

  doodler.throttledTwoUpdate();
}

export function doBezierMove(e: MouseEvent<HTMLDivElement>): void {
  const state = useBezierStore.getState();
  if (!state.path) return;

  const doodler = getDoodler();
  const position = doodler.zui.clientToSurface(eventToClientPosition(e));

  if (state.isDragging && state.currentAnchor) {
    // Dragging: update symmetric control handles as RELATIVE offsets
    const ax = state.currentAnchor.x;
    const ay = state.currentAnchor.y;
    const dx = position.x - ax;
    const dy = position.y - ay;

    // Right handle = drag direction (outgoing toward next point)
    state.currentAnchor.controls.right.x = dx;
    state.currentAnchor.controls.right.y = dy;
    // Left handle = mirror (incoming from previous point)
    state.currentAnchor.controls.left.x = -dx;
    state.currentAnchor.controls.left.y = -dy;

    // Update handle visualization (these are absolute screen positions)
    if (state.handleLine) {
      const verts = state.handleLine.vertices;
      verts[0].x = ax - dx; // left handle position
      verts[0].y = ay - dy;
      verts[1].x = ax;      // anchor position
      verts[1].y = ay;
      verts[2].x = position.x; // right handle position
      verts[2].y = position.y;
    }
  } else {
    // Not dragging: update preview line from last anchor to cursor
    const lastVert = state.path.vertices[state.path.vertices.length - 1];
    if (state.preview && lastVert) {
      state.preview.vertices[0].x = lastVert.x;
      state.preview.vertices[0].y = lastVert.y;
      state.preview.vertices[1].x = position.x;
      state.preview.vertices[1].y = position.y;
    }
  }

  doodler.throttledTwoUpdate();
}

export function doBezierUp(): void {
  const state = useBezierStore.getState();
  if (!state.path) return;

  // Hide handle visualization by collapsing to a point
  if (state.handleLine && state.currentAnchor) {
    const ax = state.currentAnchor.x;
    const ay = state.currentAnchor.y;
    const verts = state.handleLine.vertices;
    verts[0].x = ax;
    verts[0].y = ay;
    verts[1].x = ax;
    verts[1].y = ay;
    verts[2].x = ax;
    verts[2].y = ay;
  }

  useBezierStore.setState({ isDragging: false });

  const doodler = getDoodler();
  doodler.throttledTwoUpdate();
}

export function finalizeBezier(): void {
  const state = useBezierStore.getState();
  const doodler = getDoodler();

  if (state.path && state.path.vertices.length >= 2) {
    // Apply fill color if the path is closed
    if (state.path.closed) {
      state.path.fill = colord(state.fillColor).toRgbString();
    }

    // Remove from canvas (it was added directly), then re-add via addDoodle
    doodler.canvas.remove(state.path);
    doodler.addDoodle({ shape: state.path, type: "bezier" });
    pushCreateCommand({
      shape: state.path,
      type: "bezier",
    });
  } else if (state.path) {
    // Only 1 point: discard
    doodler.canvas.remove(state.path);
  }

  // Clean up helper elements
  if (state.preview) doodler.canvas.remove(state.preview);
  if (state.handleLine) doodler.canvas.remove(state.handleLine);
  for (const dot of state.anchorDots) doodler.canvas.remove(dot);

  useBezierStore.setState({
    path: undefined,
    preview: undefined,
    handleLine: undefined,
    anchorDots: [],
    currentAnchor: undefined,
    isDragging: false,
  });

  doodler.throttledTwoUpdate();
}

export function cancelBezier(): void {
  const state = useBezierStore.getState();
  const doodler = getDoodler();

  // Remove everything from canvas
  if (state.path) doodler.canvas.remove(state.path);
  if (state.preview) doodler.canvas.remove(state.preview);
  if (state.handleLine) doodler.canvas.remove(state.handleLine);
  for (const dot of state.anchorDots) doodler.canvas.remove(dot);

  useBezierStore.setState({
    path: undefined,
    preview: undefined,
    handleLine: undefined,
    anchorDots: [],
    currentAnchor: undefined,
    isDragging: false,
  });

  doodler.throttledTwoUpdate();
}
