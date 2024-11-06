import { MouseEvent } from "react";
import { ctx } from "./canvas.service";

import { Path } from "two.js/src/path";
import { isPointInRect, mouseEventToPosition } from "./canvas.utils";
import { useCanvasStore } from "./canvas.store";

export function doDeleteShape(e: MouseEvent<HTMLDivElement>) {
  const { canvas } = ctx();
  const { removeShape } = useCanvasStore.getState();
  const pointer = mouseEventToPosition(e);
  const shapes = canvas.children.filter(
    (shape) => (shape as Path).getBoundingClientRect
  );

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
      return;
    }
  }
}
