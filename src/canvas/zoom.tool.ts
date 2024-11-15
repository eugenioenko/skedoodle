import { ctx } from "./canvas.service";

import { envIsDevelopment } from "@/environment";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { usePointerStore } from "./pointer.tool";
import { MouseEvent } from "react";

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
  const { zui } = ctx();
  const { setZoom } = useZoomStore.getState();
  var dy = amount / 100;

  zui.zoomBy(dy, e.clientX, e.clientY);
  setZoom(Math.floor(zui.scale * 100));

  const { selected, highlight } = usePointerStore.getState();

  for (const item of selected) {
    item.border.linewidth = 1.5 / zui.scale;
  }

  if (highlight) {
    highlight.border.linewidth = 1.5 / zui.scale;
  }
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
