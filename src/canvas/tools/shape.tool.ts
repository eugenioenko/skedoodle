import { MouseEvent } from "react";

import { colord, RgbaColor } from "colord";
import { Vector } from "two.js/src/vector";
import { create } from "zustand";
import { eventToClientPosition, eventToSurfacePosition } from "../canvas.utils";
import { getDoodler } from "../doodler.client";
import { RoundedRectangle } from "two.js/src/shapes/rounded-rectangle";
import { pushCreateCommand } from "../history.service";

export interface ShapeState {
  shape?: RoundedRectangle;
  origin: Vector;
  strokeWidth: number;
  radius: number;
  strokeColor: RgbaColor;
  fillColor: RgbaColor;
  setShape: (shape?: RoundedRectangle | undefined) => void;
  setStrokeColor: (strokeColor: RgbaColor) => void;
  setFillColor: (strokeColor: RgbaColor) => void;
  setStrokeWidth: (strokeWidth?: number) => void;
  setRadius: (radius?: number) => void;
}

export const useShapeStore = create<ShapeState>()((set) => ({
  shape: undefined,
  origin: new Vector(),
  strokeWidth: 2,
  radius: 0,
  strokeColor: { r: 0, g: 0, b: 0, a: 1 },
  fillColor: { r: 255, g: 255, b: 255, a: 1 },
  setShape: (shape) => set(() => ({ shape })),
  setStrokeColor: (strokeColor) => set(() => ({ strokeColor })),
  setFillColor: (fillColor) => set(() => ({ fillColor })),
  setStrokeWidth: (strokeWidth) => set(() => ({ strokeWidth })),
  setRadius: (radius) => set(() => ({ radius })),
}));

export function doShapeStart(e: MouseEvent<HTMLDivElement>): void {
  const doodler = getDoodler();
  const { setShape, origin, fillColor, strokeColor, strokeWidth, radius } =
    useShapeStore.getState();

  const position = doodler.zui.clientToSurface(eventToClientPosition(e));
  origin.set(position.x, position.y);

  const shape = doodler.two.makeRoundedRectangle(
    position.x,
    position.y,
    1,
    1,
    radius
  );

  shape.stroke = colord(strokeColor).toRgbString();
  shape.fill = colord(fillColor).toRgbString();
  if (strokeWidth) {
    shape.linewidth = strokeWidth;
  } else {
    shape.noStroke();
  }
  doodler.addDoodle({ shape: shape, type: "rect" });
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
  const { shape, setShape } = useShapeStore.getState();
  if (shape) {
    pushCreateCommand("Draw rectangle", { shape, type: "rect" });
  }
  setShape(undefined);
}
