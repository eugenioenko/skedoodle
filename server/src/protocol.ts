// src/canvas/history.service.ts
export interface Command<T = any> {
  id: string; // Unique ID for the command
  ts: number; // Timestamp
  uid: string; // User ID
  type: 'create' | 'update' | 'remove' | 'undo' | 'redo';
  sid: string; // Shape ID
  data: T;
}

export type UserInfo = {
  uid: string;
  name: string;
  color: string;
};

// Client -> Server
export type ClientMessage =
  | { type: 'join'; sketchId: string; user: UserInfo }
  | { type: 'command'; command: Command }
  | { type: 'cursor'; x: number; y: number };

// Server -> Client
export type ServerMessage =
  | { type: 'joined'; commandLog: Command[]; users: UserInfo[] }
  | { type: 'command'; command: Command }
  | { type: 'user-joined'; user: UserInfo }
  | { type: 'user-left'; uid: string }
  | { type: 'cursor'; uid: string; x: number; y: number };
