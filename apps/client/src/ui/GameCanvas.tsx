import { useEffect, useRef } from 'react';
import { MOVE_LABELS, ROLE_LABELS, type GameLogEntry, type PlayerState, type PublicGameState } from '@right-leg/shared';
import { drawGame } from '../game/canvasRenderer.js';

type Props = {
  state: PublicGameState;
  me: PlayerState | null;
  logs: GameLogEntry[];
};

export function GameCanvas({ state, me, logs }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const meRef = useRef(me);
  const logsRef = useRef(logs);

  useEffect(() => {
    stateRef.current = state;
    meRef.current = me;
    logsRef.current = logs;
  }, [state, me, logs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const render = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(800, Math.floor(bounds.width * ratio));
      const height = Math.max(450, Math.floor(bounds.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      drawGame(ctx, stateRef.current, {
        width,
        height,
        deviceRatio: ratio,
        roleLabel: meRef.current ? ROLE_LABELS[meRef.current.role] : '観戦',
        role: meRef.current?.role ?? 'spectator',
        moveLabel: stateRef.current.boss.currentMove ? MOVE_LABELS[stateRef.current.boss.currentMove] : '様子見',
        logs: logsRef.current
      });
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas className="game-canvas" ref={canvasRef} />;
}
