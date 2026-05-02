import express from 'express';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData
} from '@right-leg/shared';
import { GAME_CONFIG } from '@right-leg/shared';
import { RoomManager } from './rooms/roomManager.js';
import { registerSocketHandlers } from './socket.js';

const app = express();
const httpServer = createServer(app);
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '0.0.0.0';
const clientOrigin = process.env.CLIENT_ORIGIN;

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: clientOrigin ?? true,
    methods: ['GET', 'POST']
  }
});

const manager = new RoomManager();

app.get('/health', (_req, res) => {
  res.json({ ok: true, name: 'right-leg-was-you' });
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

if (process.env.NODE_ENV === 'production' || existsSync(clientDist)) {
  app.use('/assets', express.static(path.join(clientDist, 'assets')));
  app.get('/assets/{*splat}', (_req, res) => {
    res.status(404).send('Asset not found');
  });
  app.use(express.static(clientDist));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

registerSocketHandlers(io, manager);

const tickMs = Math.round(1000 / GAME_CONFIG.tickRate);
setInterval(() => {
  const changedRooms = manager.tick(tickMs);
  for (const room of changedRooms) {
    io.to(room.roomCode).emit('gameState', manager.toPublicGameState(room));
    io.to(room.roomCode).emit('gameLog', room.logs.slice(-8));
    io.to(room.roomCode).emit('roomState', manager.toPublicRoomState(room));
  }
  manager.cleanup();
}, tickMs);

httpServer.listen(port, host, () => {
  console.log(`right-leg-was-you server listening on http://${host}:${port}`);
});
