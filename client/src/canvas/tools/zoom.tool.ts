import { MouseEvent } from "react";
import { create } from "zustand";
import { getDoodler } from "../doodler.client";
import { updateGrid } from "../canvas.grid";
import { updateOutlineScales } from "./pointer.tool";
import { updateNodeHandleScales } from "./node.tool";
import { doDragTranslate } from "./drag.tool";

export interface ZoomState {
  zoom: number;
  lastMidX: number;
  lastMidY: number;
  lastDist: number;
  setZoom: (zoom?: number) => void;
  setGestureState: (midX: number, midY: number, dist: number) => void;
}

export const useZoomStore = create<ZoomState>()((set) => ({
  zoom: 100,
  lastMidX: 0,
  lastMidY: 0,
  lastDist: 0,
  setZoom: (zoom) => set((state) => ({ ...state, zoom })),
  setGestureState: (lastMidX, lastMidY, lastDist) =>
    set((state) => ({ ...state, lastMidX, lastMidY, lastDist })),
}));

function applyZoomAt(ratio: number, x: number, y: number): void {
  const doodler = getDoodler();
  const { setZoom } = useZoomStore.getState();
  doodler.zui.zoomBy(ratio - 1, x, y);
  setZoom(Math.floor(doodler.zui.scale * 100));
  updateOutlineScales();
  updateNodeHandleScales();
  const sm = doodler.zui.surfaceMatrix.elements;
  updateGrid(doodler.zui.scale, sm[2], sm[5]);
  doodler.throttledTwoUpdate();
  doodler.saveViewport();
}

export function onGestureStart(e: TouchEvent): void {
  if (e.touches.length !== 2) return;
  const [t1, t2] = e.touches;
  const midX = (t1.clientX + t2.clientX) / 2;
  const midY = (t1.clientY + t2.clientY) / 2;
  const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  useZoomStore.getState().setGestureState(midX, midY, dist);
}

export function onGestureMove(e: TouchEvent): void {
  if (e.touches.length !== 2) return;
  const { lastMidX, lastMidY, lastDist, setGestureState } = useZoomStore.getState();
  const [t1, t2] = e.touches;
  const midX = (t1.clientX + t2.clientX) / 2;
  const midY = (t1.clientY + t2.clientY) / 2;
  const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  doDragTranslate(midX - lastMidX, midY - lastMidY);
  if (lastDist > 0) {
    applyZoomAt(dist / lastDist, midX, midY);
  }

  setGestureState(midX, midY, dist);
}

export function doZoom(
  e: WheelEvent | MouseEvent<HTMLDivElement>,
  amount: number
): void {
  applyZoomAt(1 + amount / 100, e.clientX, e.clientY);
}

export function doZoomTo(level: number): void {
  const doodler = getDoodler();
  const ratio = (level / 100) / doodler.zui.scale;
  const cx = doodler.two.width / 2;
  const cy = doodler.two.height / 2;
  applyZoomAt(ratio, cx, cy);
}

export function doZoomStep(direction: 1 | -1): void {
  const doodler = getDoodler();
  const currentPercent = Math.round(doodler.zui.scale * 100);

  const STEPS = [10, 25, 50, 75, 100, 150, 200, 300, 400];
  const target = direction === 1
    ? STEPS.find((s) => s > currentPercent) ?? STEPS[STEPS.length - 1]
    : [...STEPS].reverse().find((s) => s < currentPercent) ?? STEPS[0];

  const ratio = (target / 100) / doodler.zui.scale;
  const cx = doodler.two.width / 2;
  const cy = doodler.two.height / 2;
  applyZoomAt(ratio, cx, cy);
}

export function doZoomReset(): void {
  const doodler = getDoodler();
  const { setZoom } = useZoomStore.getState();

  doodler.zui.reset();
  doodler.zui.translateSurface(0, 0);
  doodler.canvas.position.x = 0;
  doodler.canvas.position.y = 0;
  setZoom(100);
  updateGrid(1, 0, 0);
  doodler.throttledTwoUpdate();
  doodler.saveViewport();
}
