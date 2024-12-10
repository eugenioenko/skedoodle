import { create } from "zustand";
import { Shape } from "two.js/src/shape";
import { Doodler } from "./doodle.service";
import { Point } from "@/models/point.model";

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
  selectedTool: "brush",
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
