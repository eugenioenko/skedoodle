import { MouseEvent } from "react";

import { Path } from "two.js/src/path";
import { useCanvasStore } from "../canvas.store";
import { eventToClientPosition, isPointInRect } from "../canvas.utils";
import { getDoodler } from "../doodle.client";
import { usePointerStore } from "./pointer.tool";

export function doDeleteShape(e: MouseEvent<HTMLDivElement>) {
  const doodler = getDoodler();
  const { doodles } = useCanvasStore.getState();
  const { clearHighlight } = usePointerStore.getState();
  const pointer = eventToClientPosition(e);

  for (const doodle of doodles) {
    const item = doodle.shape.getBoundingClientRect(false);
    const isShapeWithin = isPointInRect(
      pointer.x,
      pointer.y,
      item.left,
      item.top,
      item.right,
      item.bottom
    );
    if (isShapeWithin) {
      doodler.removeDoodle(doodle);
      clearHighlight();
      // TODO recalculate selection when deleted shape is from the selection
      doodler.throttledTwoUpdate();
      return;
    }
  }
}
