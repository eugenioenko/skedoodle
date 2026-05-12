import { Rectangle } from "two.js/src/shapes/rectangle";
import { Shape } from "two.js/src/shape";
import { Vector } from "two.js/src/vector";
import {
  computeSelectionBBox,
  makeScaleVector,
  normalizePathOrigin,
  ScaleXY,
  SurfaceBBox,
  syncHighlightClone,
  WORLD_SPACE_TYPES,
} from "../canvas.utils";
import { getDoodler } from "../doodler.client";
import { pushUpdateCommand } from "../history.service";
import {
  HandleId,
  handlePosition,
  showResizeHandles,
  repositionHandlesDuringResize,
  storeHandleOriginsForRotate,
  rotateHandlesByDelta,
} from "./resize.handles";

function getPlainScale(shape: Shape): ScaleXY {
  const s = shape.scale;
  const x = typeof s === "number" ? s : (s as any).x ?? 1;
  const y = typeof s === "number" ? s : (s as any).y ?? 1;
  return { x, y };
}

// ── Types ──────────────────────────────────────────────────────────

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

const OPPOSITE_HANDLE: Record<string, HandleId> = {
  nw: "se",
  ne: "sw",
  sw: "ne",
  se: "nw",
};

// ── Module state ───────────────────────────────────────────────────

let dragState: ResizeDragState | null = null;
let rotateDragState: RotateDragState | null = null;

// ── Normalization helper ───────────────────────────────────────────

function normalizeWorldSpacePaths(shapes: Shape[]): void {
  for (const shape of shapes) {
    if ((shape as any).vertices && WORLD_SPACE_TYPES.has((shape as any).doodleType)) {
      normalizePathOrigin(shape);
    }
  }
}

// ── Resize ─────────────────────────────────────────────────────────

export function startResize(
  handle: HandleId,
  shapes: Shape[],
  outlines: Map<string, Rectangle>
): void {
  normalizeWorldSpacePaths(shapes);

  const bbox = computeSelectionBBox(shapes);
  if (!bbox) return;

  const oppositeId = OPPOSITE_HANDLE[handle];
  const anchorPos = handlePosition(oppositeId, bbox);
  const anchor = new Vector(anchorPos.x, anchorPos.y);
  const startCorner = handlePosition(handle, bbox);

  const startScales = new Map<string, ScaleXY>();
  const startTranslations = new Map<string, Vector>();
  for (const shape of shapes) {
    startScales.set(shape.id, getPlainScale(shape));
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

  const spanX = startCorner.x - anchor.x;
  const spanY = startCorner.y - anchor.y;
  if (Math.abs(spanX) < 0.001 || Math.abs(spanY) < 0.001) return;

  let sfx = (surfacePos.x - anchor.x) / spanX;
  let sfy = (surfacePos.y - anchor.y) / spanY;

  if (shiftKey) {
    const uniform = Math.max(Math.abs(sfx), Math.abs(sfy));
    sfx = uniform * Math.sign(sfx || 1);
    sfy = uniform * Math.sign(sfy || 1);
  }

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
    syncHighlightClone(shape);
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

  repositionHandlesDuringResize(startBBox, anchor, sfx, sfy);
  doodler.throttledTwoUpdate();
}

export function endResize(): void {
  if (!dragState) return;
  const { shapes, startScales, startTranslations } = dragState;

  for (const shape of shapes) {
    const origScale = startScales.get(shape.id);
    const origTrans = startTranslations.get(shape.id);
    if (!origScale || !origTrans) continue;

    pushUpdateCommand(
      shape.id,
      {
        scale: getPlainScale(shape),
        "translation.x": shape.translation.x,
        "translation.y": shape.translation.y,
      },
      {
        scale: origScale,
        "translation.x": origTrans.x,
        "translation.y": origTrans.y,
      }
    );
  }

  showResizeHandles(shapes);
  dragState = null;
}

export function isResizing(): boolean {
  return dragState !== null;
}

// ── Rotation ───────────────────────────────────────────────────────

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

  normalizeWorldSpacePaths(shapes);

  const startRotations = new Map<string, number>();
  const startTranslations = new Map<string, Vector>();
  for (const shape of shapes) {
    startRotations.set(shape.id, shape.rotation);
    startTranslations.set(shape.id, shape.translation.clone());
  }

  storeHandleOriginsForRotate();

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
  const { center, startAngle, shapes, startRotations, startTranslations } =
    rotateDragState;

  let deltaAngle =
    Math.atan2(surfacePos.y - center.y, surfacePos.x - center.x) - startAngle;

  if (shiftKey) {
    const snap = Math.PI / 12;
    deltaAngle = Math.round(deltaAngle / snap) * snap;
  }

  const cos = Math.cos(deltaAngle);
  const sin = Math.sin(deltaAngle);

  for (const shape of shapes) {
    const origRotation = startRotations.get(shape.id) ?? 0;
    const origTrans = startTranslations.get(shape.id);
    if (!origTrans) continue;

    shape.rotation = origRotation + deltaAngle;

    const relX = origTrans.x - center.x;
    const relY = origTrans.y - center.y;
    shape.translation.x = center.x + relX * cos - relY * sin;
    shape.translation.y = center.y + relX * sin + relY * cos;
    syncHighlightClone(shape);
  }

  rotateHandlesByDelta(center, deltaAngle);
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
