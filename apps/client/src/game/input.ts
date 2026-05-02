import { useEffect, useRef } from 'react';
import { GAME_CONFIG, type PlayerState, type PublicRoomState } from '@right-leg/shared';
import type { GameSocket } from '../socket/types.js';

export function useGameInput(socket: GameSocket, roomState: PublicRoomState, me: PlayerState | null) {
  const pressed = useRef(new Set<string>());
  const seq = useRef(0);
  const meRef = useRef(me);
  const roomRef = useRef(roomState);

  useEffect(() => {
    meRef.current = me;
    roomRef.current = roomState;
  }, [me, roomState]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isGameKey(event.code)) {
        event.preventDefault();
        pressed.current.add(event.code);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (isGameKey(event.code)) {
        event.preventDefault();
        pressed.current.delete(event.code);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const timer = window.setInterval(() => {
      const player = meRef.current;
      const room = roomRef.current;
      if (!player || room.phase !== 'playing' || player.role === 'spectator') {
        return;
      }
      const keys = pressed.current;
      socket.emit('playerInput', {
        roomId: room.roomCode,
        playerId: player.id,
        role: player.role,
        seq: seq.current++,
        input: {
          up: keys.has('KeyW'),
          down: keys.has('KeyS'),
          left: keys.has('KeyA'),
          right: keys.has('KeyD'),
          action: keys.has('Space'),
          guard: keys.has('KeyS'),
          jump: false,
          power: 1
        },
        clientTime: Date.now()
      });
    }, 1000 / GAME_CONFIG.inputSendRate);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.clearInterval(timer);
    };
  }, [socket]);
}

function isGameKey(code: string) {
  return [
    'KeyW',
    'KeyA',
    'KeyS',
    'KeyD',
    'Space'
  ].includes(code);
}
