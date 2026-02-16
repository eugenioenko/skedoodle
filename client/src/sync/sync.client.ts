import { useSyncStore } from './sync.store';
import { applyRemoteCommand, clearCanvas } from '@/canvas/history.service';
import { useCommandLogStore } from '@/canvas/history.store';
import { ClientMessage, ServerMessage, UserInfo, Command } from './sync.model';

import { useAuthStore } from '@/stores/auth.store';

const WS_URL = import.meta.env.VITE_WS_URL;

class SyncClient {
  private ws: WebSocket | null = null;
  private sketchId: string | null = null;
  private user: UserInfo | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;

  connect(sketchId: string) {
    if (this.ws) {
      this.disconnect();
    }

    this.sketchId = sketchId;
    useSyncStore.getState().setReconnecting(true);
    // Get user info from auth store, not locally generated
    const authUser = useAuthStore.getState().user;
    if (!authUser) {
      console.error('[Sync] Not authenticated. Cannot connect to sketch.');
      return;
    }
    this.user = { uid: authUser.id, userId: authUser.id, name: authUser.username, color: '#FF0000' };
    useSyncStore.getState().setLocalUser(this.user);

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('[Sync] WebSocket connected');
      useSyncStore.getState().setConnected(true);
      useSyncStore.getState().setReconnecting(false);
      this.reconnectAttempts = 0;
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }

      const joinMessage: ClientMessage = {
        type: 'join',
        sketchId,
        user: this.user!,
        token: useAuthStore.getState().token!, // Send token with join
      };
      this.ws?.send(JSON.stringify(joinMessage));
    };

    this.ws.onmessage = (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      this.handleServerMessage(message);
    };

    this.ws.onclose = () => {
      console.log('[Sync] WebSocket disconnected');
      useSyncStore.getState().setConnected(false);
      if (this.reconnectAttempts === 0) { // Only schedule reconnect if not already reconnecting
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (err) => {
      console.error('[Sync] WebSocket error:', err);
      useSyncStore.getState().setReconnecting(false);
      this.ws?.close();
    };
  }

  disconnect() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    this.ws?.close();
    this.ws = null;
    useSyncStore.getState().setConnected(false);
    useSyncStore.getState().setReconnecting(false);
    useSyncStore.getState().setUsers([]);
  }

  private scheduleReconnect() {
    if (this.reconnectInterval || this.reconnectAttempts > 5) return; // Max 5 retries

    useSyncStore.getState().setReconnecting(true);
    const backoff = Math.pow(2, this.reconnectAttempts) * 1000;
    console.log(`[Sync] Attempting to reconnect in ${backoff / 1000}s...`);

    this.reconnectInterval = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(this.sketchId!);
    }, backoff);
  }

  private handleServerMessage(message: ServerMessage) {
    const { getState, setState } = useSyncStore;

    switch (message.type) {
      case 'joined':
        console.log('[Sync] Joined room, received initial state.');
        this.handleReconciliation(message.commandLog);
        setState({ roomUsers: message.users, isConnected: true });
        break;
      case 'user-joined':
        console.log(`[Sync] User joined:`, message.user.name);
        getState().addUser(message.user);
        break;
      case 'user-left':
        console.log(`[Sync] User left:`, message.uid);
        getState().removeUser(message.uid);
        getState().removeCursor(message.uid);
        break;
      case 'command':
        applyRemoteCommand(message.command);
        break;
      case 'cursor': {
        const user = getState().roomUsers.find(u => u.uid === message.uid);
        if (user) {
          getState().updateCursor(message.uid, {
            x: message.x,
            y: message.y,
            name: user.name,
            color: user.color,
          });
        }
        break;
      }
    }
  }

  /**
   * Replaces local state entirely with the server's command log.
   *
   * On join/reconnect the server is treated as the source of truth:
   *   1. The canvas is wiped (all Two.js shapes removed, doodles array cleared).
   *   2. The local command log and undo/redo stacks are reset.
   *   3. Every command from the server log is replayed in order.
   *
   * This avoids complex merge/diff logic and guarantees the client
   * converges to the exact state the server holds.
   */
  private handleReconciliation(serverLog: Command[]) {
    console.log(`[Sync] Applying ${serverLog.length} server commands.`);

    // 1. Clear the Two.js canvas and doodles array
    clearCanvas();

    // 2. Reset the command log and session undo/redo stacks
    const { setCommandLog, clearSession } = useCommandLogStore.getState();
    setCommandLog([]);
    clearSession();

    // 3. Replay the full server log to rebuild canvas state
    for (const cmd of serverLog) {
      applyRemoteCommand(cmd);
    }
  }

  sendCommand(command: Command) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: ClientMessage = { type: 'command', command };
      this.ws.send(JSON.stringify(message));
    }
  }

  sendCursor(x: number, y: number) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: ClientMessage = { type: 'cursor', x, y };
      this.ws.send(JSON.stringify(message));
    }
  }

  sendMeta(data: { color?: string; positionX?: number; positionY?: number; zoom?: number }) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: ClientMessage = { type: 'meta', data };
      this.ws.send(JSON.stringify(message));
    }
  }
}

export const syncService = new SyncClient();
