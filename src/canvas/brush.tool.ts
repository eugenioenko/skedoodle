import { MouseEvent } from "react";
import { ctx } from "./canvas.service";

import { envIsDevelopment } from "@/environment";
import Two from "two.js";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  colorToRgbaString,
  eventToGlobalPosition,
  mouseEventToPosition,
} from "./canvas.utils";
import { Vector } from "two.js/src/vector";
import { Path } from "two.js/src/path";
import { useCanvasStore } from "./canvas.store";
import { Circle } from "two.js/src/shapes/circle";

export type Tool = "hand" | "pointer" | "brush";

export interface BrushState {
  previousPosition: Vector;
  path?: Path;
  circle?: Circle;
  setPath: (path?: Path | undefined) => void;
  setCircle: (circle?: Circle | undefined) => void;
}

export const useBrushStore = create<BrushState>()(
  devtools(
    (set) => ({
      path: undefined,
      circle: undefined,
      previousPosition: new Vector(),
      setPath: (path) => set((state) => ({ ...state, path })),
      setCircle: (circle) => set((state) => ({ ...state, circle })),
    }),
    { name: "brushStore", enabled: false || envIsDevelopment }
  )
);

export function doBrushStart(e: MouseEvent<HTMLDivElement>): void {
  const { zui, two, canvas } = ctx();
  const { previousPosition, setPath, setCircle } = useBrushStore.getState();
  const { fillColor: fColor, strokeWidth } = useCanvasStore.getState();
  const fillColor = colorToRgbaString(fColor);
  const position = zui.clientToSurface(mouseEventToPosition(e));
  previousPosition.set(position.x, position.y);
  setPath(undefined);

  // add dot for starting point reference only when no opacity
  if (fColor?.a === 1) {
    const circle = two.makeCircle(position.x, position.y, strokeWidth / 2);
    circle.fill = fillColor;
    circle.noStroke();
    canvas.add(circle);
    setCircle(circle);
  }
}

export function doBrushMove(e: MouseEvent<HTMLDivElement>): void {
  const { zui, canvas, two } = ctx();
  const { path, setPath, previousPosition, circle } = useBrushStore.getState();
  const { fillColor: fColor, strokeWidth } = useCanvasStore.getState();
  const fillColor = colorToRgbaString(fColor);

  const position = eventToGlobalPosition(e, zui);
  if (!path) {
    // make new line, each line starts with a circle and ends with a circle
    const line = two.makeCurve(
      [makeAnchor(previousPosition), makeAnchor(position)],
      true
    );
    line.cap = "round";
    line.noFill().stroke = fillColor;
    line.linewidth = strokeWidth;
    line.vertices.forEach(function (v) {
      v.addSelf(line.position);
    });
    line.position.clear();
    canvas.add(line);
    setPath(line);
    // lighten starting point reference
    if (circle) {
      circle.opacity = 0;
    }
  } else {
    // continue drawing
    let skipVertices = false;
    if (path.vertices.length) {
      const lastVertices = path.vertices[path.vertices.length - 1];
      const distance = Two.Vector.distanceBetween(lastVertices, position);
      if (distance < 10) {
        skipVertices = true;
      }
    }
    if (!skipVertices) {
      path.vertices.push(makeAnchor(position));
    }
  }
  previousPosition.set(position.x, position.y);
}

export function doBrushUp(e) {
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
}

function makeAnchor({ x, y }) {
  var anchor = new Two.Anchor(x, y);
  anchor.position = new Two.Vector().copy(anchor);
  return anchor;
}
