import { envIsDevelopment } from "@/environment";
import Two from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { Group } from "two.js/src/group";
import { create } from "zustand";
import { Coordinates } from "./canvas.service";
import { Shape } from "two.js/src/shape";

export type Tool = "hand" | "pointer" | "brush" | "square" | "eraser";

export interface CanvasState {
  selectedTool?: Tool;
  activeTool?: Tool;
  toolOption?: string;
  restoreTool?: Tool;
  two?: Two;
  zui?: ZUI;
  canvas?: Group;
  cursor?: Coordinates;
  container?: HTMLDivElement;
  shapes: Shape[];
  setSelectedTool: (tool?: Tool) => void;
  setActiveTool: (tool?: Tool) => void;
  setRestoreTool: (tool?: Tool) => void;
  setToolOption: (option: string) => void;
  setTwo: (two?: Two) => void;
  setCanvas: (canvas?: Group | undefined) => void;
  setZui: (zui?: ZUI | undefined) => void;
  setContainer: (container?: HTMLDivElement | undefined) => void;
  setCursor: (cursor?: Coordinates) => void;
  addShape: (shape: Shape) => void;
  removeShape: (shape: Shape) => void;
}

export const useCanvasStore = create<CanvasState>()((set) => ({
  selectedTool: "brush",
  activeTool: undefined,
  restoreTool: undefined,
  two: undefined,
  canvas: undefined,
  zui: undefined,
  cursor: undefined,
  shapes: [],
  toolOption: "",
  setSelectedTool: (selectedTool) =>
    set((state) => ({ ...state, selectedTool })),
  setActiveTool: (activeTool) => set((state) => ({ ...state, activeTool })),
  setRestoreTool: (restoreTool) => set((state) => ({ ...state, restoreTool })),
  setToolOption: (toolOption) => set((state) => ({ ...state, toolOption })),
  setTwo: (two) => set((state) => ({ ...state, two })),
  setCanvas: (canvas) => set((state) => ({ ...state, canvas })),
  setZui: (zui) => set((state) => ({ ...state, zui })),
  setContainer: (container) => set((state) => ({ ...state, container })),
  setCursor: (cursor) => set((state) => ({ ...state, cursor })),
  addShape: (shape) =>
    set((state) => {
      state.canvas?.add?.(shape);
      return {
        ...state,
        shapes: [...state.shapes, shape],
      };
    }),
  removeShape: (shape) =>
    set((state) => {
      state.canvas?.remove?.(shape);
      return {
        ...state,
        shapes: state.shapes.filter((sh) => sh !== shape),
      };
    }),
}));
