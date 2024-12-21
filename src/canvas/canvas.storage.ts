import { idbStorage } from "@/services/idb.client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface StorageState {
  doodles: any[];
  setDoodles: (doodles: any[]) => void;
}

export const useStorageStore = create<StorageState>()(
  persist(
    (set) => ({
      doodles: [],
      setDoodles: (doodles: any[]) => set({ doodles }),
    }),
    {
      name: "sketch",
      storage: createJSONStorage(() => idbStorage),
      version: 1,
    }
  )
);
