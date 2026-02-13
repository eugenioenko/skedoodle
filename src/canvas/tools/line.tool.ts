import { MouseEvent } from "react";

import Two from "two.js";
import { colord, RgbaColor } from "colord";
import { Path } from "two.js/src/path";
import { Vector } from "two.js/src/vector";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { eventToClientPosition, eventToSurfacePosition } from "../canvas.utils";
import { getDoodler } from "../doodler.client";
import { pushCreateCommand } from "../history.service";
import { DoodleType } from "../doodle.utils";

export interface LineState {
  line?: Path;
  arrowHead?: Path;
  arrowTail?: Path;
  origin: Vector;
  strokeWidth: number;
  strokeColor: RgbaColor;
  hasArrow: boolean;
  doubleArrow: boolean;
  setLine: (line?: Path) => void;
  setArrowHead: (arrowHead?: Path) => void;
  setArrowTail: (arrowTail?: Path) => void;
  setStrokeWidth: (strokeWidth: number) => void;
  setStrokeColor: (strokeColor: RgbaColor) => void;
  setHasArrow: (hasArrow: boolean) => void;
  setDoubleArrow: (doubleArrow: boolean) => void;
}

export const useLineStore = create<LineState>()(
  persist(
    (set) => ({
      line: undefined,
      arrowHead: undefined,
      arrowTail: undefined,
      origin: new Vector(),
      strokeWidth: 3,
      strokeColor: { r: 33, g: 33, b: 33, a: 1 },
      hasArrow: false,
      doubleArrow: false,
      setLine: (line) => set(() => ({ line })),
      setArrowHead: (arrowHead) => set(() => ({ arrowHead })),
      setArrowTail: (arrowTail) => set(() => ({ arrowTail })),
      setStrokeWidth: (strokeWidth) => set(() => ({ strokeWidth })),
      setStrokeColor: (strokeColor) => set(() => ({ strokeColor })),
      setHasArrow: (hasArrow) => set(() => ({ hasArrow })),
      setDoubleArrow: (doubleArrow) => set(() => ({ doubleArrow })),
    }),
    {
      name: "line-tool",
      version: 1,
      partialize: (state) => ({
        strokeWidth: state.strokeWidth,
        strokeColor: state.strokeColor,
      }),
    }
  )
);

export function doLineStart(e: MouseEvent<HTMLDivElement>): void {
  const doodler = getDoodler();
  const {
    setLine, setArrowHead, setArrowTail, origin,
    strokeColor, strokeWidth, hasArrow, doubleArrow,
  } = useLineStore.getState();

  const position = doodler.zui.clientToSurface(eventToClientPosition(e));
  origin.set(position.x, position.y);
  const color = colord(strokeColor).toRgbString();

  const startAnchor = new Two.Anchor(position.x, position.y);
  const endAnchor = new Two.Anchor(position.x, position.y);

  const line = new Path([startAnchor, endAnchor], false, false);
  line.cap = "round";
  line.noFill().stroke = color;
  line.linewidth = strokeWidth;

  const doodleType: DoodleType = hasArrow ? "arrow" : "line";
  doodler.addDoodle({ shape: line, type: doodleType });
  setLine(line);

  if (hasArrow) {
    const arrowHead = makeArrowHead(position, position, strokeWidth, color);
    doodler.addDoodle({ shape: arrowHead, type: "arrow" });
    setArrowHead(arrowHead);

    if (doubleArrow) {
      const arrowTail = makeArrowHead(position, position, strokeWidth, color);
      doodler.addDoodle({ shape: arrowTail, type: "arrow" });
      setArrowTail(arrowTail);
    }
  }

  doodler.throttledTwoUpdate();
}

export function doLineMove(e: MouseEvent<HTMLDivElement>): void {
  const doodler = getDoodler();
  const { line, arrowHead, arrowTail, hasArrow, strokeWidth } =
    useLineStore.getState();
  if (!line) return;

  const position = eventToSurfacePosition(e, doodler.zui);
  const start = line.vertices[0];
  const endVertex = line.vertices[1];
  endVertex.x = position.x;
  endVertex.y = position.y;

  if (hasArrow && arrowHead) {
    updateArrowHead(arrowHead, start, position, strokeWidth);
  }
  if (hasArrow && arrowTail) {
    // Tail points in the reverse direction (from end toward start)
    updateArrowHead(arrowTail, position, start, strokeWidth);
  }

  doodler.throttledTwoUpdate();
}

export function doLineUp(): void {
  const { line, arrowHead, arrowTail, hasArrow, setLine, setArrowHead, setArrowTail } =
    useLineStore.getState();

  if (line) {
    const doodleType: DoodleType = hasArrow ? "arrow" : "line";
    pushCreateCommand(
      hasArrow ? "Draw arrow" : "Draw line",
      { shape: line, type: doodleType }
    );
  }
  if (hasArrow && arrowHead) {
    pushCreateCommand("Draw arrowhead", { shape: arrowHead, type: "arrow" });
  }
  if (hasArrow && arrowTail) {
    pushCreateCommand("Draw arrowhead", { shape: arrowTail, type: "arrow" });
  }

  setLine(undefined);
  setArrowHead(undefined);
  setArrowTail(undefined);
}

function makeArrowHead(
  start: { x: number; y: number },
  end: { x: number; y: number },
  strokeWidth: number,
  color: string
): Path {
  const size = Math.max(strokeWidth * 3, 10);
  const angle = Math.atan2(end.y - start.y, end.x - start.x);

  const tip = new Two.Anchor(end.x, end.y);
  const left = new Two.Anchor(
    end.x - size * Math.cos(angle - Math.PI / 6),
    end.y - size * Math.sin(angle - Math.PI / 6)
  );
  const right = new Two.Anchor(
    end.x - size * Math.cos(angle + Math.PI / 6),
    end.y - size * Math.sin(angle + Math.PI / 6)
  );

  const head = new Path([tip, left, right], false, false);
  head.closed = true;
  head.fill = color;
  head.noStroke();

  return head;
}

function updateArrowHead(
  head: Path,
  start: { x: number; y: number },
  end: { x: number; y: number },
  strokeWidth: number
): void {
  const size = Math.max(strokeWidth * 3, 10);
  const angle = Math.atan2(end.y - start.y, end.x - start.x);

  const tip = head.vertices[0];
  const left = head.vertices[1];
  const right = head.vertices[2];

  tip.x = end.x;
  tip.y = end.y;
  left.x = end.x - size * Math.cos(angle - Math.PI / 6);
  left.y = end.y - size * Math.sin(angle - Math.PI / 6);
  right.x = end.x - size * Math.cos(angle + Math.PI / 6);
  right.y = end.y - size * Math.sin(angle + Math.PI / 6);
}
