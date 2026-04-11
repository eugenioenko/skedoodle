import { Circle } from "two.js/src/shapes/circle";
import { Path } from "two.js/src/path";
import { Rectangle } from "two.js/src/shapes/rectangle";
import { Shape } from "two.js/src/shape";
import { Vector } from "two.js/src/vector";
import Two from "two.js";
import { ColorHighlight } from "../canvas.utils";
import { getDoodler } from "../doodler.client";
import { pushUpdateCommand } from "../history.service";

// ── Types ──────────────────────────────────────────────────────────

type HandleId = "nw" | "ne" | "sw" | "se" | "rotate";

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

interface RotateDragState {
  center: Vector;
  startAngle: number;
  shapes: Shape[];
  startRotations: Map<string, number>;
  startTranslations: Map<string, Vector>;
  outlines: Map<string, Rectangle>;
}

// ── Constants ──────────────────────────────────────────────────────

const HANDLE_RADIUS = 5;
const HIT_RADIUS = 10;
const OUTLINE_SCALE = 1.01; // must match makeBorder's rect.scale in pointer.tool.ts
const ROTATE_OFFSET = 25; // px distance of rotate handle above top edge

const OPPOSITE_HANDLE: Record<string, HandleId> = {
  nw: "se",
  ne: "sw",
  sw: "ne",
  se: "nw",
};

const ALL_HANDLES: HandleId[] = ["nw", "ne", "sw", "se"];

// ── Module state ───────────────────────────────────────────────────

const handles: Map<HandleId, Circle> = new Map();
let rotateLine: Shape | null = null;
let dragState: ResizeDragState | null = null;
let rotateDragState: RotateDragState | null = null;

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Creates a scale Vector compatible with the shape's internal Vector class.
 * Shapes created via `two.make*()` use the bundled Two.Vector,
 * while shapes created via `new Path()` use the source-imported Vector.
 * Using the wrong one fails the `instanceof Vector` check in Two.js's _update.
 */
const worldSpaceTypes = new Set(["line", "arrow", "bezier"]);
function makeScaleVector(shape: Shape, x: number, y: number): Vector {
  if (worldSpaceTypes.has((shape as any).doodleType)) {
    return new Vector(x, y);
  }
  return new Two.Vector(x, y) as unknown as Vector;
}

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
  bbox: SurfaceBBox,
  zoomScale: number = 1
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
    case "rotate":
      return { x: bbox.cx, y: bbox.cy - hh - ROTATE_OFFSET / zoomScale };
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

  const doodler = getDoodler();
  const scale = doodler.zui.scale;

  for (const id of ALL_HANDLES) {
    const pos = handlePosition(id, bbox);
    handles.set(id, createHandleCircle(pos.x, pos.y));
  }

  // Rotate handle + connecting line
  const topCenter = { x: bbox.cx, y: bbox.cy - (bbox.height * OUTLINE_SCALE) / 2 };
  const rotatePos = handlePosition("rotate", bbox, scale);
  const dot = createHandleCircle(rotatePos.x, rotatePos.y);
  dot.fill = ColorHighlight;
  handles.set("rotate", dot);

  // Line from top-center of outline to rotate handle
  const line = doodler.two.makeLine(topCenter.x, topCenter.y, rotatePos.x, rotatePos.y);
  line.stroke = ColorHighlight;
  line.linewidth = 1.5 / scale;
  (line as any).isHighlight = true;
  doodler.canvas.add(line);
  rotateLine = line;
}

export function hideResizeHandles(): void {
  for (const dot of handles.values()) {
    dot.remove();
  }
  handles.clear();
  if (rotateLine) {
    rotateLine.remove();
    rotateLine = null;
  }
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

// ── Shape normalization ────────────────────────────────────────────

/**
 * Ensures a Path shape has its translation at the vertex center,
 * with vertices relative to that center. Shapes created via `new Path()`
 * (bezier, line, arrow) have translation=(0,0) and vertices in world space,
 * which breaks scale/rotation (they apply from the local origin, not shape center).
 *
 * Uses Two.js's `path.center()` which shifts vertices, then compensates translation.
 */
function normalizePathOrigin(shape: Shape): void {
  const path = shape as Path;
  if (!path.vertices || path.vertices.length === 0) return;

  // Compute vertex bounding box center
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const v of path.vertices) {
    minX = Math.min(minX, v.x);
    minY = Math.min(minY, v.y);
    maxX = Math.max(maxX, v.x);
    maxY = Math.max(maxY, v.y);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // Skip if already centered
  if (Math.abs(cx) < 1 && Math.abs(cy) < 1) return;

  // Shift vertices to be centered, adjust translation to compensate
  for (const v of path.vertices) {
    v.x -= cx;
    v.y -= cy;
  }
  shape.translation.x += cx;
  shape.translation.y += cy;
}

// ── Resize drag ────────────────────────────────────────────────────

export function startResize(
  handle: HandleId,
  shapes: Shape[],
  outlines: Map<string, Rectangle>
): void {
  // Center vertices for world-space paths (line, bezier, arrow) so scale
  // applies from shape center. Brush strokes already have a usable origin
  // (first vertex) set by the brush tool — normalizing them breaks resize.
  const worldSpaceTypes = new Set(["line", "arrow", "bezier"]);
  for (const shape of shapes) {
    if ((shape as any).vertices && worldSpaceTypes.has((shape as any).doodleType)) {
      normalizePathOrigin(shape);
    }
  }

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
      shape.scale = makeScaleVector(shape, newSx, newSy);
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

  // Reposition all handles (corners + rotate) from stored start bbox
  const scale = doodler.zui.scale;
  for (const [id, circle] of handles) {
    if (id === "rotate") {
      // Rotate handle sits above the scaled top-center
      const topCenterY = anchor.y + (startBBox.cy - startBBox.height * OUTLINE_SCALE / 2 - anchor.y) * sfy;
      circle.translation.x = anchor.x + (startBBox.cx - anchor.x) * sfx;
      circle.translation.y = topCenterY - ROTATE_OFFSET / scale;
    } else {
      const startPos = handlePosition(id, startBBox);
      circle.translation.x = anchor.x + (startPos.x - anchor.x) * sfx;
      circle.translation.y = anchor.y + (startPos.y - anchor.y) * sfy;
    }
  }

  // Reposition rotate line
  if (rotateLine) {
    const line = rotateLine as any;
    const topCenterX = anchor.x + (startBBox.cx - anchor.x) * sfx;
    const topCenterY = anchor.y + (startBBox.cy - startBBox.height * OUTLINE_SCALE / 2 - anchor.y) * sfy;
    const rotateHandle = handles.get("rotate");
    line.vertices[0].x = topCenterX;
    line.vertices[0].y = topCenterY;
    line.vertices[1].x = rotateHandle ? rotateHandle.translation.x : topCenterX;
    line.vertices[1].y = rotateHandle ? rotateHandle.translation.y : topCenterY - ROTATE_OFFSET / scale;
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
        : makeScaleVector(shape, origScale.x, origScale.y);

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

// ── Rotation drag ──────────────────────────────────────────────────

export function startRotate(
  shapes: Shape[],
  outlines: Map<string, Rectangle>,
  surfacePos: { x: number; y: number }
): void {
  const bbox = computeSelectionBBox(shapes);
  if (!bbox) return;

  const center = new Vector(bbox.cx, bbox.cy);
  const startAngle = Math.atan2(
    surfacePos.y - center.y,
    surfacePos.x - center.x
  );

  // Center vertices for world-space paths (same as resize)
  const worldSpaceTypes2 = new Set(["line", "arrow", "bezier"]);
  for (const shape of shapes) {
    if ((shape as any).vertices && worldSpaceTypes2.has((shape as any).doodleType)) {
      normalizePathOrigin(shape);
    }
  }

  const startRotations = new Map<string, number>();
  const startTranslations = new Map<string, Vector>();
  for (const shape of shapes) {
    startRotations.set(shape.id, shape.rotation);
    startTranslations.set(shape.id, shape.translation.clone());
  }

  rotateDragState = {
    center,
    startAngle,
    shapes,
    startRotations,
    startTranslations,
    outlines,
  };
}

export function doRotate(
  surfacePos: { x: number; y: number },
  shiftKey: boolean = false
): void {
  if (!rotateDragState) return;
  const doodler = getDoodler();
  const { center, startAngle, shapes, startRotations, startTranslations, outlines } =
    rotateDragState;

  let deltaAngle =
    Math.atan2(surfacePos.y - center.y, surfacePos.x - center.x) - startAngle;

  // Shift: snap to 15-degree increments
  if (shiftKey) {
    const snap = Math.PI / 12;
    deltaAngle = Math.round(deltaAngle / snap) * snap;
  }

  const cos = Math.cos(deltaAngle);
  const sin = Math.sin(deltaAngle);

  // Rotate each shape's own rotation and orbit its position around center
  for (const shape of shapes) {
    const origRotation = startRotations.get(shape.id) ?? 0;
    const origTrans = startTranslations.get(shape.id);
    if (!origTrans) continue;

    shape.rotation = origRotation + deltaAngle;

    const relX = origTrans.x - center.x;
    const relY = origTrans.y - center.y;
    shape.translation.x = center.x + relX * cos - relY * sin;
    shape.translation.y = center.y + relX * sin + relY * cos;
  }

  // Rebuild outlines from fresh bounding boxes (rotation changes the AABB)
  for (const [id, rect] of outlines) {
    const shape = shapes.find((s) => s.id === id);
    if (!shape) continue;
    const item = (shape as any).getBoundingClientRect(false);
    const pos = doodler.zui.clientToSurface({
      x: item.left + item.width / 2,
      y: item.top + item.height / 2,
    });
    rect.translation.x = pos.x;
    rect.translation.y = pos.y;
    rect.width = item.width / doodler.zui.scale;
    rect.height = item.height / doodler.zui.scale;
  }

  // Rebuild handles to match rotated positions
  showResizeHandles(shapes);

  doodler.throttledTwoUpdate();
}

export function endRotate(): void {
  if (!rotateDragState) return;
  const { shapes, startRotations, startTranslations } = rotateDragState;

  for (const shape of shapes) {
    const origRotation = startRotations.get(shape.id);
    const origTrans = startTranslations.get(shape.id);
    if (origRotation === undefined || !origTrans) continue;

    pushUpdateCommand(
      shape.id,
      {
        rotation: shape.rotation,
        "translation.x": shape.translation.x,
        "translation.y": shape.translation.y,
      },
      {
        rotation: origRotation,
        "translation.x": origTrans.x,
        "translation.y": origTrans.y,
      }
    );
  }

  showResizeHandles(shapes);
  rotateDragState = null;
}

export function isRotating(): boolean {
  return rotateDragState !== null;
}

// ── Move support ───────────────────────────────────────────────────

const handleMoveOrigins: Map<HandleId, Vector> = new Map();
let rotateLineMoveOrigins: { v0: Vector; v1: Vector } | null = null;

export function storeHandleOriginsForMove(): void {
  handleMoveOrigins.clear();
  for (const [id, circle] of handles) {
    handleMoveOrigins.set(id, circle.translation.clone());
  }
  if (rotateLine) {
    const line = rotateLine as any;
    rotateLineMoveOrigins = {
      v0: new Vector(line.vertices[0].x, line.vertices[0].y),
      v1: new Vector(line.vertices[1].x, line.vertices[1].y),
    };
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
  if (rotateLine && rotateLineMoveOrigins) {
    const line = rotateLine as any;
    line.vertices[0].x = rotateLineMoveOrigins.v0.x + dx;
    line.vertices[0].y = rotateLineMoveOrigins.v0.y + dy;
    line.vertices[1].x = rotateLineMoveOrigins.v1.x + dx;
    line.vertices[1].y = rotateLineMoveOrigins.v1.y + dy;
  }
}
