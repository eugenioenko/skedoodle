import { create } from "zustand";
import { Doodler } from "./doodler.client";
import { Point } from "@/models/point.model";
import { RgbaColor } from "colord";
import { persist } from "zustand/middleware";
import { Doodle } from "./doodle.utils";

export type Tool =
  | "hand"
  | "pointer"
  | "brush"
  | "square"
  | "line"
  | "arrow"
  | "text"
  | "eraser"
  | "zoom"
  | "bezier";

export interface CanvasState {
  doodler?: Doodler;
  cursor?: Point;
  container?: HTMLDivElement;
  doodles: Doodle[];
  setDoodler: (doodler: Doodler) => void;
  setContainer: (container?: HTMLDivElement | undefined) => void;
  setCursor: (cursor?: Point) => void;
  setDoodles: (doodles: Doodle[]) => void;
}

export const useCanvasStore = create<CanvasState>()((set) => ({
  doodler: undefined,
  cursor: undefined,
  doodles: [],
  setDoodler: (doodler) => set(() => ({ doodler })),
  setContainer: (container) => set(() => ({ container })),
  setCursor: (cursor) => set(() => ({ cursor })),
  setDoodles: (doodles) => set(() => ({ doodles })),
}));

export interface OptionsState {
  canvasColor: RgbaColor;
  throttleRate: number;
  selectedTool?: Tool;
  activeTool?: Tool;
  toolOption?: string;
  restoreTool?: Tool;
  isPanelOpen: boolean;
  showGrid: boolean;
  gridSize: number;
  setSelectedTool: (tool?: Tool) => void;
  setActiveTool: (tool?: Tool) => void;
  setRestoreTool: (tool?: Tool) => void;
  setToolOption: (option: string) => void;
  setCanvasColor: (canvasColor: RgbaColor) => void;
  setThrottleRate: (throttleRate: number) => void;
  setIsPanelOpen: (isPanelOpen: boolean) => void;
  setShowGrid: (showGrid: boolean) => void;
  setGridSize: (gridSize: number) => void;
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
      isPanelOpen: true,
      showGrid: true,
      gridSize: 20,
      setSelectedTool: (selectedTool) => set(() => ({ selectedTool })),
      setActiveTool: (activeTool) => set(() => ({ activeTool })),
      setRestoreTool: (restoreTool) => set(() => ({ restoreTool })),
      setToolOption: (toolOption) => set(() => ({ toolOption })),
      setCanvasColor: (canvasColor) => set(() => ({ canvasColor })),
      setThrottleRate: (throttleRate) => set(() => ({ throttleRate })),
      setIsPanelOpen: (isPanelOpen) => set(() => ({ isPanelOpen })),
      setShowGrid: (showGrid) => set(() => ({ showGrid })),
      setGridSize: (gridSize) => set(() => ({ gridSize })),
    }),
    { name: "options", version: 1 }
  )
);
