import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { existsSync } from 'fs';
import authRoutes from './routes/auth';
import sketchRoutes from './routes/sketches';
import { verifyToken } from './utils/auth';
import { WebSocketServer, WebSocket } from 'ws';
import { Room } from './room';
import type { ClientMessage, UserInfo } from './protocol';
import { prisma } from './prisma';

const app = express();
const HTTP_PORT = process.env.HTTP_PORT;
const WS_PORT = process.env.WS_PORT;

app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));

app.use('/api/auth', authRoutes);

// Public community endpoint — no auth required
app.get('/api/sketches/community', async (_req, res) => {
  try {
    const sketches = await prisma.sketch.findMany({
      where: { public: true },
      select: {
        id: true, name: true, color: true, public: true,
        createdAt: true, updatedAt: true, ownerId: true,
        owner: { select: { username: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(sketches.map(s => ({
      ...s,
      ownerName: s.owner.username,
      owner: undefined,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/sketches', sketchRoutes);

// Serve client static build in production
const publicDir = path.join(__dirname, '../public');
const indexPath = path.join(publicDir, 'index.html');

if (existsSync(indexPath)) {
  app.use(express.static(publicDir));
  app.get('/{*path}', (_req, res) => {
    res.sendFile(indexPath);
  });
} else {
  app.get('/', (_req, res) => {
    res.send('Skedoodle HTTP API is running!');
  });
}

// WebSocket Server (integrated)
const wss = new WebSocketServer({ port: Number(WS_PORT) });
const rooms = new Map<string, Room>();

wss.on('connection', (ws: WebSocket) => {
  let room: Room | undefined;
  let user: UserInfo | undefined;
  let sketchId: string | undefined;

  console.log('Client connected');

  ws.on('message', async (rawMessage: Buffer) => {
    try {
      const message: ClientMessage = JSON.parse(rawMessage.toString());

      if (message.type === 'join') {
        try {
          // Authenticate the token passed in the join message
          const decodedToken = verifyToken(message.token);
          // Use the authenticated user's ID and username
          user = {
            uid: decodedToken.userId,
            userId: decodedToken.userId, // Ensure userId is populated
            name: message.user.name, // Keep client-provided name/color
            color: message.user.color,
          };
          sketchId = message.sketchId;

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
        } catch (error: any) {
          console.warn('Authentication failed for join request:', error.message);
          ws.send(JSON.stringify({ type: 'error', message: 'Authentication failed' }));
          ws.close();
        }
      } else if (room && user && sketchId) {
        switch (message.type) {
          case 'command':
            room.handleCommand(message.command, ws);
            break;
          case 'cursor':
            room.handleCursor(user.uid, message.x, message.y, ws);
            break;
          case 'meta':
            room.handleMeta(message.data);
            break;
          default:
            console.warn('Unknown message type received:', message.type);
        }
      } else {
        console.warn('Received message from unauthenticated client or unknown room/user state.');
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

export const startServer = () => {
  app.listen(HTTP_PORT, () => {
    console.log(`HTTP server running on http://localhost:${HTTP_PORT}`);
  });
  console.log(`WebSocket server started on ws://localhost:${WS_PORT}`);
};

// Export app and prisma for testing or further integration if needed
export { app, prisma, wss };

startServer();