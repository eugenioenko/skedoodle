import { create } from "zustand";

interface SketchMetaState {
  name?: string;
  setName: (name?: string) => void;
}

export const useSketchMetaStore = create<SketchMetaState>()((set) => ({
  name: undefined,
  setName: (name) => set(() => ({ name })),
}));
