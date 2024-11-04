import { envIsDevelopment } from "@/environment";
import Two from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { Group } from "two.js/src/group";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Coordinates } from "./canvas.service";

export type Tool = "hand" | "pointer" | "brush" | "square";

export interface CanvasState {
  selectedTool?: Tool;
  activeTool?: Tool;
  two?: Two;
  zui?: ZUI;
  canvas?: Group;
  cursor?: Coordinates;
  container?: HTMLDivElement;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fillOpacity?: number;
  strokeOpacity?: number;
  setSelectedTool: (tool?: Tool) => void;
  setActiveTool: (tool?: Tool) => void;
  setTwo: (two?: Two) => void;
  setCanvas: (canvas?: Group | undefined) => void;
  setZui: (zui?: ZUI | undefined) => void;
  setContainer: (container?: HTMLDivElement | undefined) => void;
  setCursor: (cursor?: Coordinates) => void;
  setFillColor: (color: string) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFillOpacity: (opacity: number) => void;
  setStrokeOpacity: (opacity: number) => void;
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
      fillColor: "#000000",
      strokeColor: "#222222",
      strokeWidth: 30,
      fillOpacity: 1,
      strokeOpacity: 1,
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
