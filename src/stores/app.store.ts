import { envIsDevelopment } from "@/environment";
import { IdName } from "@/models/id-name";
import { useRef, useEffect } from "react";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface AppState {
  tool: string | null | undefined;
  setTool: (tool?: string | null) => void;
  date: Date;
}

export const useAppState = create<AppState>()(
  devtools(
    (set) => ({
      date: new Date(),
      tool: undefined,
      setTool: (tool) => set((state) => ({ ...state, tool })),
    }),
    { name: "appStore", enabled: envIsDevelopment }
  )
);

export const useToolRef = () => {
  const toolRef = useRef<any>();

  useEffect(() => {
    const unsubscribe = useAppState.subscribe((state) => {
      toolRef.current = state.tool;
    });

    return () => unsubscribe();
  }, []);
  return toolRef;
};
