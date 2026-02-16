import { WebSocket } from 'ws';
import type { Command, UserInfo } from './protocol';
import { prisma } from './prisma';

type Client = {
  ws: WebSocket;
  user: UserInfo;
};

export class Room {
  private clients = new Map<WebSocket, Client>();
  private commands: Command[] = [];
  private cleanupTimeout: NodeJS.Timeout | null = null;

  constructor(private sketchId: string, private onEmpty: (sketchId: string) => void) {
    this.loadInitialCommands();
  }

  private async loadInitialCommands() {
    const dbCommands = await prisma.command.findMany({
        where: { sid: this.sketchId }, // Assuming sketchId is used as sid for global commands
        orderBy: { ts: 'asc' },
    });
    this.commands = dbCommands.map(cmd => ({
        ...cmd,
        ts: cmd.ts.getTime(),
        type: cmd.type as Command['type'],
        data: JSON.parse(cmd.data),
    }));
    console.log(`[Room:${this.sketchId}] Loaded ${this.commands.length} initial commands from DB.`);
  }

  addClient(ws: WebSocket, user: UserInfo) {
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }

    const client: Client = { ws, user };
    this.clients.set(ws, client);

    // Send full state to the new client
    ws.send(JSON.stringify({
      type: 'joined',
      commandLog: this.commands,
      users: Array.from(this.clients.values()).map(c => c.user),
    }));

    // Notify others
    this.broadcast(JSON.stringify({ type: 'user-joined', user }), ws);

    console.log(`[Room:${this.sketchId}] User ${user.name} (${user.uid}) joined. Total clients: ${this.clients.size}`);
  }

  removeClient(ws: WebSocket) {
    const client = this.clients.get(ws);
    if (!client) return;

    this.clients.delete(ws);
    this.broadcast(JSON.stringify({ type: 'user-left', uid: client.user.uid }));

    console.log(`[Room:${this.sketchId}] User ${client.user.name} (${client.user.uid}) left. Total clients: ${this.clients.size}`);

    if (this.clients.size === 0) {
      console.log(`[Room:${this.sketchId}] Room is empty. Scheduling cleanup.`);
      this.cleanupTimeout = setTimeout(() => {
        this.onEmpty(this.sketchId);
      }, 30000); // 30-second grace period
    }
  }

  handleCommand(command: Command, fromWs: WebSocket) {
    // Dedup
    if (this.commands.some(c => c.id === command.id)) {
      console.log(`[Room:${this.sketchId}] Duplicate command received: ${command.id}`);
      return;
    }

    this.commands.push(command);
    this.broadcast(JSON.stringify({ type: 'command', command }), fromWs);
    // Persist command to DB
    prisma.command.create({
        data: {
            id: command.id,
            ts: new Date(command.ts),
            uid: command.uid,
            type: command.type,
            sid: command.sid, // Assuming sid is sketchId for global commands
            data: JSON.stringify(command.data),
        },
    }).catch(err => console.error(`[Room:${this.sketchId}] Failed to persist command:`, err));
  }

  handleCursor(uid: string, x: number, y: number, fromWs: WebSocket) {
    this.broadcast(JSON.stringify({ type: 'cursor', uid, x, y }), fromWs);
  }

  handleMeta(data: { color?: string; positionX?: number; positionY?: number; zoom?: number }) {
    prisma.sketch.update({
      where: { id: this.sketchId },
      data: {
        ...(data.color !== undefined && { color: data.color }),
        ...(data.positionX !== undefined && { positionX: data.positionX }),
        ...(data.positionY !== undefined && { positionY: data.positionY }),
        ...(data.zoom !== undefined && { zoom: data.zoom }),
      },
    }).catch(err => console.error(`[Room:${this.sketchId}] Failed to persist meta:`, err));
  }

  private broadcast(message: string, exclude?: WebSocket) {
    for (const client of this.clients.keys()) {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  destroy() {
    console.log(`[Room:${this.sketchId}] Room destroyed.`);
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
    }
  }
}
