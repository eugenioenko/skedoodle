import { MouseEvent } from "react";
import { Coordinates, ctx } from "./canvas.service";

import { envIsDevelopment } from "@/environment";
import Two from "two.js";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { eventToGlobalPosition, mouseEventToPosition } from "./canvas.utils";
import { Vector } from "two.js/src/vector";
import { Path } from "two.js/src/path";
import { useCanvasStore } from "./canvas.store";
import { Circle } from "two.js/src/shapes/circle";
import { colord, RgbaColor } from "colord";

export interface BrushState {
  previousPosition: Vector;
  path?: Path;
  circle?: Circle;
  strokeColor: RgbaColor;
  strokeWidth: number;
  setPath: (path?: Path | undefined) => void;
  setCircle: (circle?: Circle | undefined) => void;
  setStrokeWidth: (strokeWidth?: number) => void;
  setStrokeColor: (strokeColor: RgbaColor) => void;
}

export const useBrushStore = create<BrushState>()(
  devtools(
    (set) => ({
      path: undefined,
      circle: undefined,
      previousPosition: new Vector(),
      strokeWidth: 5,
      strokeColor: { r: 33, g: 33, b: 33, a: 1 },
      setStrokeColor: (strokeColor) =>
        set((state) => ({ ...state, strokeColor })),
      setPath: (path) => set((state) => ({ ...state, path })),
      setCircle: (circle) => set((state) => ({ ...state, circle })),
      setStrokeWidth: (strokeWidth) =>
        set((state) => ({ ...state, strokeWidth })),
    }),
    { name: "brushStore", enabled: false || envIsDevelopment }
  )
);

export function doBrushStart(e: MouseEvent<HTMLDivElement>): void {
  const { zui, two, canvas } = ctx();
  const { previousPosition, setPath, setCircle, strokeWidth, strokeColor } =
    useBrushStore.getState();
  const fillColor = colord(strokeColor).toRgbString();
  const position = zui.clientToSurface(mouseEventToPosition(e));
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
}

export function doBrushMove(e: MouseEvent<HTMLDivElement>): void {
  const { zui, two } = ctx();
  const { path, setPath, previousPosition, strokeColor, strokeWidth } =
    useBrushStore.getState();
  const { addShape } = useCanvasStore.getState();
  const fillColor = colord(strokeColor).toRgbString();

  const position = eventToGlobalPosition(e, zui);
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

      // TODO set stabilizer to  canvas local position
      let stabilizer = strokeWidth / 2;
      const minStabilizer = 2;
      stabilizer = stabilizer < minStabilizer ? minStabilizer : stabilizer;
      if (distance < strokeWidth / 2) {
        skipVertices = true;
      }
    }
    if (!skipVertices) {
      path.vertices.push(makeAnchor(position));
    }
  }
  previousPosition.set(position.x, position.y);
}

export function doBrushUp(e: MouseEvent<HTMLDivElement>) {
  const { zui, canvas } = ctx();
  const { path, circle, setCircle } = useBrushStore.getState();
  if (!path) {
    return;
  }
  if (circle) {
    canvas.remove(circle);
    setCircle(undefined);
  }
  const position = zui.clientToSurface(mouseEventToPosition(e));
  path.vertices.push(makeAnchor(position));
  normalizePathToCenterPoint(path);
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
