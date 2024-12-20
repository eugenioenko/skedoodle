import { create } from "zustand";
import { Shape } from "two.js/src/shape";
import { Doodler } from "./doodle.service";
import { Point } from "@/models/point.model";
import { RgbaColor } from "colord";
import { persist } from "zustand/middleware";

export type Tool =
  | "hand"
  | "pointer"
  | "brush"
  | "square"
  | "eraser"
  | "zoom"
  | "bezier";

export interface CanvasState {
  doodler?: Doodler;
  cursor?: Point;
  container?: HTMLDivElement;
  shapes: Shape[];
  setDoodler: (doodler: Doodler) => void;
  setContainer: (container?: HTMLDivElement | undefined) => void;
  setCursor: (cursor?: Point) => void;
  addShape: (shape: Shape) => void;
  removeShape: (shape: Shape) => void;
}

export const useCanvasStore = create<CanvasState>()((set) => ({
  doodler: undefined,
  cursor: undefined,
  shapes: [],

  setDoodler: (doodler) => set(() => ({ doodler })),
  setContainer: (container) => set(() => ({ container })),
  setCursor: (cursor) => set(() => ({ cursor })),
  addShape: (shape) =>
    set((state) => {
      state.doodler?.canvas?.add?.(shape);
      return {
        shapes: [...state.shapes, shape],
      };
    }),
  removeShape: (shape) =>
    set((state) => {
      state.doodler?.canvas?.remove?.(shape);
      return {
        shapes: state.shapes.filter((sh) => sh !== shape),
      };
    }),
}));

export interface OptionsState {
  canvasColor: RgbaColor;
  throttleRate: number;
  selectedTool?: Tool;
  activeTool?: Tool;
  toolOption?: string;
  restoreTool?: Tool;
  setSelectedTool: (tool?: Tool) => void;
  setActiveTool: (tool?: Tool) => void;
  setRestoreTool: (tool?: Tool) => void;
  setToolOption: (option: string) => void;
  setCanvasColor: (canvasColor: RgbaColor) => void;
  setThrottleRate: (throttleRate: number) => void;
}

export const useOptionsStore = create<OptionsState>()(
  persist(
    (set) => ({
      canvasColor: { r: 249, g: 250, b: 251, a: 1 },
      throttleRate: 1,
      selectedTool: "brush",
      activeTool: undefined,
      restoreTool: undefined,
      toolOption: "",
      setSelectedTool: (selectedTool) => set(() => ({ selectedTool })),
      setActiveTool: (activeTool) => set(() => ({ activeTool })),
      setRestoreTool: (restoreTool) => set(() => ({ restoreTool })),
      setToolOption: (toolOption) => set(() => ({ toolOption })),
      setCanvasColor: (canvasColor) => set(() => ({ canvasColor })),
      setThrottleRate: (throttleRate) => set(() => ({ throttleRate })),
    }),
    { name: "options", version: 1 }
  )
);
