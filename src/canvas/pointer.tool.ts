import { MouseEvent } from "react";
import { ctx } from "./canvas.service";

import { envIsDevelopment } from "@/environment";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Path } from "two.js/src/path";
import { isPointInRect, mouseEventToPosition } from "./canvas.utils";
import { Vector } from "two.js/src/vector";
import { Rectangle } from "two.js/src/shapes/rectangle";

interface PointerSelection {
  shape: Path;
  border: Rectangle;
}

export interface PointerState {
  origin: Vector;
  selected: PointerSelection[];
  setSelected: (selected: PointerSelection[]) => void;
  addSelected: (selected: PointerSelection[]) => void;
}

export const usePointerStore = create<PointerState>()(
  devtools(
    (set) => ({
      selected: [],
      origin: new Vector(),
      setSelected: (selected) => set((state) => ({ ...state, selected })),
      addSelected: (selected) =>
        set((state) => {
          return { ...state, selected: [...state.selected, ...selected] };
        }),
    }),
    { name: "pointerStore", enabled: false || envIsDevelopment }
  )
);

export function doPointerStart(e: MouseEvent<HTMLDivElement>): void {
  const { canvas } = ctx();
  const { origin, selected, setSelected } = usePointerStore.getState();
  const pointer = mouseEventToPosition(e);
  origin.set(pointer.x, pointer.y);

  // clear previously selected if not a join selection
  if (!e.shiftKey) {
    for (const item of selected) {
      canvas.remove(item.border);
    }
    setSelected([]);
  }
}

export function doPointerMove(e: MouseEvent<HTMLDivElement>): void {
  return;
}

export function doPointerEnd(e: MouseEvent<HTMLDivElement>) {
  const { zui, two, canvas } = ctx();
  const { selected, addSelected } = usePointerStore.getState();

  const pointer = mouseEventToPosition(e);
  const shapes: Path[] = canvas.children.filter(
    (shape) => (shape as Path).getBoundingClientRect
  ) as Path[];

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
    const isShapeAlreadySelected = selected.find(
      (sh) => sh.shape.id === shape.id
    );

    if (isShapeWithin && !isShapeAlreadySelected) {
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
      border.stroke = "#0ea5cf";
      border.noFill();
      border.linewidth = 1 / zui.scale;
      border.scale = 1.05;
      canvas.add(border);
      selection.push({
        shape,
        border,
      });
      break;
    }
  }
  if (selection.length) {
    addSelected(selection);
  }
}
