import { WebSocket } from 'ws';
import type { Command, UserInfo } from './protocol';
import { scheduleWrite, loadCommands } from './persistence';

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
        this.commands = await loadCommands(this.sketchId);
        console.log(`[Room:${this.sketchId}] Loaded ${this.commands.length} initial commands.`);
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
        scheduleWrite(this.sketchId, this.commands);
    }

    handleCursor(uid: string, x: number, y: number, fromWs: WebSocket) {
        this.broadcast(JSON.stringify({ type: 'cursor', uid, x, y }), fromWs);
    }

    private broadcast(message: string, exclude?: WebSocket) {
        for (const client of this.clients.keys()) {
            if (client !== exclude && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
    }

    destroy() {
        console.log(`[Room:${this.sketchId}] Destroying room and flushing commands to disk.`);
        scheduleWrite(this.sketchId, this.commands);
        if (this.cleanupTimeout) {
            clearTimeout(this.cleanupTimeout);
        }
    }
}
