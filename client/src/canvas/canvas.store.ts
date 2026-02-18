import { create } from "zustand";
import type { Doodler } from "./doodler.client";
import { Point } from "@/models/point.model";
import { RgbaColor } from "colord";
import { persist } from "zustand/middleware";
import { Doodle } from "./doodle.utils";

export type Tool =
  | "hand"
  | "pointer"
  | "brush"
  | "square"
  | "ellipse"
  | "node"
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
  rendererType: "svg" | "canvas" | "webgl";
  updateFrequency: 0 | 16 | 33;
  selectedTool?: Tool;
  activeTool?: Tool;
  toolOption?: string;
  restoreTool?: Tool;
  isPanelOpen: boolean;
  gridSize: number;
  gridType: "none" | "dots" | "lines";
  gridColor: RgbaColor;
  gridMinZoom: number;
  pasteOffset: number;
  syncColors: boolean;
  globalStrokeColor: RgbaColor;
  globalFillColor: RgbaColor;
  setSelectedTool: (tool?: Tool) => void;
  setActiveTool: (tool?: Tool) => void;
  setRestoreTool: (tool?: Tool) => void;
  setToolOption: (option: string) => void;
  setCanvasColor: (canvasColor: RgbaColor) => void;
  setThrottleRate: (throttleRate: number) => void;
  setRendererType: (rendererType: "svg" | "canvas" | "webgl") => void;
  setUpdateFrequency: (updateFrequency: 0 | 16 | 33) => void;
  setIsPanelOpen: (isPanelOpen: boolean) => void;
  setGridSize: (gridSize: number) => void;
  setGridType: (gridType: "none" | "dots" | "lines") => void;
  setGridColor: (gridColor: RgbaColor) => void;
  setGridMinZoom: (gridMinZoom: number) => void;
  setSyncColors: (syncColors: boolean) => void;
  setGlobalStrokeColor: (globalStrokeColor: RgbaColor) => void;
  setGlobalFillColor: (globalFillColor: RgbaColor) => void;
}

export const useOptionsStore = create<OptionsState>()(
  persist(
    (set) => ({
      canvasColor: { r: 249, g: 250, b: 251, a: 1 },
      throttleRate: 1,
      rendererType: "canvas",
      updateFrequency: 0,
      selectedTool: "brush",
      activeTool: undefined,
      restoreTool: undefined,
      toolOption: "",
      isPanelOpen: true,
      gridSize: 20,
      gridType: "dots",
      gridColor: { r: 0, g: 0, b: 0, a: 0.15 },
      gridMinZoom: 50,
      pasteOffset: 20,
      syncColors: false,
      globalStrokeColor: { r: 33, g: 33, b: 33, a: 1 },
      globalFillColor: { r: 255, g: 255, b: 255, a: 1 },
      setSelectedTool: (selectedTool) => set(() => ({ selectedTool })),
      setActiveTool: (activeTool) => set(() => ({ activeTool })),
      setRestoreTool: (restoreTool) => set(() => ({ restoreTool })),
      setToolOption: (toolOption) => set(() => ({ toolOption })),
      setCanvasColor: (canvasColor) => set(() => ({ canvasColor })),
      setThrottleRate: (throttleRate) => set(() => ({ throttleRate })),
      setRendererType: (rendererType) => set(() => ({ rendererType })),
      setUpdateFrequency: (updateFrequency) => set(() => ({ updateFrequency })),
      setIsPanelOpen: (isPanelOpen) => set(() => ({ isPanelOpen })),
      setGridSize: (gridSize) => set(() => ({ gridSize })),
      setGridType: (gridType) => set(() => ({ gridType })),
      setGridColor: (gridColor) => set(() => ({ gridColor })),
      setGridMinZoom: (gridMinZoom) => set(() => ({ gridMinZoom })),
      setSyncColors: (syncColors) => set(() => ({ syncColors })),
      setGlobalStrokeColor: (globalStrokeColor) => set(() => ({ globalStrokeColor })),
      setGlobalFillColor: (globalFillColor) => set(() => ({ globalFillColor })),
    }),
    { name: "options", version: 2 }
  )
);
