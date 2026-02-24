import { Point } from "@/models/point.model";
import {
  PathSimplifyType,
  areaOfTriangle,
  simplifyEdge,
} from "@/utils/simplify-edge";
import { simplifyPath } from "@/utils/simplify-path";
import { colord, RgbaColor } from "colord";
import { MouseEvent } from "react";
import Two from "two.js";
import { Path } from "two.js/src/path";
import { Circle } from "two.js/src/shapes/circle";
import { Vector } from "two.js/src/vector";
import { create } from "zustand";
import { eventToClientPosition, eventToSurfacePosition } from "../canvas.utils";
import { getDoodler } from "../doodler.client";
import { persist } from "zustand/middleware";
import { pushCreateCommand } from "../history.service";

export interface BrushState {
  strokeColor: RgbaColor;
  strokeWidth: number;
  tolerance: number;
  stabilizer: number;
  showStabilizerDot: boolean;
  liveSimplification: boolean;
  simplifyAlgo: PathSimplifyType;
  cornerDetection: boolean;
  cornerAngle: number;
  setStrokeWidth: (strokeWidth?: number) => void;
  setStrokeColor: (strokeColor: RgbaColor) => void;
  setTolerance: (tolerance: number) => void;
  setStabilizer: (stabilizer: number) => void;
  setShowStabilizerDot: (show: boolean) => void;
  setLiveSimplification: (live: boolean) => void;
  setSimplifyAlgo: (algo: PathSimplifyType) => void;
  setCornerDetection: (enabled: boolean) => void;
  setCornerAngle: (angle: number) => void;
}

export const useBrushStore = create<BrushState>()(
  persist(
    (set) => ({
      strokeWidth: 5,
      tolerance: 30,
      stabilizer: 30,
      showStabilizerDot: false,
      liveSimplification: false,
      strokeColor: { r: 33, g: 33, b: 33, a: 1 },
      simplifyAlgo: "precise",
      cornerDetection: false,
      cornerAngle: 45,
      setStrokeColor: (strokeColor) => set(() => ({ strokeColor })),
      setStrokeWidth: (strokeWidth) => set(() => ({ strokeWidth })),
      setTolerance: (tolerance) => set(() => ({ tolerance })),
      setStabilizer: (stabilizer) => set(() => ({ stabilizer })),
      setShowStabilizerDot: (showStabilizerDot) => set(() => ({ showStabilizerDot })),
      setLiveSimplification: (liveSimplification) => set(() => ({ liveSimplification })),
      setSimplifyAlgo: (simplifyAlgo) => set(() => ({ simplifyAlgo })),
      setCornerDetection: (cornerDetection) => set(() => ({ cornerDetection })),
      setCornerAngle: (cornerAngle) => set(() => ({ cornerAngle })),
    }),
    { name: "brush-tool", version: 11 }
  )
);

type TwoAnchor = ReturnType<typeof makeAnchor>;

const drawPosition = new Vector();
let rawAnchors: TwoAnchor[] = [];
let circle: Circle | undefined;
let ghostDot: Circle | undefined;
let path: Path | undefined;

// Run simplification every N raw points during drawing to progressively
// smooth the stroke so the final mouseup pass causes minimal visual change.
const LIVE_SIMPLIFY_INTERVAL = 10;
// Don't start live simplification until we have enough raw points — avoids
// jitter at the start of a stroke where aggressive simplification collapses
// the path to just 2–3 vertices and the shape changes wildly each interval.
const LIVE_SIMPLIFY_MIN_ANCHORS = 30;

export function doBrushStart(e: MouseEvent<HTMLDivElement>): void {
  const doodler = getDoodler();
  const { strokeWidth, strokeColor, stabilizer, showStabilizerDot } = useBrushStore.getState();
  const fillColor = colord(strokeColor).toRgbString();
  const position = doodler.zui.clientToSurface(eventToClientPosition(e));
  drawPosition.set(position.x, position.y);
  rawAnchors = [makeAnchor(drawPosition)];
  path = undefined;

  // add dot for starting point reference only when no opacity
  if (strokeColor?.a === 1) {
    circle = doodler.two.makeCircle(position.x, position.y, strokeWidth / 2);
    circle.fill = fillColor;
    circle.noStroke();
    doodler.canvas.add(circle);
  }

  // ghost dot: shows the lagged draw position while stabilizer is active
  if (stabilizer > 0 && showStabilizerDot) {
    const scale = doodler.zui.scale || 1;
    ghostDot = doodler.two.makeCircle(position.x, position.y, 4 / scale);
    ghostDot.fill = fillColor;
    ghostDot.stroke = "rgba(255, 255, 255, 0.8)";
    ghostDot.linewidth = 1.5 / scale;
    doodler.canvas.add(ghostDot);
  }

  doodler.throttledTwoUpdate();
}

export function doBrushMove(e: MouseEvent<HTMLDivElement>): void {
  const doodler = getDoodler();
  const { strokeColor, strokeWidth, stabilizer, tolerance, simplifyAlgo, liveSimplification, cornerDetection, cornerAngle } = useBrushStore.getState();
  const fillColor = colord(strokeColor).toRgbString();

  const position = eventToSurfacePosition(e, doodler.zui);

  // Lag-based stabilizer: lerp drawPosition toward the actual cursor.
  // stabilizer 0 = instant (no lag), 100 = very heavy lag/smoothing.
  const alpha = stabilizer === 0 ? 1.0 : Math.max(0.01, 1.0 - stabilizer / 100);
  drawPosition.x += (position.x - drawPosition.x) * alpha;
  drawPosition.y += (position.y - drawPosition.y) * alpha;

  if (ghostDot) {
    const scale = doodler.zui.scale || 1;
    ghostDot.position.set(drawPosition.x, drawPosition.y);
    ghostDot.radius = 4 / scale;
    ghostDot.linewidth = 1.5 / scale;
  }

  const anchor = makeAnchor(drawPosition);
  rawAnchors.push(anchor);

  if (!path) {
    // TODO there is a type definition issue here, investigate why the mismatch
    path = doodler.two.makeCurve(
      [rawAnchors[0], anchor] as never,
      true as never
    );
    path.cap = "round";
    path.noFill().stroke = fillColor;
    path.linewidth = strokeWidth;
    for (const v of path.vertices) {
      v.addSelf(path.position);
    }
    path.position.clear();
    doodler.addDoodle({ shape: path, type: "brush" });

    // remove the initial dot now that the stroke has started
    if (circle) {
      doodler.canvas.remove(circle);
      circle = undefined;
    }
  } else {
    path.vertices.push(anchor);

    // Live simplification: every LIVE_SIMPLIFY_INTERVAL raw points re-simplify
    // the whole path so the final mouseup pass causes minimal visual change.
    if (liveSimplification && tolerance !== 0 && rawAnchors.length >= LIVE_SIMPLIFY_MIN_ANCHORS && rawAnchors.length % LIVE_SIMPLIFY_INTERVAL === 0) {
      const liveSimplified = runSimplification(rawAnchors, tolerance, simplifyAlgo);
      path.vertices = liveSimplified as never;
      if (simplifyAlgo === "precise" && cornerDetection) applyHybridCurve(path, liveSimplified, cornerAngle);
    }
  }
  doodler.throttledTwoUpdate();
}

export function doBrushUp(e: MouseEvent<HTMLDivElement>) {
  const doodler = getDoodler();
  const { tolerance, simplifyAlgo, stabilizer, strokeColor, strokeWidth, cornerDetection, cornerAngle } = useBrushStore.getState();
  const fillColor = colord(strokeColor).toRgbString();

  if (circle) {
    doodler.canvas.remove(circle);
    circle = undefined;
  }
  if (ghostDot) {
    doodler.canvas.remove(ghostDot);
    ghostDot = undefined;
  }

  if (!path) {
    // click without drag: leave a permanent dot at the click position
    const dot = doodler.two.makeCircle(drawPosition.x, drawPosition.y, strokeWidth / 2);
    dot.fill = fillColor;
    dot.noStroke();
    doodler.addDoodle({ shape: dot, type: "circle" });
    pushCreateCommand({ shape: dot, type: "circle" });
    doodler.throttledTwoUpdate();
    return;
  }
  // Apply one final lerp step so the stroke ends at (or near) where the mouse was released.
  const position = doodler.zui.clientToSurface(eventToClientPosition(e));
  const alpha = stabilizer === 0 ? 1.0 : Math.max(0.01, 1.0 - stabilizer / 100);
  drawPosition.x += (position.x - drawPosition.x) * alpha;
  drawPosition.y += (position.y - drawPosition.y) * alpha;
  rawAnchors.push(makeAnchor(drawPosition));

  // Restore full raw set before final pass so live-simplified intermediate
  // state doesn't cause the final simplification to work on a reduced input.
  path.vertices = rawAnchors as never;
  normalizePathOrigin(path);
  // rawAnchors elements are normalized in-place (same object references)

  const simplified = tolerance !== 0 ? runSimplification(rawAnchors, tolerance, simplifyAlgo) : rawAnchors;
  path.vertices = simplified as never;
  if (simplifyAlgo === "precise" && cornerDetection) applyHybridCurve(path, simplified, cornerAngle);
  doodler.throttledTwoUpdate();
  pushCreateCommand({ shape: path, type: "brush" });
}

function runSimplification(
  vertices: TwoAnchor[],
  tolerance: number,
  simplifyAlgo: PathSimplifyType
): TwoAnchor[] {
  if (simplifyAlgo === "smooth") {
    // Douglas-Peucker: scale tolerance to canvas units (0–50px deviation allowed)
    return simplifyPath(vertices, tolerance * 0.5) as unknown as TwoAnchor[];
  }
  // "precise" = Visvalingam-Whyatt with triangle area weight: preserves sharp detail
  const limit = Math.floor(((100 - tolerance) * vertices.length) / 100);
  return simplifyEdge(areaOfTriangle as never, vertices, limit);
}

/**
 * Converts a catmull-rom curved path into a hybrid path where sharp corners
 * become hard line segments and smooth segments retain bezier curves.
 * Sets path.curved = false and assigns Two.js anchor commands + control points.
 * @param cornerAngleDeg - turn angle in degrees above which a vertex is a hard corner (default 60)
 */
function applyHybridCurve(path: Path, vertices: TwoAnchor[], cornerAngleDeg: number): void {
  const n = vertices.length;
  if (n < 2) return;

  const threshold = (cornerAngleDeg * Math.PI) / 180;

  // Detect corners: turn angle > threshold at an internal vertex
  const isCorner = new Array<boolean>(n).fill(false);
  for (let i = 1; i < n - 1; i++) {
    const a = vertices[i - 1], b = vertices[i], c = vertices[i + 1];
    const dx1 = b.x - a.x, dy1 = b.y - a.y;
    const dx2 = c.x - b.x, dy2 = c.y - b.y;
    const m1 = Math.hypot(dx1, dy1), m2 = Math.hypot(dx2, dy2);
    if (m1 < 0.01 || m2 < 0.01) continue;
    const cos = Math.max(-1, Math.min(1, (dx1 * dx2 + dy1 * dy2) / (m1 * m2)));
    if (Math.acos(cos) > threshold) isCorner[i] = true;
  }

  // No corners detected — leave path.curved = true so Two.js uses its internal
  // catmull-rom renderer, which produces smoother results than our manual
  // bezier approximation, especially when few vertices remain after simplification.
  if (!isCorner.some((v) => v)) return;

  // First vertex is always a move
  vertices[0].command = Two.Commands.move;
  vertices[0].controls.left.set(0, 0);
  vertices[0].controls.right.set(0, 0);

  for (let i = 1; i < n; i++) {
    const v = vertices[i];
    // Use a straight line if either endpoint of the segment is a corner
    if (isCorner[i] || isCorner[i - 1]) {
      v.command = Two.Commands.line;
      v.controls.left.set(0, 0);
      v.controls.right.set(0, 0);
    } else {
      v.command = Two.Commands.curve;
      const prev = vertices[i - 1];
      // Catmull-rom → bezier (T = 1/6), with clamped boundary conditions
      const prevPrev = i >= 2 ? vertices[i - 2] : prev;
      const next = i + 1 < n ? vertices[i + 1] : v;
      // Right (outgoing) handle of prev for this segment: (v - prevPrev) / 6
      prev.controls.right.set((v.x - prevPrev.x) / 6, (v.y - prevPrev.y) / 6);
      // Left (incoming) handle of v for this segment: -(next - prev) / 6
      v.controls.left.set(-(next.x - prev.x) / 6, -(next.y - prev.y) / 6);
    }
  }

  path.curved = false;
}

/**
 * Adjusts the path so that its first vertex becomes the origin (0, 0),
 * updating the path's translation and shifting all vertices accordingly.'
 * This helps with transformations
 */
function normalizePathOrigin(path: Path): void {
  const firstVertices = path.vertices[0].clone();
  path.translation.add(firstVertices);
  for (const v of (path as Path).vertices) {
    v.subSelf(firstVertices);
  }
}

/**
 * Centers the vertices of a path while keeping its visual position unchanged on the canvas.
 * This helps with transformations
 */
/*
function normalizePathToCenterPoint(path: Path): void {
  // TODO: fix zui
  const oldPosition = path.getBoundingClientRect();
  path.center();

  const newPosition = path.getBoundingClientRect();
  const offsetX = oldPosition.left - newPosition.left;
  const offsetY = oldPosition.top - newPosition.top;

  path.translation.x += offsetX;
  path.translation.y += offsetY;
}
*/

function makeAnchor({ x, y }: Point) {
  const anchor = new Two.Anchor(x, y);
  anchor.command = Two.Commands.curve;
  return anchor;
}
