// src/canvas/history.service.ts
export interface Command<T = any> {
  id: string; // Unique ID for the command
  ts: number; // Timestamp
  uid: string; // User ID
  type: string;
  sid: string; // Shape ID
  data: T;
}

export type UserInfo = {
  uid: string;
  userId: string; // Add userId
  name: string;
  color: string;
};

// Client -> Server
export type ClientMessage =
  | { type: 'join'; sketchId: string; user: UserInfo; token: string }
  | { type: 'command'; command: Command }
  | { type: 'cursor'; x: number; y: number }
  | { type: 'meta'; data: { color?: string; positionX?: number; positionY?: number; zoom?: number } }
  | { type: 'auth'; action: 'register-options' | 'register-verify' | 'login-options' | 'login-verify'; payload: any };

// Server -> Client
export type ServerMessage =
  | { type: 'joined'; commandLog: Command[]; users: UserInfo[] }
  | { type: 'command'; command: Command }
  | { type: 'user-joined'; user: UserInfo }
  | { type: 'user-left'; uid: string }
  | { type: 'cursor'; uid: string; x: number; y: number }
  | { type: 'auth'; action: 'register-options' | 'register-verify' | 'login-options' | 'login-verify'; payload: any };
