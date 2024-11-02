import { MouseEvent } from "react";
import Two from "two.js";
import { ctx } from "./canvas.client";

let line: any;
let mouse = new Two.Vector();

export function doBrushStart(e: MouseEvent<HTMLDivElement>): void {
  const { zui, two, canvas } = ctx();
  const position = zui.clientToSurface(mouseEventToPosition(e));
  mouse.set(position.x, position.y);

  const circle = two.makeCircle(position.x, position.y, 10);
  circle.fill = "#333";
  circle.noStroke();
  canvas.add(circle);

  line = null;
}

function mouseEventToPosition(e: MouseEvent<HTMLDivElement>): {
  x: number;
  y: number;
} {
  const rect = e.currentTarget.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

export function doBrushMove(e: MouseEvent<HTMLDivElement>): void {
  const { zui, canvas, two } = ctx();
  const position = zui.clientToSurface(mouseEventToPosition(e));
  if (!line) {
    const circle = two.makeCircle(position.x, position.y, 10);
    circle.fill = "#333";
    circle.noStroke();
    canvas.add(circle);

    // start new line
    line = two.makeCurve([makeAnchor(mouse), makeAnchor(position)], true);
    line.noFill().stroke = "#333";
    line.linewidth = 20;
    line.vertices.forEach(function (v) {
      v.addSelf(line.translation);
    });
    line.translation.clear();
    canvas.add(line);
  } else {
    // continue drawing
    let skipVertices = false;
    if (line.vertices.length) {
      const lastVertices = line.vertices[line.vertices.length - 1];
      const distance = Two.Vector.distanceBetween(lastVertices, position);
      if (distance < 10) {
        skipVertices = true;
      }
    }
    if (!skipVertices) {
      line.vertices.push(makeAnchor(position));
    }
  }
  mouse.set(position.x, position.y);
}

export function doBrushUp(e) {
  const { zui, canvas, two } = ctx();
  const position = zui.clientToSurface(mouseEventToPosition(e));
  line.vertices.push(makeAnchor(position));

  const circle = two.makeCircle(position.x, position.y, 10);
  circle.fill = "#333";
  circle.noStroke();
  canvas.add(circle);
}

function makeAnchor({ x, y }) {
  var anchor = new Two.Anchor(x, y);
  anchor.position = new Two.Vector().copy(anchor);
  return anchor;
}
