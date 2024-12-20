import { MouseEvent } from "react";

import { Path } from "two.js/src/path";
import { useCanvasStore } from "../canvas.store";
import { eventToClientPosition, isPointInRect } from "../canvas.utils";
import { getDoodler } from "../doodle.client";
import { usePointerStore } from "./pointer.tool";

export function doDeleteShape(e: MouseEvent<HTMLDivElement>) {
  const doodler = getDoodler();
  const { removeShape, shapes: canvasShapes } = useCanvasStore.getState();
  const { clearHighlight } = usePointerStore.getState();
  const pointer = eventToClientPosition(e);

  const shapes: Path[] = canvasShapes.filter(
    (shape) =>
      (shape as Path).getBoundingClientRect && !(shape as any).isHighlight
  ) as Path[];

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
      removeShape(shape);
      clearHighlight();
      // TODO recalculate selection when deleted shape is from the selection
      doodler.throttledTwoUpdate();
      return;
    }
  }
}
