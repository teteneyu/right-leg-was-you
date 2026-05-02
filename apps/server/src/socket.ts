import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData
} from '@right-leg/shared';
import { RoomManager } from './rooms/roomManager.js';

type GameServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function registerSocketHandlers(io: GameServer, manager: RoomManager) {
  io.on('connection', (socket) => {
    socket.on('createRoom', (payload, cb) => {
      const result = manager.createRoom(socket.id, payload.name);
      if (!result.ok || !result.roomCode) {
        cb(result);
        return;
      }
      attach(socket, result.roomCode, socket.id);
      socket.join(result.roomCode);
      cb(result);
      broadcastRoom(io, manager, result.roomCode);
    });

    socket.on('joinRoom', (payload, cb) => {
      const result = manager.joinRoom(socket.id, payload.roomCode, payload.name);
      if (!result.ok || !result.roomCode) {
        cb(result);
        return;
      }
      attach(socket, result.roomCode, socket.id);
      socket.join(result.roomCode);
      cb(result);
      broadcastRoom(io, manager, result.roomCode);
    });

    socket.on('leaveRoom', () => {
      const roomCode = socket.data.roomCode;
      manager.leaveRoom(socket.id);
      if (roomCode) {
        socket.leave(roomCode);
        broadcastRoom(io, manager, roomCode);
      }
      socket.data.roomCode = undefined;
      socket.data.playerId = undefined;
    });

    socket.on('ready', (payload) => {
      const room = manager.setReady(socket.id, payload.ready);
      if (room) {
        broadcastRoom(io, manager, room.roomCode);
      }
    });

    socket.on('startGame', () => {
      const room = manager.startGame(socket.id);
      if (!room) {
        socket.emit('errorMessage', '開始できません。参加者とReady状態を確認してください。');
        return;
      }
      broadcastRoom(io, manager, room.roomCode);
      io.to(room.roomCode).emit('gameState', manager.toPublicGameState(room));
      io.to(room.roomCode).emit('gameLog', room.logs.slice(-8));
    });

    socket.on('restartGame', () => {
      const room = manager.restartGame(socket.id);
      if (!room) {
        socket.emit('errorMessage', '再戦できません。');
        return;
      }
      broadcastRoom(io, manager, room.roomCode);
      io.to(room.roomCode).emit('gameState', manager.toPublicGameState(room));
      io.to(room.roomCode).emit('gameLog', room.logs.slice(-8));
    });

    socket.on('playerInput', (payload) => {
      manager.setInput(socket.id, payload);
    });

    socket.on('disconnect', () => {
      const room = manager.disconnect(socket.id);
      if (room) {
        broadcastRoom(io, manager, room.roomCode);
      }
    });
  });
}

function attach(socket: GameSocket, roomCode: string, playerId: string) {
  socket.data.roomCode = roomCode;
  socket.data.playerId = playerId;
}

function broadcastRoom(io: GameServer, manager: RoomManager, roomCode: string) {
  const room = manager.getRoom(roomCode);
  if (!room) {
    return;
  }
  io.to(roomCode).emit('roomState', manager.toPublicRoomState(room));
}
