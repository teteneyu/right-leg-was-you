import { useEffect, useRef } from 'react';
import {
  ROLE_LABELS,
  type GameLogEntry,
  type PlayerState,
  type PublicGameState,
  type PublicRoomState
} from '@right-leg/shared';
import type { GameSocket } from '../socket/types.js';
import { useAudioFeedback } from '../game/audio.js';
import { useGameInput } from '../game/input.js';
import { GameCanvas } from './GameCanvas.js';

type Props = {
  socket: GameSocket;
  connected: boolean;
  roomState: PublicRoomState;
  gameState: PublicGameState;
  logs: GameLogEntry[];
  me: PlayerState | null;
  onLeave: () => void;
};

export function GameScreen({ socket, connected, roomState, gameState, logs, me, onLeave }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const { enabled: audioEnabled, enableAudio } = useAudioFeedback(gameState);
  useGameInput(socket, roomState, me);

  useEffect(() => {
    wrapperRef.current?.focus();
  }, []);

  const resultText =
    gameState.result === 'victory'
      ? '勝利'
      : gameState.result === 'timeout'
        ? '時間切れ'
        : gameState.result === 'fall' || gameState.result === 'defeat'
          ? '敗北'
          : '進行中';

  return (
    <section className="game-layout" tabIndex={-1} ref={wrapperRef}>
      <header className="game-topbar">
        <div>
          <span className="muted">部屋</span>
          <strong>{roomState.roomCode}</strong>
        </div>
        <div>
          <span className="muted">あなた</span>
          <strong>{me ? ROLE_LABELS[me.role] : '観戦'}</strong>
        </div>
        <div>
          <span className="muted">通信</span>
          <strong>{connected ? '接続中' : '切断'}</strong>
        </div>
        <button className="secondary" type="button" onClick={enableAudio}>
          {audioEnabled ? '音ON' : '音を鳴らす'}
        </button>
        <button className="ghost" type="button" onClick={onLeave}>
          ロビーを出る
        </button>
      </header>

      <div className="play-surface">
        <GameCanvas state={gameState} me={me} logs={logs} />
        {roomState.phase === 'finished' ? (
          <div className="result-overlay">
            <div className="result-panel">
              <span className="eyebrow">result</span>
              <h2>{resultText}</h2>
              {gameState.scores[0] ? (
                <div className="mvp-box">
                  <span className="muted">MVP</span>
                  <strong>{gameState.scores[0].name}</strong>
                  <small>
                    SCORE {gameState.scores[0].score} / DMG {gameState.scores[0].damageDealt} / SAVE{' '}
                    {gameState.scores[0].guardSaves}
                  </small>
                </div>
              ) : null}
              <p>
                ボスHP {Math.round(gameState.boss.hp)} / {gameState.boss.maxHp}、
                ロボHP {Math.round(gameState.robot.hp)} / {gameState.robot.maxHp}。
                何が起きたかは事故ログに残っています。
              </p>
              {gameState.scores.length > 1 ? (
                <ol className="score-list">
                  {gameState.scores.slice(0, 4).map((score) => (
                    <li key={score.playerId}>
                      <span>{score.name}</span>
                      <strong>{score.score}</strong>
                    </li>
                  ))}
                </ol>
              ) : null}
              <div className="result-actions">
                <button type="button" onClick={() => socket.emit('restartGame')}>
                  もう一回
                </button>
                <button type="button" className="secondary" onClick={onLeave}>
                  ロビーに戻る
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
