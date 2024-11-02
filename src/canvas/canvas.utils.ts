import { MouseEvent } from "react";
import { useCanvasStore } from "./canvas.store";
import { Coordinates } from "./canvas.service";
import { ZUI } from "two.js/extras/jsm/zui";

export function eventToGlobalPosition(
  e: MouseEvent<HTMLDivElement>,
  zui?: ZUI
): Coordinates {
  zui = zui || (useCanvasStore.getState().zui as ZUI);
  const rect = e.currentTarget.getBoundingClientRect();
  const position = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
  return zui.clientToSurface(position);
}

export function mouseEventToPosition(e: MouseEvent<HTMLDivElement>): {
  x: number;
  y: number;
} {
  const rect = e.currentTarget.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}
