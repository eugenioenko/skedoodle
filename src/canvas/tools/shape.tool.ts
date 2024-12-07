import { MouseEvent } from "react";

import { envIsDevelopment } from "@/environment";
import { colord, RgbaColor } from "colord";
import { Rectangle } from "two.js/src/shapes/rectangle";
import { Vector } from "two.js/src/vector";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { useCanvasStore } from "../canvas.store";
import { eventToClientPosition, eventToSurfacePosition } from "../canvas.utils";
import { getDoodler } from "../doodle.service";

export interface ShapeState {
  shape?: Rectangle;
  origin: Vector;
  strokeWidth: number;
  strokeColor: RgbaColor;
  fillColor: RgbaColor;
  setShape: (shape?: Rectangle | undefined) => void;
  setStrokeColor: (strokeColor: RgbaColor) => void;
  setFillColor: (strokeColor: RgbaColor) => void;
  setStrokeWidth: (strokeWidth?: number) => void;
}

export const useShapeStore = create<ShapeState>()(
  devtools(
    (set) => ({
      shape: undefined,
      origin: new Vector(),
      strokeWidth: 2,
      strokeColor: { r: 0, g: 0, b: 0, a: 1 },
      fillColor: { r: 255, g: 255, b: 255, a: 1 },
      setShape: (shape) => set((state) => ({ ...state, shape })),
      setStrokeColor: (strokeColor) =>
        set((state) => ({ ...state, strokeColor })),
      setFillColor: (fillColor) => set((state) => ({ ...state, fillColor })),
      setStrokeWidth: (strokeWidth) =>
        set((state) => ({ ...state, strokeWidth })),
    }),
    { name: "brushStore", enabled: false || envIsDevelopment }
  )
);

export function doShapeStart(e: MouseEvent<HTMLDivElement>): void {
  const doodler = getDoodler();
  const { addShape } = useCanvasStore.getState();
  const { setShape, origin, fillColor, strokeColor, strokeWidth } =
    useShapeStore.getState();

  const position = doodler.zui.clientToSurface(eventToClientPosition(e));
  origin.set(position.x, position.y);

  const shape = doodler.two.makeRectangle(position.x, position.y, 1, 1);
  shape.stroke = colord(strokeColor).toRgbString();
  shape.fill = colord(fillColor).toRgbString();
  if (strokeWidth) {
    shape.linewidth = strokeWidth;
  } else {
    shape.noStroke();
  }
  addShape(shape);
  setShape(shape);
  doodler.throttledTwoUpdate();
}

export function doShapeMove(e: MouseEvent<HTMLDivElement>): void {
  const doodler = getDoodler();
  const { shape, origin } = useShapeStore.getState();
  const position = eventToSurfacePosition(e, doodler.zui);
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

    doodler.throttledTwoUpdate();
  }
}

export function doShapeUp() {
  const { setShape } = useShapeStore.getState();
  setShape(undefined);
}
