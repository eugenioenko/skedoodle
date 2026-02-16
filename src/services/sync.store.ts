import { create } from 'zustand';
import { UserInfo } from './protocol';

type RemoteCursor = {
    x: number;
    y: number;
    name: string;
    color: string;
};

type SyncState = {
    isConnected: boolean;
    isReconnecting: boolean;
    roomUsers: UserInfo[];
    localUser: UserInfo | null;
    remoteCursors: Map<string, RemoteCursor>;
    setConnected: (status: boolean) => void;
    setReconnecting: (status: boolean) => void;
    setUsers: (users: UserInfo[]) => void;
    addUser: (user: UserInfo) => void;
    removeUser: (uid: string) => void;
    setLocalUser: (user: UserInfo) => void;
    updateCursor: (uid: string, cursor: RemoteCursor) => void;
    removeCursor: (uid: string) => void;
};

export const useSyncStore = create<SyncState>((set) => ({
    isConnected: false,
    isReconnecting: false,
    roomUsers: [],
    localUser: null,
    remoteCursors: new Map(),
    setConnected: (status) => set({ isConnected: status }),
    setReconnecting: (status) => set({ isReconnecting: status }),
    setUsers: (users) => set({ roomUsers: users }),
    addUser: (user) => set((state) => ({ roomUsers: [...state.roomUsers, user] })),
    removeUser: (uid) => set((state) => ({ 
        roomUsers: state.roomUsers.filter(u => u.uid !== uid),
        remoteCursors: new Map(state.remoteCursors).set(uid, undefined as any)
    })),
    setLocalUser: (user) => set({ localUser: user }),
    updateCursor: (uid, cursor) => set(state => ({
        remoteCursors: new Map(state.remoteCursors).set(uid, cursor)
    })),
    removeCursor: (uid) => set(state => {
        const newCursors = new Map(state.remoteCursors);
        newCursors.delete(uid);
        return { remoteCursors: newCursors };
    })
}));
