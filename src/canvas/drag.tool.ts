import { MouseEvent } from "react";
import Two from "two.js";
import { ctx } from "./canvas.service";

let mouse = new Two.Vector();

export function doDragStart(e: MouseEvent<HTMLDivElement>): void {
  mouse.set(e.clientX, e.clientY);
}

export function doDragMove(e: MouseEvent<HTMLDivElement>): void {
  const { zui } = ctx();
  var dx = e.clientX - mouse.x;
  var dy = e.clientY - mouse.y;
  zui.translateSurface(dx, dy);
  mouse.set(e.clientX, e.clientY);
}
