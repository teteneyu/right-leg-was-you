import { useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  GameLogEntry,
  PublicGameState,
  PublicRoomState,
  ServerToClientEvents
} from '@right-leg/shared';
import { GameScreen } from './ui/GameScreen.js';
import { Lobby } from './ui/Lobby.js';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function serverUrl() {
  const envUrl = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (envUrl) return envUrl;
  return window.location.port === '5173' ? `${window.location.protocol}//${window.location.hostname}:4000` : window.location.origin;
}

export function App() {
  const socket = useMemo<GameSocket>(() => io(serverUrl(), { autoConnect: true }), []);
  const [connected, setConnected] = useState(socket.connected);
  const [roomState, setRoomState] = useState<PublicRoomState | null>(null);
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [logs, setLogs] = useState<GameLogEntry[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onRoomState = (state: PublicRoomState) => {
      setRoomState(state);
      if (state.phase === 'lobby') {
        setGameState(null);
      }
    };
    const onGameState = (state: PublicGameState) => setGameState(state);
    const onGameLog = (entries: GameLogEntry[]) => setLogs(entries);
    const onError = (message: string) => setError(message);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('roomState', onRoomState);
    socket.on('gameState', onGameState);
    socket.on('gameLog', onGameLog);
    socket.on('errorMessage', onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('roomState', onRoomState);
      socket.off('gameState', onGameState);
      socket.off('gameLog', onGameLog);
      socket.off('errorMessage', onError);
    };
  }, [socket]);

  const me = roomState?.players.find((player) => player.id === playerId) ?? null;

  const clearError = () => setError(null);

  const leaveRoom = () => {
    socket.emit('leaveRoom');
    setRoomState(null);
    setGameState(null);
    setLogs([]);
    setPlayerId(null);
  };

  return (
    <main className="app-shell">
      {roomState && (roomState.phase === 'playing' || roomState.phase === 'finished') && gameState ? (
        <GameScreen
          socket={socket}
          connected={connected}
          roomState={roomState}
          gameState={gameState}
          logs={logs}
          me={me}
          onLeave={leaveRoom}
        />
      ) : (
        <Lobby
          socket={socket}
          connected={connected}
          roomState={roomState}
          me={me}
          playerId={playerId}
          setPlayerId={setPlayerId}
          onLeave={leaveRoom}
        />
      )}

      {error ? (
        <button className="toast" type="button" onClick={clearError}>
          {error}
        </button>
      ) : null}
    </main>
  );
}
