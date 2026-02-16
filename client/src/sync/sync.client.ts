import { useSyncStore } from './sync.store';
import { applyRemoteCommand } from '@/canvas/history.service';
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

  private handleReconciliation(serverLog: Command[]) {
    const localLog = useCommandLogStore.getState().commandLog;
    console.log(`[Sync] Reconciling state. Server: ${serverLog.length}, Local: ${localLog.length}`);

    if (serverLog.length > localLog.length) {
      const delta = serverLog.slice(localLog.length);
      console.log(`[Sync] Applying ${delta.length} commands from server.`);
      for (const cmd of delta) {
        applyRemoteCommand(cmd);
      }
    } else if (localLog.length > serverLog.length) {
      const localOnlyCommands = localLog.filter(localCmd => !serverLog.some((serverCmd: Command) => serverCmd.id === localCmd.id));
      console.log(`[Sync] Sending ${localOnlyCommands.length} offline commands to server.`);
      for (const cmd of localOnlyCommands) {
        this.sendCommand(cmd);
      }
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
}

export const syncService = new SyncClient();
