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
  selectedTool?: Tool;
  activeTool?: Tool;
  toolOption?: string;
  restoreTool?: Tool;
  doodler?: Doodler;
  cursor?: Point;
  container?: HTMLDivElement;
  shapes: Shape[];
  setSelectedTool: (tool?: Tool) => void;
  setActiveTool: (tool?: Tool) => void;
  setRestoreTool: (tool?: Tool) => void;
  setToolOption: (option: string) => void;
  setDoodler: (doodler: Doodler) => void;
  setContainer: (container?: HTMLDivElement | undefined) => void;
  setCursor: (cursor?: Point) => void;
  addShape: (shape: Shape) => void;
  removeShape: (shape: Shape) => void;
}

export const useCanvasStore = create<CanvasState>()((set) => ({
  selectedTool: "bezier",
  activeTool: undefined,
  restoreTool: undefined,
  doodler: undefined,
  cursor: undefined,
  shapes: [],
  toolOption: "",
  setSelectedTool: (selectedTool) => set(() => ({ selectedTool })),
  setActiveTool: (activeTool) => set(() => ({ activeTool })),
  setRestoreTool: (restoreTool) => set(() => ({ restoreTool })),
  setToolOption: (toolOption) => set(() => ({ toolOption })),
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

export interface SettingsState {
  canvasColor: RgbaColor;
  throttleRate: number;
  setCanvasColor: (canvasColor: RgbaColor) => void;
  setThrottleRate: (throttleRate: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      canvasColor: { r: 249, g: 250, b: 251, a: 1 },
      throttleRate: 1,
      setCanvasColor: (canvasColor) => set(() => ({ canvasColor })),
      setThrottleRate: (throttleRate) => set(() => ({ throttleRate })),
    }),
    { name: "settings", version: 1 }
  )
);
