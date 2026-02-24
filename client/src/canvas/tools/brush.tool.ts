import { Point } from "@/models/point.model";
import {
  PathSimplifyType,
  pathSimplifyTypeToFunc,
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
  simplifyAlgo: PathSimplifyType;
  setStrokeWidth: (strokeWidth?: number) => void;
  setStrokeColor: (strokeColor: RgbaColor) => void;
  setTolerance: (tolerance: number) => void;
  setStabilizer: (stabilizer: number) => void;
  setShowStabilizerDot: (show: boolean) => void;
  setSimplifyAlgo: (algo: PathSimplifyType) => void;
}

export const useBrushStore = create<BrushState>()(
  persist(
    (set) => ({
      strokeWidth: 5,
      tolerance: 30,
      stabilizer: 30,
      showStabilizerDot: false,
      strokeColor: { r: 33, g: 33, b: 33, a: 1 },
      simplifyAlgo: "triangle",
      setStrokeColor: (strokeColor) => set(() => ({ strokeColor })),
      setStrokeWidth: (strokeWidth) => set(() => ({ strokeWidth })),
      setTolerance: (tolerance) => set(() => ({ tolerance })),
      setStabilizer: (stabilizer) => set(() => ({ stabilizer })),
      setShowStabilizerDot: (showStabilizerDot) => set(() => ({ showStabilizerDot })),
      setSimplifyAlgo: (simplifyAlgo) => set(() => ({ simplifyAlgo })),
    }),
    { name: "brush-tool", version: 3 }
  )
);

const drawPosition = new Vector();
let circle: Circle | undefined;
let ghostDot: Circle | undefined;
let path: Path | undefined;

export function doBrushStart(e: MouseEvent<HTMLDivElement>): void {
  const doodler = getDoodler();
  const { strokeWidth, strokeColor, stabilizer, showStabilizerDot } = useBrushStore.getState();
  const fillColor = colord(strokeColor).toRgbString();
  const position = doodler.zui.clientToSurface(eventToClientPosition(e));
  drawPosition.set(position.x, position.y);
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
  const { strokeColor, strokeWidth, stabilizer } = useBrushStore.getState();
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

  if (!path) {
    // TODO there is a type definition issue here, investigate why the mismatch
    path = doodler.two.makeCurve(
      [makeAnchor(drawPosition), makeAnchor(drawPosition)] as never,
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
  } else {
    path.vertices.push(makeAnchor(drawPosition));
  }
  doodler.throttledTwoUpdate();
}

export function doBrushUp(e: MouseEvent<HTMLDivElement>) {
  const doodler = getDoodler();
  const { tolerance, simplifyAlgo, stabilizer, strokeColor, strokeWidth } = useBrushStore.getState();
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
  path.vertices.push(makeAnchor(drawPosition));

  normalizePathOrigin(path);
  // path.vertices = simplifyPathPointsByMinDist(path.vertices, 1);

  if (tolerance !== 0) {
    // Area of Triangle:	Smooth and general-purpose; preserves curves and shape.
    // Perpendicular Distance:	Prioritizes straight-line segments, sharper results on straight paths.
    // Angle:	Retains sharp corners, may oversimplify smooth curves.
    if (simplifyAlgo === "douglas") {
      const limit = tolerance / 100;
      const simplified = simplifyPath(path.vertices, limit);
      path.vertices = simplified as never;
    } else {
      const limit = Math.floor(
        ((100 - tolerance) * path.vertices.length) / 100
      );
      const simplified = simplifyEdge(
        pathSimplifyTypeToFunc(simplifyAlgo),
        path.vertices,
        limit
      );
      path.vertices = simplified;
    }
  }
  doodler.throttledTwoUpdate();
  pushCreateCommand({ shape: path, type: "brush" });
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
  return anchor;
}
