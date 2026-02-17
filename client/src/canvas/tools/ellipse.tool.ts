import { MouseEvent } from "react";

import { colord } from "colord";
import { eventToSurfacePosition, eventToClientPosition } from "../canvas.utils";
import { getDoodler } from "../doodler.client";
import { useSquareStore } from "./square.tool";
import { Ellipse } from "two.js/src/shapes/ellipse";
import { pushCreateCommand } from "../history.service";

let activeEllipse: Ellipse | undefined;
let originX = 0;
let originY = 0;

export function doEllipseStart(e: MouseEvent<HTMLDivElement>): void {
  const doodler = getDoodler();
  const { fillColor, strokeColor, strokeWidth } = useSquareStore.getState();

  const position = doodler.zui.clientToSurface(eventToClientPosition(e));
  originX = position.x;
  originY = position.y;

  const ellipse = doodler.two.makeEllipse(position.x, position.y, 0.5, 0.5);

  ellipse.stroke = colord(strokeColor).toRgbString();
  ellipse.fill = colord(fillColor).toRgbString();
  if (strokeWidth) {
    ellipse.linewidth = strokeWidth;
  } else {
    ellipse.noStroke();
  }

  doodler.addDoodle({ shape: ellipse, type: "ellipse" });
  activeEllipse = ellipse;
  doodler.throttledTwoUpdate();
}

export function doEllipseMove(e: MouseEvent<HTMLDivElement>): void {
  const doodler = getDoodler();
  if (!activeEllipse) return;

  const position = eventToSurfacePosition(e, doodler.zui);

  const w = position.x - originX;
  const h = position.y - originY;

  activeEllipse.width = Math.abs(w);
  activeEllipse.height = Math.abs(h);
  activeEllipse.position.x = originX + w / 2;
  activeEllipse.position.y = originY + h / 2;

  doodler.throttledTwoUpdate();
}

export function doEllipseUp(): void {
  if (activeEllipse) {
    pushCreateCommand({ shape: activeEllipse, type: "ellipse" });
  }
  activeEllipse = undefined;
}
