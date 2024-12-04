import { MouseEvent } from "react";
import { Coordinates, ctx } from "./canvas.service";

import { envIsDevelopment } from "@/environment";
import Two from "two.js";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { eventToSurfacePosition, eventToClientPosition } from "./canvas.utils";
import { Vector } from "two.js/src/vector";
import { Path } from "two.js/src/path";
import { useCanvasStore } from "./canvas.store";
import { Circle } from "two.js/src/shapes/circle";
import { colord, RgbaColor } from "colord";
import { areaOfTriangle, simplifyEdge } from "@/utils/simplify-edge";

export interface BrushState {
  previousPosition: Vector;
  path?: Path;
  circle?: Circle;
  strokeColor: RgbaColor;
  strokeWidth: number;
  tolerance: number;
  setPath: (path?: Path | undefined) => void;
  setCircle: (circle?: Circle | undefined) => void;
  setStrokeWidth: (strokeWidth?: number) => void;
  setStrokeColor: (strokeColor: RgbaColor) => void;
  setTolerance: (tolerance: number) => void;
}

export const useBrushStore = create<BrushState>()(
  devtools(
    (set) => ({
      path: undefined,
      circle: undefined,
      previousPosition: new Vector(),
      strokeWidth: 5,
      tolerance: 10,
      strokeColor: { r: 33, g: 33, b: 33, a: 1 },
      setStrokeColor: (strokeColor) =>
        set((state) => ({ ...state, strokeColor })),
      setPath: (path) => set((state) => ({ ...state, path })),
      setCircle: (circle) => set((state) => ({ ...state, circle })),
      setStrokeWidth: (strokeWidth) =>
        set((state) => ({ ...state, strokeWidth })),
      setTolerance: (tolerance) => set((state) => ({ ...state, tolerance })),
    }),
    { name: "brushStore", enabled: false || envIsDevelopment }
  )
);

export function doBrushStart(e: MouseEvent<HTMLDivElement>): void {
  const { zui, two, canvas, doodler } = ctx();
  const { previousPosition, setPath, setCircle, strokeWidth, strokeColor } =
    useBrushStore.getState();
  const fillColor = colord(strokeColor).toRgbString();
  const position = zui.clientToSurface(eventToClientPosition(e));
  previousPosition.set(position.x, position.y);
  setPath(undefined);

  // add dot for starting point reference only when no opacity
  if (strokeColor?.a === 1) {
    const circle = two.makeCircle(position.x, position.y, strokeWidth / 2);
    circle.fill = fillColor;
    circle.noStroke();
    canvas.add(circle);
    setCircle(circle);
  }
  doodler.throttledTwoUpdate();
}

export function doBrushMove(e: MouseEvent<HTMLDivElement>): void {
  const { zui, two, doodler } = ctx();
  const { path, setPath, previousPosition, strokeColor, strokeWidth } =
    useBrushStore.getState();
  const { addShape } = useCanvasStore.getState();
  const fillColor = colord(strokeColor).toRgbString();

  const position = eventToSurfacePosition(e, zui);
  if (!path) {
    // make new line, each line starts with a circle and ends with a circle
    // TODO there is a type definition issue here, investigate why the mismatch
    const line = two.makeCurve(
      [makeAnchor(previousPosition), makeAnchor(position)] as never,
      true as never
    );
    line.cap = "round";
    line.noFill().stroke = fillColor;
    line.linewidth = strokeWidth;
    for (const v of line.vertices) {
      v.addSelf(line.position);
    }
    line.position.clear();
    addShape(line);
    setPath(line);
  } else {
    // continue drawing
    let skipVertices = false;
    if (path.vertices.length) {
      const lastVertices = path.vertices[path.vertices.length - 1];
      const distance = Two.Vector.distanceBetween(
        lastVertices,
        position as never
      );

      // TODO set stabilizer to a percentage and make it an option
      let stabilizer = strokeWidth / 4;
      const maxStabilizer = 10;
      stabilizer = stabilizer > maxStabilizer ? maxStabilizer : stabilizer;
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
  const { zui, canvas, doodler } = ctx();
  const { path, circle, setCircle, tolerance } = useBrushStore.getState();
  if (!path) {
    return;
  }
  if (circle) {
    canvas.remove(circle);
    setCircle(undefined);
  }
  const position = zui.clientToSurface(eventToClientPosition(e));
  path.vertices.push(makeAnchor(position));

  normalizePathOrigin(path);

  if (tolerance !== 0) {
    // Area of Triangle:	Smooth and general-purpose; preserves curves and shape.
    // Perpendicular Distance:	Prioritizes straight-line segments, sharper results on straight paths.
    // Angle:	Retains sharp corners, may oversimplify smooth curves.
    const limit = Math.floor(((100 - tolerance) * path.vertices.length) / 100);
    const simplified = simplifyEdge(areaOfTriangle, path.vertices, limit);
    path.vertices = simplified;
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

function makeAnchor({ x, y }: Coordinates) {
  var anchor = new Two.Anchor(x, y);
  return anchor;
}
