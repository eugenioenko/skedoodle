import { MouseEvent } from "react";
import Two from "two.js";
import { getDoodler } from "../doodler.client";
import { updateGrid } from "../canvas.grid";

let mouse = new Two.Vector();

export function doDragStart(e: MouseEvent<HTMLDivElement>): void {
  mouse.set(e.clientX, e.clientY);
}

export function doDragMove(e: MouseEvent<HTMLDivElement>): void {
  var dx = e.clientX - mouse.x;
  var dy = e.clientY - mouse.y;
  mouse.set(e.clientX, e.clientY);
  doDragTranslate(dx, dy);
}

export function doDragTranslate(dx: number, dy: number) {
  const doodler = getDoodler();
  doodler.zui.translateSurface(dx, dy);
  const sm = doodler.zui.surfaceMatrix.elements;
  updateGrid(doodler.zui.scale, sm[2], sm[5]);
  doodler.throttledTwoUpdate();
  doodler.saveViewport();
}
