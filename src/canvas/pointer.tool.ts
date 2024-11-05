import { MouseEvent } from "react";
import { ctx } from "./canvas.service";

import { envIsDevelopment } from "@/environment";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Path } from "two.js/src/path";
import { Shape } from "two.js/src/shape";
import { isPointInRect, mouseEventToPosition } from "./canvas.utils";
import { Vector } from "two.js/src/vector";
import { Rectangle } from "two.js/src/shapes/rectangle";

interface PointerSelection {
  shapes: Shape[];
  border: Rectangle;
}

export interface PointerState {
  origin: Vector;
  selection: PointerSelection[];
  setSelection: (selection: PointerSelection[]) => void;
}

export const usePointerStore = create<PointerState>()(
  devtools(
    (set) => ({
      selection: [],
      origin: new Vector(),
      setSelection: (selection) => set((state) => ({ ...state, selection })),
    }),
    { name: "pointerStore", enabled: false || envIsDevelopment }
  )
);

export function doPointerStart(e: MouseEvent<HTMLDivElement>): void {
  const { origin } = usePointerStore.getState();
  const pointer = mouseEventToPosition(e);
  origin.set(pointer.x, pointer.y);
}

export function doPointerMove(e: MouseEvent<HTMLDivElement>): void {
  return;
}

export function doPointerEnd(e: MouseEvent<HTMLDivElement>) {
  const { zui, two, canvas } = ctx();
  const { selection: selected, setSelection } = usePointerStore.getState();

  for (const item of selected) {
    canvas.remove(item.border);
  }

  setSelection([]);
  const pointer = mouseEventToPosition(e);
  const shapes = canvas.children.filter(
    (shape) => (shape as Path).getBoundingClientRect
  );

  const selection: PointerSelection[] = [];
  for (const shape of shapes) {
    const item = shape.getBoundingClientRect(false);
    const isShapeWithin = isPointInRect(
      pointer.x,
      pointer.y,
      item.left,
      item.top,
      item.right,
      item.bottom
    );
    if (isShapeWithin) {
      const pos = zui.clientToSurface({
        x: item.left + item.width / 2,
        y: item.top + item.height / 2,
      });
      const border = two.makeRectangle(
        pos.x,
        pos.y,
        item.width / zui.scale,
        item.height / zui.scale
      );
      border.dashes = [10, 10, 10, 10];
      border.stroke = "#0ea5cf";
      border.noFill();
      border.linewidth = 1 / zui.scale;
      border.scale = 1.05;
      canvas.add(border);
      selection.push({
        shapes: [shape],
        border,
      });
      break;
    }
  }
  if (selection.length) {
    setSelection(selection);
    console.log(selection?.[0]);
  }
}
