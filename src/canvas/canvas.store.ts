import { envIsDevelopment } from "@/environment";
import Two from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { Group } from "two.js/src/group";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Coordinates } from "./canvas.service";
import { RgbaColor } from "react-colorful";

export type Tool = "hand" | "pointer" | "brush" | "square";

export interface CanvasState {
  selectedTool?: Tool;
  activeTool?: Tool;
  two?: Two;
  zui?: ZUI;
  canvas?: Group;
  cursor?: Coordinates;
  container?: HTMLDivElement;
  fillColor?: RgbaColor;
  strokeColor?: RgbaColor;
  strokeWidth?: number;
  setSelectedTool: (tool?: Tool) => void;
  setActiveTool: (tool?: Tool) => void;
  setTwo: (two?: Two) => void;
  setCanvas: (canvas?: Group | undefined) => void;
  setZui: (zui?: ZUI | undefined) => void;
  setContainer: (container?: HTMLDivElement | undefined) => void;
  setCursor: (cursor?: Coordinates) => void;
  setFillColor: (color: RgbaColor) => void;
  setStrokeColor: (color: RgbaColor) => void;
  setStrokeWidth: (width: number) => void;
}

export const useCanvasStore = create<CanvasState>()(
  devtools(
    (set) => ({
      selectedTool: "brush",
      activeTool: undefined,
      two: undefined,
      canvas: undefined,
      zui: undefined,
      cursor: undefined,
      fillColor: { r: 222, g: 0, b: 0, a: 1 },
      strokeColor: { r: 22, g: 22, b: 22, a: 1 },
      strokeWidth: 30,
      setSelectedTool: (selectedTool) =>
        set((state) => ({ ...state, selectedTool })),
      setActiveTool: (activeTool) => set((state) => ({ ...state, activeTool })),
      setTwo: (two) => set((state) => ({ ...state, two })),
      setCanvas: (canvas) => set((state) => ({ ...state, canvas })),
      setZui: (zui) => set((state) => ({ ...state, zui })),
      setContainer: (container) => set((state) => ({ ...state, container })),
      setCursor: (cursor) => set((state) => ({ ...state, cursor })),
      setFillColor: (fillColor) => set((state) => ({ ...state, fillColor })),
      setStrokeColor: (strokeColor) =>
        set((state) => ({ ...state, strokeColor })),
      setStrokeWidth: (strokeWidth) =>
        set((state) => ({ ...state, strokeWidth })),
      setFillOpacity: (fillOpacity) =>
        set((state) => ({ ...state, fillOpacity })),
      setStrokeOpacity: (strokeOpacity) =>
        set((state) => ({ ...state, strokeOpacity })),
    }),
    { name: "canvasStore", enabled: false || envIsDevelopment }
  )
);
