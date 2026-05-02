export type PartKey = 'leftLeg' | 'rightLeg' | 'leftArm' | 'rightArm';

export type RobotRole =
  | PartKey
  | 'all'
  | 'leftSide'
  | 'rightSide'
  | 'arms'
  | 'spectator';

export type RoomPhase = 'lobby' | 'playing' | 'finished';

export type GameResult =
  | 'victory'
  | 'fall'
  | 'defeat'
  | 'timeout'
  | 'disconnect'
  | null;

export type BossMove = 'suck' | 'charge' | 'trashShot' | 'weakPoint';

export type PartAction = 'idle' | 'lift' | 'brace' | 'attack' | 'guard' | 'jump' | 'windup' | 'spinAttack';

export type HazardKind = 'airTrash' | 'floorTrash';

export type HazardState = {
  id: string;
  kind: HazardKind;
  variant: number;
  x: number;
  y: number;
  targetY: number;
  velocityY: number;
  ageMs: number;
  durationMs: number;
};

export type PickupState = {
  id: string;
  kind: 'heart';
  x: number;
  y: number;
  ageMs: number;
  durationMs: number;
  collecting: boolean;
  collectAgeMs: number;
  collectDurationMs: number;
};

export type PlayerControls = {
  up: boolean;
  down: boolean;
  left?: boolean;
  right?: boolean;
  action: boolean;
  guard: boolean;
  jump?: boolean;
  power?: number;
};

export type PartState = {
  angle: number;
  power: number;
  action: PartAction;
  cooldownMs: number;
  spinCharge: number;
  spinVelocity: number;
  spinDirection: number;
  actionHeld: boolean;
  jumpHeld: boolean;
  releaseAttackMs: number;
  hitApplied: boolean;
  impactReady: boolean;
};

export type PlayerScore = {
  playerId: string;
  name: string;
  role: RobotRole;
  damageDealt: number;
  guardSaves: number;
  falls: number;
  score: number;
};

export type RobotState = {
  x: number;
  y: number;
  velocityX: number;
  hp: number;
  maxHp: number;
  damageFlashMs: number;
  bodyAngle: number;
  faceAngle: number;
  angularVelocity: number;
  balance: number;
  fallGauge: number;
  stunMs: number;
  downMs: number;
  verticalVelocity: number;
  airborne: boolean;
  jumpCooldownMs: number;
  parts: Record<PartKey, PartState>;
};

export type BossState = {
  hp: number;
  maxHp: number;
  phase: 'idle' | 'tell' | 'attack' | 'vulnerable' | 'defeated';
  currentMove?: BossMove;
  phaseTimeMs: number;
  positionX: number;
};

export type PlayerInput = {
  roomId: string;
  playerId: string;
  role: RobotRole;
  seq: number;
  input: PlayerControls;
  clientTime: number;
};

export type PlayerState = {
  id: string;
  name: string;
  role: RobotRole;
  ready: boolean;
  connected: boolean;
  host: boolean;
  joinedAt: number;
};

export type GameLogEntry = {
  id: string;
  t: number;
  type: 'input' | 'boss' | 'warning' | 'damage' | 'fall' | 'goal' | 'system';
  playerId?: string;
  role?: RobotRole;
  message: string;
};

export type RoomState = {
  roomCode: string;
  phase: RoomPhase;
  players: Record<string, PlayerState>;
  robot: RobotState;
  boss: BossState;
  inputs: Record<string, PlayerInput>;
  logs: GameLogEntry[];
  hazards: HazardState[];
  pickups: PickupState[];
  hazardSeq: number;
  scores?: Record<string, PlayerScore>;
  startedAt?: number;
  finishedAt?: number;
  result: GameResult;
  createdAt: number;
  lastActiveAt: number;
};

export type PublicRoomState = {
  roomCode: string;
  phase: RoomPhase;
  players: PlayerState[];
  result: GameResult;
};

export type PublicGameState = {
  roomCode: string;
  phase: RoomPhase;
  robot: RobotState;
  boss: BossState;
  logs: GameLogEntry[];
  hazards: HazardState[];
  pickups: PickupState[];
  scores: PlayerScore[];
  timeRemainingMs: number;
  elapsedMs: number;
  result: GameResult;
};

export type CreateRoomResponse = {
  ok: boolean;
  message?: string;
  roomCode?: string;
  playerId?: string;
  state?: PublicRoomState;
};

export type JoinRoomResponse = CreateRoomResponse;
