import { MouseEvent } from "react";
import { ctx } from "./canvas.service";

import { isPointInRect, mouseEventToPosition } from "./canvas.utils";
import { useCanvasStore } from "./canvas.store";
import { Path } from "two.js/src/path";

export function doDeleteShape(e: MouseEvent<HTMLDivElement>) {
  const { canvas } = ctx();
  const { removeShape } = useCanvasStore.getState();
  const pointer = mouseEventToPosition(e);

  const shapes: Path[] = canvas.children.filter(
    (shape) => (shape as Path).getBoundingClientRect
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
      return;
    }
  }
}
