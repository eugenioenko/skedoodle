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
  setSelectedTool: (tool?: Tool) => void;
  setActiveTool: (tool?: Tool) => void;
  setRestoreTool: (tool?: Tool) => void;
  setToolOption: (option: string) => void;
  setCanvasColor: (canvasColor: RgbaColor) => void;
  setThrottleRate: (throttleRate: number) => void;
  setIsPanelOpen: (isPanelOpen: boolean) => void;
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
      setSelectedTool: (selectedTool) => set(() => ({ selectedTool })),
      setActiveTool: (activeTool) => set(() => ({ activeTool })),
      setRestoreTool: (restoreTool) => set(() => ({ restoreTool })),
      setToolOption: (toolOption) => set(() => ({ toolOption })),
      setCanvasColor: (canvasColor) => set(() => ({ canvasColor })),
      setThrottleRate: (throttleRate) => set(() => ({ throttleRate })),
      setIsPanelOpen: (isPanelOpen) => set(() => ({ isPanelOpen })),
    }),
    { name: "options", version: 1 }
  )
);
