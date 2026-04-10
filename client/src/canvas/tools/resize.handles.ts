import { Circle } from "two.js/src/shapes/circle";
import { Rectangle } from "two.js/src/shapes/rectangle";
import { Shape } from "two.js/src/shape";
import { Vector } from "two.js/src/vector";
import Two from "two.js";
import { ColorHighlight } from "../canvas.utils";
import { getDoodler } from "../doodler.client";
import { pushUpdateCommand } from "../history.service";

// ── Types ──────────────────────────────────────────────────────────

type HandleId = "nw" | "ne" | "sw" | "se";

interface SurfaceBBox {
  cx: number;
  cy: number;
  width: number;
  height: number;
}

interface ScaleXY {
  x: number;
  y: number;
}

interface ResizeDragState {
  activeHandle: HandleId;
  anchor: Vector;
  startCorner: { x: number; y: number };
  startBBox: SurfaceBBox;
  shapes: Shape[];
  startScales: Map<string, ScaleXY>;
  startTranslations: Map<string, Vector>;
  outlines: Map<string, Rectangle>;
  startOutlinePositions: Map<string, Vector>;
  startOutlineWidths: Map<string, number>;
  startOutlineHeights: Map<string, number>;
}

// ── Constants ──────────────────────────────────────────────────────

const HANDLE_RADIUS = 5;
const HIT_RADIUS = 10;
const OUTLINE_SCALE = 1.01; // must match makeBorder's rect.scale in pointer.tool.ts

const OPPOSITE_HANDLE: Record<HandleId, HandleId> = {
  nw: "se",
  ne: "sw",
  sw: "ne",
  se: "nw",
};

const ALL_HANDLES: HandleId[] = ["nw", "ne", "sw", "se"];

// ── Module state ───────────────────────────────────────────────────

const handles: Map<HandleId, Circle> = new Map();
let dragState: ResizeDragState | null = null;

// ── Helpers ────────────────────────────────────────────────────────

function distanceSq(ax: number, ay: number, bx: number, by: number): number {
  return (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
}


function computeSelectionBBox(shapes: Shape[]): SurfaceBBox | null {
  if (shapes.length === 0) return null;
  const doodler = getDoodler();

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const shape of shapes) {
    const item = (shape as any).getBoundingClientRect(false);
    const topLeft = doodler.zui.clientToSurface({
      x: item.left,
      y: item.top,
    });
    const bottomRight = doodler.zui.clientToSurface({
      x: item.right,
      y: item.bottom,
    });
    minX = Math.min(minX, topLeft.x);
    minY = Math.min(minY, topLeft.y);
    maxX = Math.max(maxX, bottomRight.x);
    maxY = Math.max(maxY, bottomRight.y);
  }

  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function handlePosition(
  id: HandleId,
  bbox: SurfaceBBox
): { x: number; y: number } {
  const hw = (bbox.width * OUTLINE_SCALE) / 2;
  const hh = (bbox.height * OUTLINE_SCALE) / 2;
  switch (id) {
    case "nw":
      return { x: bbox.cx - hw, y: bbox.cy - hh };
    case "ne":
      return { x: bbox.cx + hw, y: bbox.cy - hh };
    case "sw":
      return { x: bbox.cx - hw, y: bbox.cy + hh };
    case "se":
      return { x: bbox.cx + hw, y: bbox.cy + hh };
  }
}

function createHandleCircle(x: number, y: number): Circle {
  const doodler = getDoodler();
  const scale = doodler.zui.scale;
  const r = HANDLE_RADIUS / scale;
  // Use two.makeCircle so the shape is registered with the renderer
  // (shapes created via `new Circle()` aren't tracked for SVG removal)
  const dot = doodler.two.makeCircle(x, y, r) as unknown as Circle;
  dot.fill = "#ffffff";
  dot.stroke = ColorHighlight;
  dot.linewidth = 1.5 / scale;
  (dot as any).isHighlight = true;
  doodler.canvas.add(dot);
  return dot;
}

// ── Handle lifecycle ───────────────────────────────────────────────

export function showResizeHandles(shapes: Shape[]): void {
  hideResizeHandles();

  const bbox = computeSelectionBBox(shapes);
  if (!bbox) return;

  for (const id of ALL_HANDLES) {
    const pos = handlePosition(id, bbox);
    handles.set(id, createHandleCircle(pos.x, pos.y));
  }
}

export function hideResizeHandles(): void {
  for (const dot of handles.values()) {
    dot.remove();
  }
  handles.clear();
}

export function updateResizeHandleScales(shapes: Shape[]): void {
  if (handles.size === 0) return;
  showResizeHandles(shapes);
}

// ── Hit testing ────────────────────────────────────────────────────

export function hitTestResizeHandle(surfacePos: {
  x: number;
  y: number;
}): HandleId | null {
  if (handles.size === 0) return null;
  const doodler = getDoodler();
  const hitRadiusSurface = HIT_RADIUS / doodler.zui.scale;
  const hitRadiusSq = hitRadiusSurface * hitRadiusSurface;

  for (const [id, circle] of handles) {
    if (
      distanceSq(
        surfacePos.x,
        surfacePos.y,
        circle.translation.x,
        circle.translation.y
      ) <= hitRadiusSq
    ) {
      return id;
    }
  }
  return null;
}

// ── Resize drag ────────────────────────────────────────────────────

export function startResize(
  handle: HandleId,
  shapes: Shape[],
  outlines: Map<string, Rectangle>
): void {
  const bbox = computeSelectionBBox(shapes);
  if (!bbox) return;

  const oppositeId = OPPOSITE_HANDLE[handle];
  const anchorPos = handlePosition(oppositeId, bbox);
  const anchor = new Vector(anchorPos.x, anchorPos.y);

  const startCorner = handlePosition(handle, bbox);

  const startScales = new Map<string, ScaleXY>();
  const startTranslations = new Map<string, Vector>();
  for (const shape of shapes) {
    const s = shape.scale;
    const sx = typeof s === "number" ? s : (s as any).x ?? 1;
    const sy = typeof s === "number" ? s : (s as any).y ?? 1;
    startScales.set(shape.id, { x: sx, y: sy });
    startTranslations.set(shape.id, shape.translation.clone());
  }

  const startOutlinePositions = new Map<string, Vector>();
  const startOutlineWidths = new Map<string, number>();
  const startOutlineHeights = new Map<string, number>();
  for (const [id, rect] of outlines) {
    startOutlinePositions.set(id, rect.translation.clone());
    startOutlineWidths.set(id, rect.width);
    startOutlineHeights.set(id, rect.height);
  }

  dragState = {
    activeHandle: handle,
    anchor,
    startCorner,
    startBBox: { ...bbox },
    shapes,
    startScales,
    startTranslations,
    outlines,
    startOutlinePositions,
    startOutlineWidths,
    startOutlineHeights,
  };
}

export function doResize(
  surfacePos: { x: number; y: number },
  shiftKey: boolean = false
): void {
  if (!dragState) return;
  const doodler = getDoodler();
  const {
    anchor,
    startCorner,
    startBBox,
    shapes,
    startScales,
    startTranslations,
    outlines,
    startOutlinePositions,
    startOutlineWidths,
    startOutlineHeights,
  } = dragState;

  // Compute separate X/Y scale factors from mouse position relative to anchor
  const spanX = startCorner.x - anchor.x;
  const spanY = startCorner.y - anchor.y;

  let sfx: number;
  let sfy: number;

  if (Math.abs(spanX) < 0.001 || Math.abs(spanY) < 0.001) return;

  sfx = (surfacePos.x - anchor.x) / spanX;
  sfy = (surfacePos.y - anchor.y) / spanY;

  // Shift key: uniform scaling (use the larger factor)
  if (shiftKey) {
    const uniform = Math.max(Math.abs(sfx), Math.abs(sfy));
    sfx = uniform * Math.sign(sfx || 1);
    sfy = uniform * Math.sign(sfy || 1);
  }

  // Clamp to prevent inversion
  sfx = Math.max(0.05, sfx);
  sfy = Math.max(0.05, sfy);

  // Scale shapes and reposition relative to anchor
  for (const shape of shapes) {
    const origScale = startScales.get(shape.id) ?? { x: 1, y: 1 };
    const origTrans = startTranslations.get(shape.id);
    if (!origTrans) continue;

    const newSx = origScale.x * sfx;
    const newSy = origScale.y * sfy;
    if (newSx === newSy) {
      shape.scale = newSx;
    } else {
      shape.scale = new Two.Vector(newSx, newSy);
    }
    shape.translation.x = anchor.x + (origTrans.x - anchor.x) * sfx;
    shape.translation.y = anchor.y + (origTrans.y - anchor.y) * sfy;
  }

  // Scale outlines relative to anchor
  for (const [id, rect] of outlines) {
    const origPos = startOutlinePositions.get(id);
    const origW = startOutlineWidths.get(id);
    const origH = startOutlineHeights.get(id);
    if (!origPos || origW === undefined || origH === undefined) continue;

    rect.translation.x = anchor.x + (origPos.x - anchor.x) * sfx;
    rect.translation.y = anchor.y + (origPos.y - anchor.y) * sfy;
    rect.width = origW * sfx;
    rect.height = origH * sfy;
  }

  // Reposition handles from stored start bbox
  for (const id of ALL_HANDLES) {
    const circle = handles.get(id);
    if (!circle) continue;
    const startPos = handlePosition(id, startBBox);
    circle.translation.x = anchor.x + (startPos.x - anchor.x) * sfx;
    circle.translation.y = anchor.y + (startPos.y - anchor.y) * sfy;
  }

  doodler.throttledTwoUpdate();
}

export function endResize(): void {
  if (!dragState) return;
  const { shapes, startScales, startTranslations } = dragState;

  // Push undo commands
  for (const shape of shapes) {
    const origScale = startScales.get(shape.id);
    const origTrans = startTranslations.get(shape.id);
    if (!origScale || !origTrans) continue;

    // Restore original scale format for undo
    const oldScale =
      origScale.x === origScale.y
        ? origScale.x
        : new Two.Vector(origScale.x, origScale.y);

    pushUpdateCommand(
      shape.id,
      {
        scale: shape.scale,
        "translation.x": shape.translation.x,
        "translation.y": shape.translation.y,
      },
      {
        scale: oldScale,
        "translation.x": origTrans.x,
        "translation.y": origTrans.y,
      }
    );
  }

  // Rebuild handles from fresh bbox
  showResizeHandles(shapes);

  dragState = null;
}

export function isResizing(): boolean {
  return dragState !== null;
}

// ── Move support ───────────────────────────────────────────────────

const handleMoveOrigins: Map<HandleId, Vector> = new Map();

export function storeHandleOriginsForMove(): void {
  handleMoveOrigins.clear();
  for (const [id, circle] of handles) {
    handleMoveOrigins.set(id, circle.translation.clone());
  }
}

export function moveHandlesByDelta(dx: number, dy: number): void {
  for (const [id, circle] of handles) {
    const origin = handleMoveOrigins.get(id);
    if (origin) {
      circle.translation.x = origin.x + dx;
      circle.translation.y = origin.y + dy;
    }
  }
}
