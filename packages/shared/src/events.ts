import type {
  CreateRoomResponse,
  JoinRoomResponse,
  PlayerInput,
  PublicGameState,
  PublicRoomState,
  GameLogEntry
} from './types.js';

export type ClientToServerEvents = {
  createRoom: (
    payload: { name: string },
    cb: (res: CreateRoomResponse) => void
  ) => void;
  joinRoom: (
    payload: { roomCode: string; name: string },
    cb: (res: JoinRoomResponse) => void
  ) => void;
  leaveRoom: () => void;
  ready: (payload: { ready: boolean }) => void;
  playerInput: (payload: PlayerInput) => void;
  startGame: () => void;
  restartGame: () => void;
};

export type ServerToClientEvents = {
  roomState: (state: PublicRoomState) => void;
  gameState: (state: PublicGameState) => void;
  gameLog: (entries: GameLogEntry[]) => void;
  errorMessage: (message: string) => void;
};

export type InterServerEvents = Record<string, never>;

export type SocketData = {
  roomCode?: string;
  playerId?: string;
};
