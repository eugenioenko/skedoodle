import { Point } from "@/models/point.model";
import { MouseEvent, TouchEvent } from "react";
import { Path } from "two.js/src/path";
import { Shape } from "two.js/src/shape";
import { Vector } from "two.js/src/vector";
import { BoundingBox } from "two.js";
import Two from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { getDoodler } from "./doodler.client";

export const ColorHighlight = "#0ea5cf";
export const OUTLINE_SCALE = 1.01;

// ── Highlight helpers ─────────────────────────────────────────────
// Highlights are clone overlays in the highlights group. The original
// shape is never mutated, so properties/serialization/undo always
// read the real values.

const highlightClones = new Map<string, Shape>();

export function applyHighlight(shape: Shape): void {
  if (highlightClones.has(shape.id)) return;
  const clone = (shape as any).clone();
  clone.fill = "transparent";
  clone.stroke = ColorHighlight;
  clone.linewidth = 2 / getDoodler().zui.scale;
  clone.opacity = 1;
  highlightClones.set(shape.id, clone);
  getDoodler().highlights.add(clone);
}

export function restoreHighlight(shape: Shape): void {
  const clone = highlightClones.get(shape.id);
  if (!clone) return;
  clone.remove();
  highlightClones.delete(shape.id);
}

export function syncHighlightClone(shape: Shape): void {
  const clone = highlightClones.get(shape.id);
  if (!clone) return;
  clone.translation.copy(shape.translation);
  clone.rotation = shape.rotation;
  clone.scale = (shape as any).scale;
}

export function updateHighlightScales(): void {
  const scale = getDoodler().zui.scale;
  for (const clone of highlightClones.values()) {
    (clone as any).linewidth = 2 / scale;
  }
}

// ── Shape helpers ──────────────────────────────────────────────────

export interface SurfaceBBox {
  cx: number;
  cy: number;
  width: number;
  height: number;
}

export interface ScaleXY {
  x: number;
  y: number;
}

/**
 * Computes the combined bounding box of multiple shapes in surface space.
 */
export function computeSelectionBBox(shapes: Shape[]): SurfaceBBox | null {
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

/**
 * Creates a scale Vector compatible with the shape's internal Vector class.
 * Vite bundles Two.js with its own Vector class. Shapes created via `two.make*()`
 * use that bundled Vector, while shapes created via `new Path()`/`new Text()`
 * use the source-imported Vector. The wrong one fails `instanceof` in Two.js's _update.
 */
const BUNDLED_VECTOR_TYPES = new Set(["brush", "rect", "ellipse", "circle"]);
export function makeScaleVector(shape: Shape, x: number, y: number): Vector {
  if (BUNDLED_VECTOR_TYPES.has((shape as any).doodleType)) {
    return new Two.Vector(x, y) as unknown as Vector;
  }
  return new Vector(x, y);
}

/**
 * Centers vertices of a Path shape around its bounding box center,
 * adjusting translation to keep the visual position unchanged.
 * Needed for shapes created via `new Path()` (line, bezier, arrow) that have
 * translation=(0,0) with vertices in world space.
 */
export function normalizePathOrigin(shape: Shape): void {
  const path = shape as Path;
  if (!path.vertices || path.vertices.length === 0) return;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const v of path.vertices) {
    minX = Math.min(minX, v.x);
    minY = Math.min(minY, v.y);
    maxX = Math.max(maxX, v.x);
    maxY = Math.max(maxY, v.y);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  if (Math.abs(cx) < 1 && Math.abs(cy) < 1) return;

  for (const v of path.vertices) {
    v.x -= cx;
    v.y -= cy;
  }
  shape.translation.x += cx;
  shape.translation.y += cy;
}

/** Doodle types with world-space vertices that need normalizing before transforms */
export const WORLD_SPACE_TYPES = new Set(["line", "arrow", "bezier"]);

export enum MouseButton {
  Left = 0,
  Middle = 1,
  Right = 2,
}

export function eventToSurfacePosition(
  e: MouseEvent<HTMLDivElement>,
  zui?: ZUI
): Point {
  zui = zui || getDoodler().zui;
  const rect = e.currentTarget.getBoundingClientRect();
  const position = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
  return zui.clientToSurface(position);
}

export function eventToClientPosition(e: MouseEvent<HTMLDivElement>): Point {
  const rect = e.currentTarget.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

export function debounce(func: (...args: unknown[]) => void, delay: number) {
  let timeout: NodeJS.Timeout;
  return (...args: unknown[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

export function isPointInBoundingBox(
  point: { x: number; y: number },
  box: BoundingBox
): boolean {
  return isPointInRect(
    point.x,
    point.y,
    box.left,
    box.top,
    box.right,
    box.bottom
  );
}
export function isPointInRect(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  return x >= x1 && x <= x2 && y >= y1 && y <= y2;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function truncateToDecimals(num: number, decimals: number) {
  const factor = Math.pow(10, decimals);
  return Math.floor(num * factor) / factor;
}

export function radiansToDegrees(radians: number): number {
  return (radians * (180 / Math.PI)) % 360;
}

export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function touchEventToMouseEvent(
  e: TouchEvent<HTMLDivElement>
): MouseEvent<HTMLDivElement> {
  const event = e as unknown as MouseEvent<HTMLDivElement>;
  const touches = e.touches?.[0] ||
    e.changedTouches?.[0] || { clientX: 0, clientY: 0 };
  event.clientX = touches.clientX;
  event.clientY = touches.clientY;
  return event;
}
