import { useState } from 'react';
import { ROLE_LABELS, type PlayerState, type PublicRoomState } from '@right-leg/shared';
import type { GameSocket } from '../socket/types.js';

type Props = {
  socket: GameSocket;
  connected: boolean;
  roomState: PublicRoomState | null;
  me: PlayerState | null;
  playerId: string | null;
  setPlayerId: (id: string) => void;
  onLeave: () => void;
};

export function Lobby({ socket, connected, roomState, me, setPlayerId, onLeave }: Props) {
  const [name, setName] = useState(() => localStorage.getItem('right-leg-name') ?? '');
  const [roomCode, setRoomCode] = useState('');
  const [pending, setPending] = useState(false);

  const saveName = () => localStorage.setItem('right-leg-name', name.trim());

  const createRoom = () => {
    setPending(true);
    saveName();
    socket.emit('createRoom', { name }, (res) => {
      setPending(false);
      if (res.ok && res.playerId) {
        setPlayerId(res.playerId);
      }
    });
  };

  const joinRoom = () => {
    setPending(true);
    saveName();
    socket.emit('joinRoom', { roomCode, name }, (res) => {
      setPending(false);
      if (res.ok && res.playerId) {
        setPlayerId(res.playerId);
      }
    });
  };

  return (
    <section className="lobby-layout">
      <div className="lobby-hero">
        <div className="title-zone">
          <p className="eyebrow">co-op cardboard boss battle</p>
          <h1>右足お前かよ</h1>
          <p className="lead">
            全員で1体の段ボールロボを動かして、暴走掃除機「スイトルンバMk.0」を倒す。
            通話しながら踏ん張って、殴って、だいたい転ぶ。
          </p>
        </div>
        <div className="lobby-status">
          <span className={connected ? 'status-dot is-online' : 'status-dot'} />
          <strong>{connected ? 'オンライン' : '接続待ち'}</strong>
          <small>1〜4人 / 60秒ボス戦</small>
        </div>
      </div>

      <div className="lobby-grid">
        <section className="panel setup-panel">
          <h2>{roomState ? '出撃準備' : '部屋を作る / 入る'}</h2>
          <label className="field-label" htmlFor="player-name">
            名前
          </label>
          <input
            id="player-name"
            value={name}
            maxLength={16}
            placeholder="段ボール操縦士"
            onChange={(event) => setName(event.target.value)}
          />

          {!roomState ? (
            <div className="room-actions">
              <button disabled={!connected || pending} type="button" onClick={createRoom}>
                部屋を作る
              </button>
              <div className="join-row">
                <input
                  value={roomCode}
                  maxLength={4}
                  placeholder="参加コード"
                  onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                />
                <button disabled={!connected || pending} type="button" onClick={joinRoom}>
                  参加
                </button>
              </div>
            </div>
          ) : (
            <div className="room-summary">
              <div>
                <span className="muted">参加コード</span>
                <strong className="room-code">{roomState.roomCode}</strong>
              </div>
              <div>
                <span className="muted">あなた</span>
                <strong>{me ? ROLE_LABELS[me.role] : '割り当て待ち'}</strong>
              </div>
              <div className="lobby-buttons">
                <button
                  type="button"
                  className={me?.ready ? 'secondary is-active' : 'secondary'}
                  onClick={() => socket.emit('ready', { ready: !me?.ready })}
                >
                  {me?.ready ? 'Ready解除' : 'Ready'}
                </button>
                {me?.host ? (
                  <button type="button" onClick={() => socket.emit('startGame')}>
                    Start
                  </button>
                ) : null}
                <button type="button" className="ghost" onClick={onLeave}>
                  退出
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="panel players-panel">
          <h2>搭乗者</h2>
          <ul className="player-list">
            {roomState?.players.map((player) => (
              <li key={player.id} className={player.id === me?.id ? 'self' : ''}>
                <span>
                  <strong>{player.name}</strong>
                  <small>{ROLE_LABELS[player.role]}</small>
                </span>
                <em>{player.connected ? (player.ready ? 'READY' : '待機') : '切断'}</em>
              </li>
            )) ?? <li className="empty-player">まだ誰も乗っていない</li>}
          </ul>
        </section>

        <section className="panel brief-panel">
          <h2>採用デザイン</h2>
          <p>
            操作はWASD + Spaceのみ。A/Dは全員共通の顔パーツを傾けて姿勢調整、
            Spaceは短押しで突き、長押しで回転攻撃。
          </p>
          <div className="control-map">
            <span>W: 上げる / 歩く</span>
            <span>A/D: 顔で傾き調整</span>
            <span>S: 踏ん張り / ガード</span>
            <span>Space: 短押し突き / 長押し回転</span>
          </div>
        </section>
      </div>
    </section>
  );
}
