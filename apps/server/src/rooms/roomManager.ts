import {
  GAME_CONFIG,
  type CreateRoomResponse,
  type JoinRoomResponse,
  type PlayerInput,
  type PlayerScore,
  type PlayerState,
  type PublicGameState,
  type PublicRoomState,
  type RoomState
} from '@right-leg/shared';
import { createInitialBoss, createInitialRobot, stepRoom } from '../game/simulation.js';
import { assignRoles } from './roleAssignment.js';

type ManagedRoom = RoomState & {
  bossMoveIndex: number;
  moveApplied: boolean;
  lastWarningLevel: number;
  lastBroadcastAt: number;
};

const MAX_PLAYERS = 4;
const ROOM_TTL_MS = 20 * 60 * 1000;

export class RoomManager {
  private rooms = new Map<string, ManagedRoom>();
  private socketToRoom = new Map<string, string>();

  createRoom(socketId: string, rawName: string): CreateRoomResponse {
    const name = normalizeName(rawName);
    if (!name) {
      return { ok: false, message: '名前を入力してください。' };
    }

    const roomCode = this.makeRoomCode();
    const now = Date.now();
    const player: PlayerState = {
      id: socketId,
      name,
      role: 'leftSide',
      ready: false,
      connected: true,
      host: true,
      joinedAt: now
    };

    const room: ManagedRoom = {
      roomCode,
      phase: 'lobby',
      players: { [socketId]: player },
      robot: createInitialRobot(),
      boss: createInitialBoss(),
      inputs: {},
      logs: [],
      hazards: [],
      pickups: [],
      hazardSeq: 0,
      scores: {},
      result: null,
      createdAt: now,
      lastActiveAt: now,
      bossMoveIndex: 0,
      moveApplied: false,
      lastWarningLevel: 0,
      lastBroadcastAt: 0
    };

    this.rooms.set(roomCode, room);
    this.socketToRoom.set(socketId, roomCode);
    assignRoles(room.players);
    addSystemLog(room, `${name} が段ボールロボに乗り込んだ`);

    return {
      ok: true,
      roomCode,
      playerId: socketId,
      state: this.toPublicRoomState(room)
    };
  }

  joinRoom(socketId: string, rawRoomCode: string, rawName: string): JoinRoomResponse {
    const roomCode = rawRoomCode.trim().toUpperCase();
    const name = normalizeName(rawName);
    const room = this.rooms.get(roomCode);

    if (!room) {
      return { ok: false, message: '部屋が見つかりません。' };
    }
    if (!name) {
      return { ok: false, message: '名前を入力してください。' };
    }
    if (Object.values(room.players).filter((player) => player.connected).length >= MAX_PLAYERS) {
      return { ok: false, message: 'この部屋は満員です。' };
    }

    const now = Date.now();
    room.players[socketId] = {
      id: socketId,
      name,
      role: 'spectator',
      ready: false,
      connected: true,
      host: !Object.values(room.players).some((player) => player.host && player.connected),
      joinedAt: now
    };

    this.socketToRoom.set(socketId, roomCode);
    room.lastActiveAt = now;
    assignRoles(room.players);
    addSystemLog(room, `${name} が参加した`);

    return {
      ok: true,
      roomCode,
      playerId: socketId,
      state: this.toPublicRoomState(room)
    };
  }

  getRoom(roomCode: string) {
    return this.rooms.get(roomCode);
  }

  leaveRoom(socketId: string) {
    const room = this.getRoomBySocket(socketId);
    if (!room) {
      return undefined;
    }
    this.disconnect(socketId);
    this.socketToRoom.delete(socketId);
    return room;
  }

  disconnect(socketId: string) {
    const room = this.getRoomBySocket(socketId);
    const player = room?.players[socketId];
    if (!room || !player) {
      return undefined;
    }

    player.connected = false;
    player.ready = false;
    delete room.inputs[socketId];
    room.lastActiveAt = Date.now();
    addSystemLog(room, `${player.name} の接続が切れた`);
    ensureHost(room);
    assignRoles(room.players);
    return room;
  }

  setReady(socketId: string, ready: boolean) {
    const room = this.getRoomBySocket(socketId);
    const player = room?.players[socketId];
    if (!room || !player || !player.connected || room.phase === 'playing') {
      return undefined;
    }
    player.ready = ready;
    room.lastActiveAt = Date.now();
    return room;
  }

  startGame(socketId: string) {
    const room = this.getRoomBySocket(socketId);
    if (!room || !canStart(room, socketId)) {
      return undefined;
    }
    resetForPlay(room);
    addSystemLog(room, '暴走掃除機が起動した');
    return room;
  }

  restartGame(socketId: string) {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.phase === 'playing') {
      return undefined;
    }
    Object.values(room.players).forEach((player) => {
      if (player.connected) {
        player.ready = true;
      }
    });
    resetForPlay(room);
    addSystemLog(room, 'もう一戦。段ボールの補修は雑に済ませた');
    return room;
  }

  setInput(socketId: string, input: PlayerInput) {
    const room = this.getRoomBySocket(socketId);
    const player = room?.players[socketId];
    if (!room || !player || !player.connected || room.phase !== 'playing') {
      return;
    }
    room.inputs[socketId] = {
      ...input,
      playerId: socketId,
      roomId: room.roomCode,
      role: player.role,
      clientTime: Date.now()
    };
    room.lastActiveAt = Date.now();
  }

  tick(dtMs: number) {
    const changed: ManagedRoom[] = [];
    const now = Date.now();
    for (const room of this.rooms.values()) {
      if (room.phase !== 'playing') {
        continue;
      }
      const resultBefore = room.result;
      stepRoom(room, dtMs, now);
      const resultChanged = resultBefore !== room.result;
      if (resultChanged || now - room.lastBroadcastAt >= 1000 / GAME_CONFIG.stateBroadcastRate) {
        room.lastBroadcastAt = now;
        changed.push(room);
      }
    }
    return changed;
  }

  cleanup() {
    const now = Date.now();
    for (const [roomCode, room] of this.rooms.entries()) {
      const hasConnected = Object.values(room.players).some((player) => player.connected);
      if (!hasConnected && now - room.lastActiveAt > ROOM_TTL_MS) {
        this.rooms.delete(roomCode);
      }
    }
  }

  toPublicRoomState(room: RoomState): PublicRoomState {
    return {
      roomCode: room.roomCode,
      phase: room.phase,
      players: Object.values(room.players).sort((a, b) => a.joinedAt - b.joinedAt),
      result: room.result
    };
  }

  toPublicGameState(room: RoomState): PublicGameState {
    const elapsedMs = room.startedAt ? Date.now() - room.startedAt : 0;
    return {
      roomCode: room.roomCode,
      phase: room.phase,
      robot: room.robot,
      boss: room.boss,
      logs: room.logs.slice(-8),
      hazards: room.hazards,
      pickups: room.pickups,
      scores: this.toPublicScores(room),
      elapsedMs,
      timeRemainingMs: Math.max(0, GAME_CONFIG.gameDurationMs - elapsedMs),
      result: room.result
    };
  }

  private getRoomBySocket(socketId: string) {
    const roomCode = this.socketToRoom.get(socketId);
    return roomCode ? this.rooms.get(roomCode) : undefined;
  }

  private makeRoomCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 20; attempt += 1) {
      let code = '';
      for (let i = 0; i < 4; i += 1) {
        code += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      if (!this.rooms.has(code)) {
        return code;
      }
    }
    return String(Date.now()).slice(-4);
  }

  private toPublicScores(room: RoomState): PlayerScore[] {
    const scores = room.scores ?? {};
    return Object.values(room.players)
      .filter((player) => player.connected || scores[player.id])
      .sort((a, b) => b.joinedAt - a.joinedAt)
      .map((player) => {
        const current = scores[player.id];
        const damageDealt = Math.round(current?.damageDealt ?? 0);
        const guardSaves = current?.guardSaves ?? 0;
        const falls = current?.falls ?? 0;
        return {
          playerId: player.id,
          name: player.name,
          role: player.role,
          damageDealt,
          guardSaves,
          falls,
          score: Math.max(0, Math.round(damageDealt * 10 + guardSaves * 120 - falls * 80))
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}

export function addSystemLog(room: RoomState, message: string) {
  addLog(room, 'system', message);
}

export function addLog(
  room: RoomState,
  type: RoomState['logs'][number]['type'],
  message: string,
  playerId?: string
) {
  const elapsedMs = room.startedAt ? Date.now() - room.startedAt : 0;
  room.logs.push({
    id: `${Date.now()}-${room.logs.length}`,
    t: elapsedMs,
    type,
    playerId,
    role: playerId ? room.players[playerId]?.role : undefined,
    message
  });
  if (room.logs.length > 80) {
    room.logs.splice(0, room.logs.length - 80);
  }
}

function normalizeName(name: string) {
  return name.trim().slice(0, 16);
}

function canStart(room: ManagedRoom, socketId: string) {
  const player = room.players[socketId];
  const connected = Object.values(room.players).filter((item) => item.connected);
  if (!player?.host || connected.length < 1 || room.phase === 'playing') {
    return false;
  }
  return connected.every((item) => item.ready || item.id === socketId);
}

function resetForPlay(room: ManagedRoom) {
  room.phase = 'playing';
  room.result = null;
  room.robot = createInitialRobot();
  room.boss = createInitialBoss();
  room.inputs = {};
  room.logs = [];
  room.hazards = [];
  room.pickups = [];
  room.hazardSeq = 0;
  room.scores = {};
  room.startedAt = Date.now();
  room.finishedAt = undefined;
  room.lastActiveAt = Date.now();
  room.bossMoveIndex = 0;
  room.moveApplied = false;
  room.lastWarningLevel = 0;
  room.lastBroadcastAt = 0;
  Object.values(room.players).forEach((player) => {
    if (player.connected) {
      player.ready = true;
    }
  });
  assignRoles(room.players);
}

function ensureHost(room: ManagedRoom) {
  const connected = Object.values(room.players)
    .filter((player) => player.connected)
    .sort((a, b) => a.joinedAt - b.joinedAt);

  if (connected.some((player) => player.host)) {
    return;
  }

  const nextHost = connected[0];
  if (nextHost) {
    nextHost.host = true;
  }
}
