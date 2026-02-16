import { MouseEvent } from "react";
import { create } from "zustand";
import { getDoodler } from "../doodler.client";
import { updateGrid } from "../canvas.grid";
import { usePointerStore } from "./pointer.tool";

export interface ZoomState {
  zoom: number;
  initialDistance?: number;
  setZoom: (zoom?: number) => void;
  setInitialDistance: (initialDistance?: number) => void;
}

export const useZoomStore = create<ZoomState>()((set) => ({
  zoom: 100,
  setZoom: (zoom) => set((state) => ({ ...state, zoom })),
  initialDistance: undefined,
  setInitialDistance: (initialDistance) =>
    set((state) => ({ ...state, initialDistance })),
}));

export function onZoomStart(e: TouchEvent): void {
  const { setInitialDistance } = useZoomStore.getState();
  if (e.touches.length === 2) {
    // Calculate the initial distance between two fingers
    const [touch1, touch2] = e.touches;
    const initialDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
    setInitialDistance(initialDistance);
  }
}

export function doZoom(
  e: WheelEvent | MouseEvent<HTMLDivElement>,
  amount: number
): void {
  const doodler = getDoodler();
  const { setZoom } = useZoomStore.getState();
  var dy = amount / 100;

  doodler.zui.zoomBy(dy, e.clientX, e.clientY);
  setZoom(Math.floor(doodler.zui.scale * 100));

  const { outlines } = usePointerStore.getState();

  for (const outline of Object.values(outlines)) {
    if (outline) {
      outline.linewidth = 1.5 / doodler.zui.scale;
    }
  }

  const sm = doodler.zui.surfaceMatrix.elements;
  updateGrid(doodler.zui.scale, sm[2], sm[5]);
  doodler.throttledTwoUpdate();
  doodler.saveViewport();
}

export function doZoomTo(level: number): void {
  const doodler = getDoodler();
  const { setZoom } = useZoomStore.getState();
  const currentScale = doodler.zui.scale;
  const targetScale = level / 100;
  const ratio = targetScale / currentScale;

  const cx = doodler.two.width / 2;
  const cy = doodler.two.height / 2;
  doodler.zui.zoomBy(ratio - 1, cx, cy);
  setZoom(Math.floor(doodler.zui.scale * 100));

  const { outlines } = usePointerStore.getState();
  for (const outline of Object.values(outlines)) {
    if (outline) {
      outline.linewidth = 1.5 / doodler.zui.scale;
    }
  }

  const sm = doodler.zui.surfaceMatrix.elements;
  updateGrid(doodler.zui.scale, sm[2], sm[5]);
  doodler.throttledTwoUpdate();
  doodler.saveViewport();
}

export function doZoomStep(direction: 1 | -1): void {
  const doodler = getDoodler();
  const { setZoom } = useZoomStore.getState();
  const currentScale = doodler.zui.scale;
  const currentPercent = Math.round(currentScale * 100);

  const STEPS = [10, 25, 50, 75, 100, 150, 200, 300, 400];
  let target: number;
  if (direction === 1) {
    target = STEPS.find((s) => s > currentPercent) ?? STEPS[STEPS.length - 1];
  } else {
    target = [...STEPS].reverse().find((s) => s < currentPercent) ?? STEPS[0];
  }

  const targetScale = target / 100;
  const ratio = targetScale / currentScale;
  const cx = doodler.two.width / 2;
  const cy = doodler.two.height / 2;
  doodler.zui.zoomBy(ratio - 1, cx, cy);
  setZoom(Math.floor(doodler.zui.scale * 100));

  const { outlines } = usePointerStore.getState();
  for (const outline of Object.values(outlines)) {
    if (outline) {
      outline.linewidth = 1.5 / doodler.zui.scale;
    }
  }

  const sm = doodler.zui.surfaceMatrix.elements;
  updateGrid(doodler.zui.scale, sm[2], sm[5]);
  doodler.throttledTwoUpdate();
  doodler.saveViewport();
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

/*
function onZoomMove(event): void {
  const { initialDistance, setInitialDistance } = useZoomStore.getState();
  if (event.touches.length === 2 && initialDistance !== undefined) {
    // Calculate the new distance between two fingers
    const [touch1, touch2] = event.touches;
    const currentDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );

    // If current distance is greater than initial, it's a zoom in; if less, zoom out
    if (currentDistance > initialDistance) {
     // pinch zoom in
    } else {

      // pinch zoom out
    }

    // Update the initial distance to the new distance
    setInitialDistance(currentDistance);
  }
}

export function onZoomEnd(event): void {
  const { setInitialDistance } = useZoomStore.getState();
  // Reset initial distance when gesture ends
  if (event.touches.length < 2) {
    setInitialDistance(undefined);
  }
}
  */
