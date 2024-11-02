import { envIsDevelopment } from "@/environment";
import { useRef, useEffect } from "react";
import Two from "two.js";
import { Group } from "two.js/src/group";
import { ZUI } from "two.js/extras/jsm/zui";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type Tool = "hand" | "pointer" | "brush";

export interface CanvasState {
  selectedTool?: Tool;
  activeTool?: Tool;
  two?: Two;
  zui?: ZUI;
  canvas?: Group;
  container?: HTMLDivElement;
  setSelectedTool: (tool?: Tool) => void;
  setActiveTool: (tool?: Tool) => void;
  setTwo: (two?: Two) => void;
  setCanvas: (canvas?: Group | undefined) => void;
  setZui: (zui?: ZUI | undefined) => void;
  setContainer: (container?: HTMLDivElement | undefined) => void;
}

export const useCanvasStore = create<CanvasState>()(
  devtools(
    (set) => ({
      selectedTool: "brush",
      activeTool: undefined,
      two: undefined,
      canvas: undefined,
      zui: undefined,
      setSelectedTool: (selectedTool) =>
        set((state) => ({ ...state, selectedTool })),
      setActiveTool: (activeTool) => set((state) => ({ ...state, activeTool })),
      setTwo: (two) => set((state) => ({ ...state, two })),
      setCanvas: (canvas) => set((state) => ({ ...state, canvas })),
      setZui: (zui) => set((state) => ({ ...state, zui })),
      setContainer: (container) => set((state) => ({ ...state, container })),
    }),
    { name: "appStore", enabled: envIsDevelopment }
  )
);

export const useToolRef = () => {
  const toolRef = useRef<any>();

  useEffect(() => {
    const unsubscribe = useCanvasStore.subscribe((state) => {
      toolRef.current = state.tool;
    });

    return () => unsubscribe();
  }, []);
  return toolRef;
};
