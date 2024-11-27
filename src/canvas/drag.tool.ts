import { MouseEvent } from "react";
import Two from "two.js";
import { ctx } from "./canvas.service";

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
  const { doodler } = ctx();
  doodler.zui.translateSurface(dx, dy);
  doodler.throttledTwoUpdate();
}
