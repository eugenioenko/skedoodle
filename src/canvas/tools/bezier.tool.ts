import { MouseEvent } from "react";
import { colord, RgbaColor } from "colord";
import Two from "two.js";
import { Path } from "two.js/src/path";
import { Anchor } from "two.js/src/anchor";
import { create } from "zustand";
import { ColorHighlight, eventToClientPosition } from "../canvas.utils";
import { getDoodler } from "../doodler.client";

export interface BezierState {
  path?: Path;
  preview?: Path;
  anchors: Anchor[];
  strokeColor: RgbaColor;
  strokeWidth: number;
  setPath: (path?: Path | undefined) => void;
  setPreview: (preview?: Path | undefined) => void;
  setAnchors: (anchors: Anchor[]) => void;
  setStrokeWidth: (strokeWidth?: number) => void;
  setStrokeColor: (strokeColor: RgbaColor) => void;
}

export const useBezierStore = create<BezierState>()((set) => ({
  path: undefined,
  preview: undefined,
  anchors: [],
  strokeWidth: 5,
  strokeColor: { r: 33, g: 33, b: 33, a: 1 },
  setStrokeColor: (strokeColor) => set(() => ({ strokeColor })),
  setPath: (path) => set(() => ({ path })),
  setPreview: (preview) => set(() => ({ preview })),
  setAnchors: (anchors) => set(() => ({ anchors })),
  setStrokeWidth: (strokeWidth) => set(() => ({ strokeWidth })),
}));

export function doBezierNext(e: MouseEvent<HTMLDivElement>): void {
  const doodler = getDoodler();
  const { setAnchors, setPath, strokeColor, strokeWidth, anchors, setPreview } =
    useBezierStore.getState();
  const lineColor = colord(strokeColor).toRgbString();

  const position = doodler.zui.clientToSurface(eventToClientPosition(e));
  const anchor = new Two.Anchor(position.x, position.y);
  const currAnchors = [...anchors, anchor];
  setAnchors(currAnchors);

  let path = useBezierStore.getState().path;

  if (!path) {
    const line = new Path([anchor], false, true);
    line.cap = "round";
    line.noFill().stroke = lineColor;
    line.linewidth = strokeWidth;
    setPath(line);
    path = line;
    doodler.canvas.add(line);

    // preview
    const preview = new Path(
      [anchor.clone() as never, anchor.clone() as never],
      false,
      true
    );
    preview.cap = "round";
    preview.noFill().stroke = ColorHighlight;
    preview.linewidth = 1;
    setPreview(preview);
    doodler.canvas.add(preview);
  } else {
    path.vertices.push(anchor);
    path.vertices.push(anchor);
  }

  doodler.throttledTwoUpdate();
}

export function doBezierMove(e: MouseEvent<HTMLDivElement>): void {
  const { preview, path } = useBezierStore.getState();
  const doodler = getDoodler();
  if (path?.vertices.length) {
    const lastPoint = path.vertices[path.vertices.length - 1];
    const position = doodler.zui.clientToSurface(eventToClientPosition(e));
    const anchorA = preview?.vertices[1] as Anchor;
    let anchorB = preview?.vertices[0] as Anchor;
    anchorA.x = lastPoint.x;
    anchorA.y = lastPoint.y;
    anchorB.x = position.x;
    anchorB.y = position.y;
    doodler.throttledTwoUpdate();
  }
  return;
  /*
  const doodler = getDoodler();
  const { controlPoints, setControlPoints, setPath, strokeColor, strokeWidth } =
    useBezierStore.getState();
  const { addShape } = useCanvasStore.getState();
  const fillColor = colord(strokeColor).toRgbString();

  const position = eventToSurfacePosition(e, doodler.zui);
  const newPoint = new Vector(position.x, position.y);

  if (controlPoints.length < 4) {
    // Add control points to build the curve
    setControlPoints([...controlPoints, newPoint]);
  }

  if (controlPoints.length === 4) {
    // Create or update the Bezier curve
    const curvePath = new Two.Path(
      controlPoints.map((p) => new Anchor(p.x, p.y)),
      false, // Closed path
      false, // Automatic curve creation
      true // Manual curve mode
    );
    curvePath.noFill().stroke = fillColor;
    curvePath.linewidth = strokeWidth;

    addShape(curvePath);
    setPath(curvePath);
  }

  doodler.throttledTwoUpdate();
  */
}

export function doBezierUp(): void {
  const doodler = getDoodler();
  doodler.throttledTwoUpdate();
}
