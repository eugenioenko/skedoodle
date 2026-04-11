import { Circle } from "two.js/src/shapes/circle";
import { Shape } from "two.js/src/shape";
import { Vector } from "two.js/src/vector";
import { ColorHighlight, computeSelectionBBox, OUTLINE_SCALE, SurfaceBBox } from "../canvas.utils";
import { getDoodler } from "../doodler.client";

// ── Types ──────────────────────────────────────────────────────────

export type HandleId = "nw" | "ne" | "sw" | "se" | "rotate";

// ── Constants ──────────────────────────────────────────────────────

const HANDLE_RADIUS = 5;
const HIT_RADIUS = 10;
const ROTATE_OFFSET = 25;

const ALL_HANDLES: HandleId[] = ["nw", "ne", "sw", "se"];

// ── Module state ───────────────────────────────────────────────────

const handles: Map<HandleId, Circle> = new Map();
let rotateLine: Shape | null = null;

// ── Helpers ────────────────────────────────────────────────────────

function distanceSq(ax: number, ay: number, bx: number, by: number): number {
  return (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
}

export function handlePosition(
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

// ── Resize drag handle repositioning ───────────────────────────────

export function repositionHandlesDuringResize(
  startBBox: SurfaceBBox,
  anchor: Vector,
  sfx: number,
  sfy: number
): void {
  const doodler = getDoodler();
  const scale = doodler.zui.scale;

  for (const [id, circle] of handles) {
    if (id === "rotate") {
      const topCenterY = anchor.y + (startBBox.cy - startBBox.height * OUTLINE_SCALE / 2 - anchor.y) * sfy;
      circle.translation.x = anchor.x + (startBBox.cx - anchor.x) * sfx;
      circle.translation.y = topCenterY - ROTATE_OFFSET / scale;
    } else {
      const startPos = handlePosition(id, startBBox);
      circle.translation.x = anchor.x + (startPos.x - anchor.x) * sfx;
      circle.translation.y = anchor.y + (startPos.y - anchor.y) * sfy;
    }
  }

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
}
