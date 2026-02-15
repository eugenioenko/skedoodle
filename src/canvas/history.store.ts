import { create } from "zustand";
import { SerializedDoodle } from "./doodle.utils";

export interface Command {
  id: string;
  ts: number;
  uid: string;
  type: "create" | "update" | "remove";
  shapeId: string;
  data?: SerializedDoodle;
  changes?: Record<string, any>;
}

const LOCAL_USER_ID = "local-user";

export function createCommand(
  type: Command["type"],
  shapeId: string,
  opts?: { data?: SerializedDoodle; changes?: Record<string, any> }
): Command {
  return {
    id: crypto.randomUUID(),
    ts: Date.now(),
    uid: LOCAL_USER_ID,
    type,
    shapeId,
    ...opts,
  };
}

export interface CommandLogState {
  commandLog: Command[];
  sessionUndoStack: string[];
  sessionRedoStack: Command[];
  appendCommand: (command: Command) => void;
  setCommandLog: (commands: Command[]) => void;
  clearSession: () => void;
}

export const useCommandLogStore = create<CommandLogState>()((set) => ({
  commandLog: [],
  sessionUndoStack: [],
  sessionRedoStack: [],

  appendCommand: (command: Command) =>
    set((state) => ({
      commandLog: [...state.commandLog, command],
    })),

  setCommandLog: (commands: Command[]) =>
    set({ commandLog: commands }),

  clearSession: () =>
    set({ sessionUndoStack: [], sessionRedoStack: [] }),
}));
