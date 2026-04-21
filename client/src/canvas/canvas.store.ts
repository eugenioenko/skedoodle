import { create } from "zustand";
import type { Doodler } from "./doodler.client";
import { Point } from "@/models/point.model";
import { RgbaColor } from "colord";
import { persist } from "zustand/middleware";
import { Doodle } from "./doodle.utils";

export const DEFAULT_PALETTE: string[][] = [
  // Colors
  ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#14b8a6", "#0ea5e9", "#3b82f6", "#8b5cf6", "#d946ef", "#ec4899", "#f43f5e"],
  // Grays
  ["#ffffff", "#f5f5f5", "#e5e5e5", "#d4d4d4", "#a3a3a3", "#737373", "#525252", "#404040", "#262626", "#171717", "#0a0a0a", "#000000"],
  // Pastels
  ["#fca5a5", "#fdba74", "#fde68a", "#bbf7d0", "#a7f3d0", "#99f6e4", "#bae6fd", "#bfdbfe", "#ddd6fe", "#f5d0fe", "#fbcfe8", "#fecdd3"],
];

export type SketchMode = "online" | "local" | "sandbox";

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
  | "eyedropper"
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
  activePanel: "properties" | "history" | "settings";
  gridSize: number;
  gridType: "none" | "dots" | "lines";
  gridColor: RgbaColor;
  gridMinZoom: number;
  pasteOffset: number;
  syncColors: boolean;
  globalStrokeColor: RgbaColor;
  globalFillColor: RgbaColor;
  colorPalette: string[][];
  exportFormat: "svg" | "png";
  exportTransparent: boolean;
  exportPadding: number;
  exportPngScale: 1 | 2 | 3;
  uiSize: "default" | "large";
  setSelectedTool: (tool?: Tool) => void;
  setActiveTool: (tool?: Tool) => void;
  setRestoreTool: (tool?: Tool) => void;
  setToolOption: (option: string) => void;
  setCanvasColor: (canvasColor: RgbaColor) => void;
  setThrottleRate: (throttleRate: number) => void;
  setRendererType: (rendererType: "svg" | "canvas" | "webgl") => void;
  setUpdateFrequency: (updateFrequency: 0 | 16 | 33) => void;
  setIsPanelOpen: (isPanelOpen: boolean) => void;
  setActivePanel: (activePanel: "properties" | "history" | "settings") => void;
  setGridSize: (gridSize: number) => void;
  setGridType: (gridType: "none" | "dots" | "lines") => void;
  setGridColor: (gridColor: RgbaColor) => void;
  setGridMinZoom: (gridMinZoom: number) => void;
  setSyncColors: (syncColors: boolean) => void;
  setGlobalStrokeColor: (globalStrokeColor: RgbaColor) => void;
  setGlobalFillColor: (globalFillColor: RgbaColor) => void;
  setColorPalette: (colorPalette: string[][]) => void;
  setExportFormat: (exportFormat: "svg" | "png") => void;
  setExportTransparent: (exportTransparent: boolean) => void;
  setExportPadding: (exportPadding: number) => void;
  setExportPngScale: (exportPngScale: 1 | 2 | 3) => void;
  setUiSize: (uiSize: "default" | "large") => void;
}

export const useOptionsStore = create<OptionsState>()(
  persist(
    (set) => ({
      canvasColor: { r: 249, g: 250, b: 251, a: 1 },
      throttleRate: 1,
      rendererType: "svg",
      updateFrequency: 0,
      selectedTool: "brush",
      activeTool: undefined,
      restoreTool: undefined,
      toolOption: "",
      isPanelOpen: true,
      activePanel: "properties",
      gridSize: 20,
      gridType: "dots",
      gridColor: { r: 0, g: 0, b: 0, a: 0.15 },
      gridMinZoom: 50,
      pasteOffset: 20,
      syncColors: false,
      globalStrokeColor: { r: 33, g: 33, b: 33, a: 1 },
      globalFillColor: { r: 255, g: 255, b: 255, a: 1 },
      exportFormat: "png",
      exportTransparent: false,
      exportPadding: 16,
      exportPngScale: 2,
      uiSize: "default",
      setSelectedTool: (selectedTool) => set(() => ({ selectedTool })),
      setActiveTool: (activeTool) => set(() => ({ activeTool })),
      setRestoreTool: (restoreTool) => set(() => ({ restoreTool })),
      setToolOption: (toolOption) => set(() => ({ toolOption })),
      setCanvasColor: (canvasColor) => set(() => ({ canvasColor })),
      setThrottleRate: (throttleRate) => set(() => ({ throttleRate })),
      setRendererType: (rendererType) => set(() => ({ rendererType })),
      setUpdateFrequency: (updateFrequency) => set(() => ({ updateFrequency })),
      setIsPanelOpen: (isPanelOpen) => set(() => ({ isPanelOpen })),
      setActivePanel: (activePanel) => set(() => ({ activePanel })),
      setGridSize: (gridSize) => set(() => ({ gridSize })),
      setGridType: (gridType) => set(() => ({ gridType })),
      setGridColor: (gridColor) => set(() => ({ gridColor })),
      setGridMinZoom: (gridMinZoom) => set(() => ({ gridMinZoom })),
      setSyncColors: (syncColors) => set(() => ({ syncColors })),
      colorPalette: DEFAULT_PALETTE,
      setGlobalStrokeColor: (globalStrokeColor) => set(() => ({ globalStrokeColor })),
      setGlobalFillColor: (globalFillColor) => set(() => ({ globalFillColor })),
      setColorPalette: (colorPalette) => set(() => ({ colorPalette })),
      setExportFormat: (exportFormat) => set(() => ({ exportFormat })),
      setExportTransparent: (exportTransparent) => set(() => ({ exportTransparent })),
      setExportPadding: (exportPadding) => set(() => ({ exportPadding })),
      setExportPngScale: (exportPngScale) => set(() => ({ exportPngScale })),
      setUiSize: (uiSize) => set(() => ({ uiSize })),
    }),
    {
      name: "options",
      version: 6,
    }
  )
);
