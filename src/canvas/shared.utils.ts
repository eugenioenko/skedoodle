import { Path } from "msw";
import { ctx } from "./canvas.service";
import { eventToClientPosition, isPointInRect } from "./canvas.utils";
import { usePointerStore } from "./pointer.tool";
import { MouseEvent } from "react";

export function doTryHighlight(e: MouseEvent<HTMLDivElement>): void {
  const { zui, canvas } = ctx();
  const { highlighted, setHighlight, clearHighlight } =
    usePointerStore.getState();

  const pointer = eventToClientPosition(e);
  const shapes: Path[] = canvas.children.filter(
    (shape) => (shape as Path).getBoundingClientRect && (shape as Path).visible
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

    if (!isShapeWithin || (shape as any).isHighlight) {
      continue;
    }

    if (highlighted === shape) {
      return;
    }

    const pos = zui.clientToSurface({
      x: item.left + item.width / 2,
      y: item.top + item.height / 2,
    });

    const border = {
      x: pos.x,
      y: pos.y,
      width: item.width / zui.scale,
      height: item.height / zui.scale,
    };
    setHighlight(shape, border);
    return;
  }
  clearHighlight();
}
