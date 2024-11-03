import { MouseEvent } from "react";
import { ctx } from "./canvas.service";

import { envIsDevelopment } from "@/environment";
import Two from "two.js";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { eventToGlobalPosition, mouseEventToPosition } from "./canvas.utils";
import { Vector } from "two.js/src/vector";
import { Path } from "two.js/src/path";

export type Tool = "hand" | "pointer" | "brush";

export interface BrushState {
  previousPosition: Vector;
  path?: Path;
  setPath: (path?: Path | undefined) => void;
}

export const useBrushStore = create<BrushState>()(
  devtools(
    (set) => ({
      path: undefined,
      previousPosition: new Vector(),
      setPath: (path) => set((state) => ({ ...state, path })),
    }),
    { name: "brushStore", enabled: envIsDevelopment }
  )
);

export function doBrushStart(e: MouseEvent<HTMLDivElement>): void {
  const { zui, two, canvas } = ctx();
  const { previousPosition, setPath } = useBrushStore.getState();
  const position = zui.clientToSurface(mouseEventToPosition(e));
  previousPosition.set(position.x, position.y);
  setPath(undefined);

  const circle = two.makeCircle(position.x, position.y, 10);
  circle.fill = "#333";
  circle.noStroke();
  canvas.add(circle);
}

export function doBrushMove(e: MouseEvent<HTMLDivElement>): void {
  const { zui, canvas, two } = ctx();
  const { path, setPath, previousPosition } = useBrushStore.getState();
  const position = eventToGlobalPosition(e, zui);
  if (!path) {
    // make new line, each line starts with a circle and ends with a circle
    const circle = two.makeCircle(position.x, position.y, 10);
    circle.fill = "#333";
    circle.noStroke();
    canvas.add(circle);

    const line = two.makeCurve(
      [makeAnchor(previousPosition), makeAnchor(position)],
      true
    );
    line.noFill().stroke = "#333";
    line.linewidth = 20;
    line.vertices.forEach(function (v) {
      v.addSelf(line.position);
    });
    line.position.clear();
    canvas.add(line);
    setPath(line);
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
  const { zui, canvas, two } = ctx();
  const { path } = useBrushStore.getState();
  if (!path) {
    return;
  }
  const position = zui.clientToSurface(mouseEventToPosition(e));
  path.vertices.push(makeAnchor(position));

  const circle = two.makeCircle(position.x, position.y, 10);
  circle.fill = "#333";
  circle.noStroke();
  canvas.add(circle);
}

function makeAnchor({ x, y }) {
  var anchor = new Two.Anchor(x, y);
  anchor.position = new Two.Vector().copy(anchor);
  return anchor;
}
