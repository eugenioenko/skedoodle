import { MouseEvent } from "react";
import { ctx } from "./canvas.service";

import { isPointInRect, eventToClientPosition } from "./canvas.utils";
import { useCanvasStore } from "./canvas.store";
import { Path } from "two.js/src/path";
import { usePointerStore } from "./pointer.tool";

export function doDeleteShape(e: MouseEvent<HTMLDivElement>) {
  const { canvas } = ctx();
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
      return;
    }
  }
}
