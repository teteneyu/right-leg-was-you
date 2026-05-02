import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { PublicGameState } from '@right-leg/shared';

type SoundKey = 'warning' | 'suck' | 'hit' | 'robotHit' | 'fall' | 'victory' | 'trashBreak' | 'star' | 'heal';

const seSources: Partial<Record<SoundKey, string>> = {
  warning: '/assets/audio/se/Warning-Siren05.mp3',
  suck: '/assets/audio/se/Vacuum_Cleaner04.mp3',
  hit: '/assets/audio/se/Motion-Slam06.mp3',
  robotHit: '/assets/audio/se/Hit-Punch02.mp3',
  fall: '/assets/audio/se/Motion-Slam06.mp3',
  victory: '/assets/audio/se/Victory.mp3',
  trashBreak: '/assets/audio/se/Motion-Slam06(Light).mp3',
  star: '/assets/audio/se/star.mp3',
  heal: '/assets/audio/se/heal.mp3'
};

type SeManifest = Partial<Record<SoundKey, string>>;

export function useAudioFeedback(gameState: PublicGameState) {
  const [enabled, setEnabled] = useState(false);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const seRef = useRef<Partial<Record<SoundKey, HTMLAudioElement>>>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const gameStateRef = useRef(gameState);
  const prevBossPhase = useRef(gameState.boss.phase);
  const prevBossMove = useRef(gameState.boss.currentMove);
  const prevBossHp = useRef(gameState.boss.hp);
  const prevRobotHp = useRef(gameState.robot.hp);
  const prevResult = useRef(gameState.result);
  const prevHazardIds = useRef(new Set(gameState.hazards.map((hazard) => hazard.id)));
  const prevPickupIds = useRef(new Set(gameState.pickups.map((pickup) => pickup.id)));

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    let disposed = false;
    bgmRef.current = makeAudio('/assets/audio/bgm/enemy-battle.ogg', 0.32, true);
    void loadSeManifest().then((manifest) => {
      if (disposed) return;
      for (const [key, src] of Object.entries(manifest) as [SoundKey, string][]) {
        seRef.current[key] = makeAudio(src, key === 'suck' ? 0.26 : 0.38, false);
      }
    });

    return () => {
      disposed = true;
      bgmRef.current?.pause();
      for (const audio of Object.values(seRef.current)) {
        audio?.pause();
      }
      void audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const unlock = () => {
      unlockAudioContext(audioContextRef);
      setEnabled(true);
      if (gameStateRef.current.phase === 'playing') {
        void bgmRef.current?.play().catch(() => undefined);
      }
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    const bgm = bgmRef.current;
    if (!bgm) return;
    if (enabled && gameState.phase === 'playing' && !gameState.result) {
      void bgm.play().catch(() => undefined);
    } else {
      bgm.pause();
      if (gameState.phase === 'finished' || gameState.result) {
        bgm.currentTime = 0;
      }
    }
  }, [enabled, gameState.phase, gameState.result]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden || gameStateRef.current.phase !== 'playing') {
        bgmRef.current?.pause();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (!enabled) {
      prevBossPhase.current = gameState.boss.phase;
      prevBossMove.current = gameState.boss.currentMove;
      prevBossHp.current = gameState.boss.hp;
      prevRobotHp.current = gameState.robot.hp;
      prevResult.current = gameState.result;
      prevHazardIds.current = new Set(gameState.hazards.map((hazard) => hazard.id));
      prevPickupIds.current = new Set(gameState.pickups.map((pickup) => pickup.id));
      return;
    }

    const playSound = (key: SoundKey) => {
      const audio = seRef.current[key];
      if (!audio) {
        playFallback(audioContextRef, key);
        return;
      }
      audio.currentTime = 0;
      void audio.play().catch(() => playFallback(audioContextRef, key));
    };

    if (gameState.boss.phase === 'tell' && prevBossPhase.current !== 'tell') {
      playSound('warning');
    }

    if (
      gameState.boss.phase === 'attack' &&
      gameState.boss.currentMove === 'suck' &&
      (prevBossPhase.current !== 'attack' || prevBossMove.current !== 'suck')
    ) {
      playSound('suck');
    }

    const hazardIds = new Set(gameState.hazards.map((hazard) => hazard.id));
    const pickupIds = new Set(gameState.pickups.map((pickup) => pickup.id));
    const removedHazard = [...prevHazardIds.current].some((id) => !hazardIds.has(id));
    const spawnedPickup = [...pickupIds].some((id) => !prevPickupIds.current.has(id));

    if (removedHazard && gameState.robot.hp >= prevRobotHp.current) {
      playSound('trashBreak');
    }

    if (spawnedPickup) {
      playSound('star');
    }

    if (gameState.robot.hp > prevRobotHp.current) {
      playSound('heal');
    }

    if (gameState.boss.hp < prevBossHp.current) {
      playSound('hit');
    }

    if (gameState.robot.hp < prevRobotHp.current) {
      playSound('robotHit');
    }

    if (gameState.result && prevResult.current !== gameState.result) {
      playSound(gameState.result === 'victory' ? 'victory' : 'fall');
    }

    prevBossPhase.current = gameState.boss.phase;
    prevBossMove.current = gameState.boss.currentMove;
    prevBossHp.current = gameState.boss.hp;
    prevRobotHp.current = gameState.robot.hp;
    prevResult.current = gameState.result;
    prevHazardIds.current = hazardIds;
    prevPickupIds.current = pickupIds;
  }, [enabled, gameState]);

  const enableAudio = () => {
    unlockAudioContext(audioContextRef);
    setEnabled(true);
    if (gameStateRef.current.phase === 'playing' && !gameStateRef.current.result) {
      void bgmRef.current?.play().catch(() => undefined);
    }
  };

  return { enabled, enableAudio };
}

async function loadSeManifest(): Promise<SeManifest> {
  try {
    const response = await fetch('/assets/audio/se/manifest.json', { cache: 'no-cache' });
    if (!response.ok) return {};
    const manifest = (await response.json()) as SeManifest;
    return Object.fromEntries(
      (Object.entries(manifest) as [SoundKey, string][])
        .filter(([key, src]) => key in seSources && typeof src === 'string' && src.startsWith('/assets/audio/se/'))
    ) as SeManifest;
  } catch {
    return {};
  }
}

function makeAudio(src: string, volume: number, loop: boolean) {
  const audio = new Audio(src);
  audio.volume = volume;
  audio.loop = loop;
  audio.preload = 'auto';
  return audio;
}

function unlockAudioContext(ref: MutableRefObject<AudioContext | null>) {
  if (!ref.current) {
    ref.current = new AudioContext();
  }
  if (ref.current.state === 'suspended') {
    void ref.current.resume();
  }
}

function playFallback(ref: MutableRefObject<AudioContext | null>, key: SoundKey) {
  const context = ref.current;
  if (!context) return;

  const osc = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;
  const spec = fallbackSpec(key);

  osc.type = key === 'suck' ? 'sawtooth' : 'square';
  osc.frequency.setValueAtTime(spec.start, now);
  osc.frequency.exponentialRampToValueAtTime(spec.end, now + spec.duration);
  gain.gain.setValueAtTime(spec.volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + spec.duration);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(now);
  osc.stop(now + spec.duration);
}

function fallbackSpec(key: SoundKey) {
  switch (key) {
    case 'warning':
      return { start: 740, end: 420, duration: 0.18, volume: 0.06 };
    case 'suck':
      return { start: 120, end: 70, duration: 0.42, volume: 0.045 };
    case 'hit':
      return { start: 180, end: 75, duration: 0.12, volume: 0.08 };
    case 'robotHit':
      return { start: 120, end: 50, duration: 0.16, volume: 0.09 };
    case 'victory':
      return { start: 520, end: 880, duration: 0.5, volume: 0.07 };
    case 'trashBreak':
      return { start: 360, end: 120, duration: 0.1, volume: 0.06 };
    case 'star':
      return { start: 780, end: 1180, duration: 0.22, volume: 0.055 };
    case 'heal':
      return { start: 420, end: 820, duration: 0.34, volume: 0.055 };
    case 'fall':
      return { start: 180, end: 55, duration: 0.32, volume: 0.08 };
  }
}
