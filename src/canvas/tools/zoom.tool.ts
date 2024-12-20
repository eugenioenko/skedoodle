import { MouseEvent } from "react";
import { create } from "zustand";
import { getDoodler } from "../doodle.client";
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

  doodler.throttledTwoUpdate();
}

export function doZoomReset(): void {
  const doodler = getDoodler();
  const { setZoom } = useZoomStore.getState();

  doodler.zui.reset();
  doodler.zui.translateSurface(0, 0);
  setZoom(100);
  doodler.two.update();
  doodler.throttledTwoUpdate();
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
      console.log("Pinch to zoom in");
    } else {
      console.log("Pinch to zoom out");
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
