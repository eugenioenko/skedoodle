import { MouseEvent } from "react";
import { ctx } from "./canvas.service";

import { envIsDevelopment } from "@/environment";
import Two from "two.js";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { eventToGlobalPosition, mouseEventToPosition } from "./canvas.utils";
import { Vector } from "two.js/src/vector";
import { Rectangle } from "two.js/src/shapes/rectangle";
import { useCanvasStore } from "./canvas.store";

export type Tool = "hand" | "pointer" | "brush";

export interface ShapeState {
  shape?: Rectangle;
  origin: Vector;
  setShape: (shape?: Rectangle | undefined) => void;
}

export const useShapeState = create<ShapeState>()(
  devtools(
    (set) => ({
      shape: undefined,
      origin: new Vector(),
      setShape: (shape) => set((state) => ({ ...state, shape })),
    }),
    { name: "brushStore", enabled: false || envIsDevelopment }
  )
);

export function doShapeStart(e: MouseEvent<HTMLDivElement>): void {
  const { zui, two, canvas } = ctx();
  const { setShape, origin } = useShapeState.getState();
  const position = zui.clientToSurface(mouseEventToPosition(e));
  const { fillColor, strokeColor } = useCanvasStore.getState();

  origin.set(position.x, position.y);

  const shape = two.makeRectangle(position.x, position.y, 1, 1);
  shape.stroke = strokeColor;
  shape.fill = fillColor;
  shape.linewidth = 5;
  canvas.add(shape);
  setShape(shape);
}

export function doShapeMove(e: MouseEvent<HTMLDivElement>): void {
  const { zui } = ctx();
  const { shape, origin } = useShapeState.getState();
  const position = eventToGlobalPosition(e, zui);
  if (shape) {
    const width = shape.width;
    const height = shape.height;

    shape.width = position.x - origin.x;
    shape.height = position.y - origin.y;

    const offset = {
      x: (shape.width - width) / 2,
      y: (shape.height - height) / 2,
    };

    shape.position.x += offset.x;
    shape.position.y += offset.y;
  }
}

export function doShapeUp() {
  const { setShape, shape } = useShapeState.getState();
  setShape(undefined);
}
