import { create } from "zustand";
import { SerializedDoodle } from "./doodle.utils";

export interface PropertyChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export type HistoryCommand =
  | { type: "create"; label: string; doodle: SerializedDoodle }
  | {
      type: "update";
      label: string;
      shapeId: string;
      changes: PropertyChange[];
    }
  | { type: "remove"; label: string; doodle: SerializedDoodle };

export interface HistoryState {
  undoStack: HistoryCommand[];
  redoStack: HistoryCommand[];
  push: (command: HistoryCommand) => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()((set) => ({
  undoStack: [],
  redoStack: [],

  push: (command: HistoryCommand) =>
    set((state) => ({
      undoStack: [...state.undoStack, command],
      redoStack: [],
    })),

  clear: () => set({ undoStack: [], redoStack: [] }),
}));
