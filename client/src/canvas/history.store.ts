import { create } from 'zustand';
import { useSyncStore } from '@/services/sync.store';
import { ulid } from 'ulid';

export interface Command<T = any> {
  id: string; // Unique ID for the command
  ts: number; // Timestamp
  uid: string; // User ID
  type: 'create' | 'update' | 'remove' | 'undo' | 'redo';
  sid: string; // Shape ID
  data: T;
}

export function createCommand(
  type: Command['type'],
  sid: string,
  opts?: { data?: any; }
): Command {
  const user = useSyncStore.getState().localUser;
  return {
    id: ulid(),
    ts: Date.now(),
    uid: user?.uid ?? 'local-user',
    type,
    sid,
    data: opts?.data,
  };
}


export interface CommandLogState {
  commandLog: Command[];
  sessionUndoStack: string[];
  sessionRedoStack: Command[];
  isTimeTraveling: boolean;
  timelinePosition: number;
  appendCommand: (command: Command) => void;
  setCommandLog: (commands: Command[]) => void;
  clearSession: () => void;
  setTimeTraveling: (value: boolean) => void;
  setTimelinePosition: (position: number) => void;
}

export const useCommandLogStore = create<CommandLogState>()((set) => ({
  commandLog: [],
  sessionUndoStack: [],
  sessionRedoStack: [],
  isTimeTraveling: false,
  timelinePosition: 0,

  appendCommand: (command: Command) =>
    set((state) => ({
      commandLog: [...state.commandLog, command],
    })),

  setCommandLog: (commands: Command[]) =>
    set({ commandLog: commands }),

  clearSession: () =>
    set({ sessionUndoStack: [], sessionRedoStack: [] }),

  setTimeTraveling: (value: boolean) =>
    set({ isTimeTraveling: value }),

  setTimelinePosition: (position: number) =>
    set({ timelinePosition: position }),
}));
