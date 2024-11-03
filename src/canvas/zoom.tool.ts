import { ctx } from "./canvas.service";

import { envIsDevelopment } from "@/environment";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type Tool = "hand" | "pointer" | "brush";

export interface ZoomState {
  zoom: number;
  setZoom: (zoom?: number) => void;
}

export const useZoomStore = create<ZoomState>()(
  devtools(
    (set) => ({
      zoom: 100,
      setZoom: (zoom) => set((state) => ({ ...state, zoom })),
    }),
    { name: "zoomStore", enabled: false || envIsDevelopment }
  )
);

export function doZoom(e: WheelEvent): void {
  const { zui } = ctx();
  const { setZoom } = useZoomStore.getState();
  var dy = -e.deltaY / 1000;

  zui.zoomBy(dy, e.clientX, e.clientY);
  setZoom(Math.floor(zui.scale * 100));
}
