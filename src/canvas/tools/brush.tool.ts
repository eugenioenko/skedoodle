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

export interface BrushState {
  strokeColor: RgbaColor;
  strokeWidth: number;
  tolerance: number;
  stabilizer: number;
  simplifyAlgo: PathSimplifyType;
  setStrokeWidth: (strokeWidth?: number) => void;
  setStrokeColor: (strokeColor: RgbaColor) => void;
  setTolerance: (tolerance: number) => void;
  setStabilizer: (stabilizer: number) => void;
  setSimplifyAlgo: (algo: PathSimplifyType) => void;
}

export const useBrushStore = create<BrushState>()(
  persist(
    (set) => ({
      strokeWidth: 5,
      tolerance: 30,
      stabilizer: 1,
      strokeColor: { r: 33, g: 33, b: 33, a: 1 },
      simplifyAlgo: "triangle",
      setStrokeColor: (strokeColor) => set(() => ({ strokeColor })),
      setStrokeWidth: (strokeWidth) => set(() => ({ strokeWidth })),
      setTolerance: (tolerance) => set(() => ({ tolerance })),
      setStabilizer: (stabilizer) => set(() => ({ stabilizer })),
      setSimplifyAlgo: (simplifyAlgo) => set(() => ({ simplifyAlgo })),
    }),
    { name: "brush-tool", version: 1 }
  )
);

let previousPosition = new Vector();
let circle: Circle | undefined;
let path: Path | undefined;

export function doBrushStart(e: MouseEvent<HTMLDivElement>): void {
  const doodler = getDoodler();
  const { strokeWidth, strokeColor } = useBrushStore.getState();
  const fillColor = colord(strokeColor).toRgbString();
  const position = doodler.zui.clientToSurface(eventToClientPosition(e));
  previousPosition.set(position.x, position.y);
  path = undefined;

  // add dot for starting point reference only when no opacity
  if (strokeColor?.a === 1) {
    circle = doodler.two.makeCircle(position.x, position.y, strokeWidth / 2);
    circle.fill = fillColor;
    circle.noStroke();
    doodler.canvas.add(circle);
  }
  doodler.throttledTwoUpdate();
}

export function doBrushMove(e: MouseEvent<HTMLDivElement>): void {
  const doodler = getDoodler();
  const { strokeColor, strokeWidth, stabilizer } = useBrushStore.getState();
  const fillColor = colord(strokeColor).toRgbString();

  const position = eventToSurfacePosition(e, doodler.zui);
  if (!path) {
    // make new line, each line starts with a circle and ends with a circle
    // TODO there is a type definition issue here, investigate why the mismatch
    path = doodler.two.makeCurve(
      [makeAnchor(previousPosition), makeAnchor(position)] as never,
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
    // continue drawing
    let skipVertices = false;
    if (path.vertices.length) {
      const lastVertices = path.vertices[path.vertices.length - 1];
      const distance = Two.Vector.distanceBetween(
        lastVertices,
        position as never
      );

      if (distance < stabilizer) {
        skipVertices = true;
      }
    }
    if (!skipVertices) {
      path.vertices.push(makeAnchor(position));
    }
  }
  previousPosition.set(position.x, position.y);
  doodler.throttledTwoUpdate();
}

export function doBrushUp(e: MouseEvent<HTMLDivElement>) {
  const doodler = getDoodler();
  const { tolerance, simplifyAlgo } = useBrushStore.getState();
  if (!path) {
    return;
  }

  if (circle) {
    doodler.canvas.remove(circle);
    circle = undefined;
  }
  const position = doodler.zui.clientToSurface(eventToClientPosition(e));
  path.vertices.push(makeAnchor(position));

  normalizePathOrigin(path);
  // path.vertices = simplifyPathPointsByMinDist(path.vertices, 1);

  if (tolerance !== 0) {
    // Area of Triangle:	Smooth and general-purpose; preserves curves and shape.
    // Perpendicular Distance:	Prioritizes straight-line segments, sharper results on straight paths.
    // Angle:	Retains sharp corners, may oversimplify smooth curves.
    if (simplifyAlgo === "douglas") {
      const limit = tolerance / 100;
      const simplified = simplifyPath(path.vertices, limit, true);
      path.vertices = simplified;
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

function makeAnchor({ x, y }: Point) {
  var anchor = new Two.Anchor(x, y);
  return anchor;
}
