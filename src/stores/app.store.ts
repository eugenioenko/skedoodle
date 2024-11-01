import { envIsDevelopment } from "@/environment";
import { useRef, useEffect } from "react";
import Two from "two.js";
import Group from "two.js";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface AppState {
  tool?: string;
  two?: Two;
  canvas?: Group;
  setTool: (tool?: string) => void;
  setTwo: (two?: Two) => void;
  setCanvas: (canvas?: Group | undefined) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      tool: undefined,
      two: undefined,
      canvas: undefined,
      setTool: (tool) => set((state) => ({ ...state, tool })),
      setTwo: (two) => set((state) => ({ ...state, two })),
      setCanvas: (canvas) => set((state) => ({ ...state, canvas })),
    }),
    { name: "appStore", enabled: envIsDevelopment }
  )
);

export const useToolRef = () => {
  const toolRef = useRef<any>();

  useEffect(() => {
    const unsubscribe = useAppStore.subscribe((state) => {
      toolRef.current = state.tool;
    });

    return () => unsubscribe();
  }, []);
  return toolRef;
};
