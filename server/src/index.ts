import { WebSocketServer, WebSocket } from 'ws';
import { Room } from './room';
import type { ClientMessage, UserInfo } from './protocol';

const PORT = 3013;
const wss = new WebSocketServer({ port: PORT });
const rooms = new Map<string, Room>();

wss.on('connection', (ws: WebSocket) => {
  let room: Room | undefined;
  let user: UserInfo | undefined;
  let sketchId: string | undefined;

  console.log('Client connected');

  ws.on('message', (rawMessage: Buffer) => {
    try {
      const message: ClientMessage = JSON.parse(rawMessage.toString());

      if (message.type === 'join') {
        sketchId = message.sketchId;
        user = message.user;
        room = rooms.get(sketchId);

        if (!room) {
          room = new Room(sketchId, (id) => {
            console.log(`Cleaning up empty room: ${id}`);
            rooms.get(id)?.destroy();
            rooms.delete(id);
          });
          rooms.set(sketchId, room);
        }
        room.addClient(ws, user);
      } else if (room && user && sketchId) {
        switch (message.type) {
          case 'command':
            room.handleCommand(message.command, ws);
            break;
          case 'cursor':
            room.handleCursor(user.uid, message.x, message.y, ws);
            break;
        }
      } else {
        console.warn('Received message from unauthenticated client.');
      }
    } catch (error) {
      console.error('Failed to process message:', rawMessage.toString(), error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (room && user) {
      room.removeClient(ws);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

console.log(`WebSocket server started on ws://localhost:${PORT}`);
