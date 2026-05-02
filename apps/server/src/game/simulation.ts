import {
  GAME_CONFIG,
  type BossMove,
  type BossState,
  type PartAction,
  type PartKey,
  type PlayerControls,
  type PlayerInput,
  type PlayerScore,
  type RobotRole,
  type RobotState,
  type RoomState
} from '@right-leg/shared';
import { addLog } from '../rooms/roomManager.js';

type SimRoom = RoomState & {
  bossMoveIndex: number;
  moveApplied: boolean;
  lastWarningLevel: number;
  lastStepLeg?: PartKey;
};

const bossSequence: BossMove[] = ['suck', 'trashShot', 'charge', 'suck', 'weakPoint'];

export function createInitialRobot(): RobotState {
  return {
    x: 250,
    y: 0,
    velocityX: 0,
    hp: GAME_CONFIG.robotMaxHp,
    maxHp: GAME_CONFIG.robotMaxHp,
    damageFlashMs: 0,
    bodyAngle: 0,
    faceAngle: 0,
    angularVelocity: 0,
    balance: 0,
    fallGauge: 0,
    stunMs: 0,
    downMs: 0,
    verticalVelocity: 0,
    airborne: false,
    jumpCooldownMs: 0,
    parts: {
      leftLeg: createPart(),
      rightLeg: createPart(),
      leftArm: createPart(),
      rightArm: createPart()
    }
  };
}

export function createInitialBoss(): BossState {
  return {
    hp: GAME_CONFIG.bossMaxHp,
    maxHp: GAME_CONFIG.bossMaxHp,
    phase: 'idle',
    currentMove: undefined,
    phaseTimeMs: 0,
    positionX: 790
  };
}

export function stepRoom(room: SimRoom, dtMs: number, now: number) {
  const elapsedMs = room.startedAt ? now - room.startedAt : 0;
  const dt = dtMs / 1000;

  normalizeState(room);
  room.robot.downMs = Math.max(0, room.robot.downMs - dtMs);
  room.robot.damageFlashMs = Math.max(0, room.robot.damageFlashMs - dtMs);
  room.robot.jumpCooldownMs = Math.max(0, room.robot.jumpCooldownMs - dtMs);
  applyPartInputs(room, dtMs);
  updateBoss(room, dtMs);
  updateHazardsAndPickups(room, dtMs);
  applyMovementAndBalance(room, dt);
  checkDownState(room);
  checkWarnings(room);
  checkEnd(room, elapsedMs);
}

function createPart() {
  return {
      angle: 0,
      power: 0,
      action: 'idle' as PartAction,
      cooldownMs: 0,
      spinCharge: 0,
      spinVelocity: 0,
      spinDirection: 0,
      actionHeld: false,
      jumpHeld: false,
      releaseAttackMs: 0,
      hitApplied: false,
      impactReady: false
  };
}

function applyPartInputs(room: SimRoom, dtMs: number) {
  const partControls = collectPartControls(room.inputs);
  ensureScores(room);
  const isDown = room.robot.downMs > 0;
  let downRecoverHits = 0;

  for (const key of Object.keys(room.robot.parts) as PartKey[]) {
    const part = room.robot.parts[key];
    const controls = partControls[key];
    part.cooldownMs = Math.max(0, part.cooldownMs - dtMs);
    part.releaseAttackMs = Math.max(0, part.releaseAttackMs - dtMs);
    const actionPressed = Boolean(controls.action);
    const actionReleased = part.actionHeld && !actionPressed;
    const upPressed = Boolean(controls.up);

    if (isDown) {
      if (actionReleased || (actionPressed && !part.actionHeld)) {
        downRecoverHits += 1;
      }
      part.action = 'idle';
      part.spinCharge = 0;
      part.spinVelocity *= 0.7;
      part.angle = easeAngle(part.angle, 0, 0.18);
      part.actionHeld = actionPressed;
      part.jumpHeld = upPressed;
      continue;
    }

    updatePartSpin(part, key, controls, dtMs, actionReleased);
    part.actionHeld = actionPressed;
    part.jumpHeld = upPressed;
  }

  if (isDown && downRecoverHits > 0) {
    const recoverHits = Math.min(2, downRecoverHits);
    room.robot.downMs = Math.max(0, room.robot.downMs - recoverHits * GAME_CONFIG.downMashRecoverMs);
    room.robot.fallGauge = Math.max(15, room.robot.fallGauge - recoverHits * 3);
    if (room.robot.downMs === 0) {
      addLog(room, 'system', '連打で起き上がった。まだ足元は怪しい');
    }
  }
}

function collectPartControls(inputs: Record<string, PlayerInput>): Record<PartKey, PlayerControls> {
  const empty = (): PlayerControls => ({ up: false, down: false, left: false, right: false, action: false, guard: false, jump: false });
  const controls: Record<PartKey, PlayerControls> = {
    leftLeg: empty(),
    rightLeg: empty(),
    leftArm: empty(),
    rightArm: empty()
  };

  for (const input of Object.values(inputs)) {
    for (const part of partsForRole(input.role)) {
      controls[part] = mergeControls(controls[part], input.input);
    }
  }

  return controls;
}

function partsForRole(role: RobotRole): PartKey[] {
  switch (role) {
    case 'all':
      return ['leftLeg', 'rightLeg', 'leftArm', 'rightArm'];
    case 'leftSide':
      return ['leftLeg', 'leftArm'];
    case 'rightSide':
      return ['rightLeg', 'rightArm'];
    case 'arms':
      return ['leftArm', 'rightArm'];
    case 'leftLeg':
    case 'rightLeg':
    case 'leftArm':
    case 'rightArm':
      return [role];
    default:
      return [];
  }
}

function mergeControls(a: PlayerControls, b: PlayerControls): PlayerControls {
  return {
    up: a.up || b.up,
    down: a.down || b.down,
    left: Boolean(a.left || b.left),
    right: Boolean(a.right || b.right),
    action: a.action || b.action,
    guard: a.guard || b.guard,
    jump: Boolean(a.jump || b.jump),
    power: Math.max(a.power ?? 0, b.power ?? 0)
  };
}

function collectGlobalControls(inputs: Record<string, PlayerInput>): PlayerControls {
  const initial: PlayerControls = { up: false, down: false, left: false, right: false, action: false, guard: false, jump: false };
  return Object.values(inputs).reduce<PlayerControls>(
    (acc, input) => mergeControls(acc, input.input),
    initial
  );
}

function legAction(input: PlayerControls): PartAction {
  if (input.guard || input.down) return 'brace';
  if (input.up) return 'lift';
  return 'idle';
}

function armAction(input: PlayerControls): PartAction {
  if (input.guard || input.down) return 'guard';
  if (input.up) return 'lift';
  return 'idle';
}

function updatePartSpin(
  part: RobotState['parts'][PartKey],
  key: PartKey,
  controls: PlayerControls,
  dtMs: number,
  actionReleased: boolean
) {
  const dt = dtMs / 1000;
  const side = key === 'leftLeg' || key === 'leftArm' ? -1 : 1;
  const windupDirection = 1;
  const baseAction = isLeg(key) ? legAction(controls) : armAction(controls);

  if (controls.action) {
    part.action = 'windup';
    part.spinCharge = Math.min(GAME_CONFIG.spinAttackMaxBonusChargeDeg * 1.4, part.spinCharge + GAME_CONFIG.spinChargeDegPerSec * dt);
    part.spinDirection = windupDirection;
    part.impactReady = false;
    part.hitApplied = false;
    part.spinVelocity = clamp(part.spinVelocity + windupDirection * GAME_CONFIG.spinChargeDegPerSec * 2.5 * dt, -980, 980);
    part.angle = normalizeAngle(part.angle + part.spinVelocity * dt);
    part.power = clamp(part.spinCharge / GAME_CONFIG.spinAttackMaxBonusChargeDeg, 0.15, 1);
    return;
  }

  if (actionReleased && part.cooldownMs <= 0) {
    const charged = part.spinCharge >= GAME_CONFIG.spinAttackMinChargeDeg;
    part.action = charged ? 'spinAttack' : 'attack';
    part.releaseAttackMs = charged ? 850 : 180;
    part.hitApplied = false;
    part.impactReady = !charged;
    part.power = charged ? 1 + clamp(part.spinCharge / GAME_CONFIG.spinAttackMaxBonusChargeDeg, 0, 1.45) : 1;
    part.cooldownMs = isLeg(key) ? 920 : 660;
    part.spinDirection = charged ? part.spinDirection || windupDirection : 0;
    if (charged) {
      part.spinVelocity = part.spinDirection * 1020;
      part.angle = stepSpinTowardImpact(part, key, dt);
    } else {
      part.spinVelocity = 0;
      part.angle = attackFrontAngle(key);
    }
    part.spinCharge = 0;
    return;
  }

  if (part.releaseAttackMs > 0) {
    part.action = part.power > 1 ? 'spinAttack' : 'attack';
    if (part.action === 'spinAttack' && !part.impactReady) {
      part.angle = stepSpinTowardImpact(part, key, dt);
    } else {
      part.spinVelocity += (0 - part.angle) * 8.2 * dt;
      part.spinVelocity *= 0.9;
      part.angle = normalizeAngle(part.angle + part.spinVelocity * dt);
    }
    return;
  }

  part.action = baseAction;
  part.spinCharge = 0;
  part.impactReady = false;
  part.power = baseAction === 'idle' ? Math.max(0, part.power - 0.12) : 1;

  const targetAngle =
    baseAction === 'brace'
      ? side * 26
      : baseAction === 'guard'
        ? side * -48
        : baseAction === 'lift'
          ? side * -72
          : baseAction === 'jump'
            ? side * -118
            : 0;
  part.spinVelocity *= 0.82;
  part.angle = easeAngle(part.angle, targetAngle, 0.24);
}

function isLeg(part: PartKey) {
  return part === 'leftLeg' || part === 'rightLeg';
}

function updateBoss(room: SimRoom, dtMs: number) {
  const boss = room.boss;
  if (boss.phase === 'defeated') {
    return;
  }

  boss.phaseTimeMs += dtMs;
  updateBossPosition(room, dtMs);

  if (boss.phase === 'idle' && boss.phaseTimeMs >= 850) {
    const move = bossSequence[room.bossMoveIndex % bossSequence.length];
    room.bossMoveIndex += 1;
    boss.currentMove = move;
    boss.phase = move === 'weakPoint' ? 'vulnerable' : 'tell';
    boss.phaseTimeMs = 0;
    room.moveApplied = false;
    addLog(room, 'boss', bossMoveStartText(move));
    return;
  }

  if (boss.phase === 'tell' && boss.phaseTimeMs >= GAME_CONFIG.bossTellDurationMs) {
    boss.phase = 'attack';
    boss.phaseTimeMs = 0;
    room.moveApplied = false;
    return;
  }
  if (boss.phase === 'tell') {
    applyPlayerDamage(room, 0.16);
    return;
  }

  if (boss.phase === 'attack') {
    applyBossAttack(room, dtMs);
    applyPlayerDamage(room, 0.18);
    if (boss.phaseTimeMs >= attackDuration(boss.currentMove) || boss.phaseTimeMs > 3000) {
      boss.phase = 'vulnerable';
      boss.phaseTimeMs = 0;
      room.moveApplied = false;
      addLog(room, 'boss', '紙パックの弱点が開いた。近づいて攻撃');
    }
    return;
  }

  if (boss.phase === 'vulnerable') {
    applyPlayerDamage(room, 1);
    const hpRatio = boss.hp / boss.maxHp;
    const vulnerableMs = Math.max(1200, GAME_CONFIG.vulnerableDurationMs * (0.65 + hpRatio * 0.35));
    if (boss.hp <= 0) {
      boss.hp = 0;
      boss.phase = 'defeated';
      room.phase = 'finished';
      room.result = 'victory';
      room.finishedAt = Date.now();
      addLog(room, 'goal', '暴走掃除機、紙パックから夢をこぼして沈黙');
      return;
    }
    if (boss.phaseTimeMs >= vulnerableMs) {
      boss.phase = 'idle';
      boss.currentMove = undefined;
      boss.phaseTimeMs = 0;
      room.moveApplied = false;
    }
  }
}

function updateBossPosition(room: SimRoom, dtMs: number) {
  const boss = room.boss;
  const robot = room.robot;
  const dt = dtMs / 1000;
  let desiredDistance = 500;
  let speed = 90;

  if (boss.phase === 'tell') {
    desiredDistance =
      boss.currentMove === 'charge'
        ? 540
        : boss.currentMove === 'trashShot'
          ? 475
          : boss.currentMove === 'suck'
            ? 430
            : 430;
    speed = boss.currentMove === 'charge' ? 165 : 92;
  } else if (boss.phase === 'attack') {
    if (boss.currentMove === 'charge') {
      boss.positionX -= 430 * dt;
      boss.positionX = clamp(boss.positionX, GAME_CONFIG.bossMinX, GAME_CONFIG.bossMaxX);
      return;
    }
    desiredDistance = boss.currentMove === 'suck' ? 365 : 445;
    speed = boss.currentMove === 'suck' ? 82 : 70;
  } else if (boss.phase === 'vulnerable') {
    desiredDistance = 360;
    speed = 58;
  }

  const desiredX = clamp(robot.x + desiredDistance, GAME_CONFIG.bossMinX, GAME_CONFIG.bossMaxX);
  boss.positionX += clamp(desiredX - boss.positionX, -speed * dt, speed * dt);
}

function applyBossAttack(room: SimRoom, dtMs: number) {
  const move = room.boss.currentMove;
  const robot = room.robot;
  const leftLeg = robot.parts.leftLeg.action;
  const rightLeg = robot.parts.rightLeg.action;
  const leftArm = robot.parts.leftArm.action;
  const rightArm = robot.parts.rightArm.action;
  const downBonus = robot.downMs > 0 ? GAME_CONFIG.downDamageMultiplier : 1;
  const distance = getBossDistance(room);

  if (move === 'suck') {
    const braceCount = Number(leftLeg === 'brace') + Number(rightLeg === 'brace');
    const rangeRatio = clamp(1 - distance / GAME_CONFIG.bossSuckRange, 0, 1);
    if (rangeRatio > 0 && braceCount < 2) {
      robot.angularVelocity += (2 - braceCount) * 0.15 * rangeRatio;
      robot.fallGauge += (2 - braceCount) * 0.72 * rangeRatio * (dtMs / 50);
      robot.velocityX += 46 * rangeRatio * (dtMs / 1000);
    }
    if (!room.moveApplied && room.boss.phaseTimeMs > 550) {
      room.moveApplied = true;
      if (rangeRatio <= 0) {
        addLog(room, 'system', '吸い込み範囲の外。掃除機だけが空回りした');
      } else if (braceCount >= 2) {
        awardSave(room, 'leftLeg');
        awardSave(room, 'rightLeg');
        addLog(room, 'system', '両足が踏ん張った。吸い込みに耐えた');
      } else {
        damageRobot(room, 14 * (2 - braceCount) * downBonus * (0.55 + rangeRatio * 0.45), '吸い込みに引きずられ、HPが削れた');
      }
    }
    return;
  }

  if (move === 'charge' && !room.moveApplied && room.boss.phaseTimeMs > 430) {
    room.moveApplied = true;
    const mobile = Number(leftLeg === 'lift') + Number(rightLeg === 'lift');
    const jumpDodged = robot.airborne && robot.y < -48 && Math.abs(robot.bodyAngle) < 34;
    const walkedDodged = mobile >= 1 && Math.abs(robot.bodyAngle) < 25 && robot.downMs <= 0;
    if (distance > GAME_CONFIG.bossChargeRange) {
      addLog(room, 'system', '突進は届かなかった。間合い管理成功');
    } else if (jumpDodged) {
      robot.velocityX -= 128;
      robot.fallGauge += 6;
      addLog(room, 'system', 'ジャンプで突進を飛び越えた。着地は少し怖い');
    } else if (walkedDodged) {
      robot.velocityX -= 106;
      robot.fallGauge += mobile >= 2 ? 5 : 10;
      addLog(room, 'system', '足が動いた。突進をギリギリいなした');
    } else {
      robot.angularVelocity += 2.05;
      robot.fallGauge += 34;
      damageRobot(room, 22 * downBonus, '突進が直撃。ダウン中ならかなり痛い');
    }
    return;
  }

  if (move === 'trashShot' && !room.moveApplied && room.boss.phaseTimeMs > 360) {
    room.moveApplied = true;
    if (distance > GAME_CONFIG.bossTrashRange) {
      addLog(room, 'system', 'ゴミ噴射は手前で落ちた。遠いと安全');
    } else {
      spawnTrashHazards(room);
    }
  }
}

function spawnTrashHazards(room: SimRoom) {
  const robot = room.robot;
  const seq = () => `hazard-${room.hazardSeq++}`;
  const count = 4;
  for (let i = 0; i < count; i += 1) {
    room.hazards.push({
      id: seq(),
      kind: 'airTrash',
      variant: randomTrashVariant(),
      x: clamp(170 + Math.random() * 500, 170, 670),
      y: -90 - i * 84 - Math.random() * 80,
      targetY: 548,
      velocityY: 270 + Math.random() * 110,
      ageMs: 0,
      durationMs: 5200
    });
  }
  addLog(room, 'boss', 'ゴミが上から降ってくる。落下中は腕、着地後は脚で壊せ');
}

function randomTrashVariant() {
  return Math.floor(Math.random() * 8);
}

function updateHazardsAndPickups(room: SimRoom, dtMs: number) {
  const dt = dtMs / 1000;
  const remainingHazards: RoomState['hazards'] = [];
  for (const hazard of room.hazards) {
    hazard.ageMs += dtMs;

    if (hazard.kind === 'airTrash') {
      hazard.y += hazard.velocityY * dt;
    }

    const destroyer = findHazardDestroyer(room, hazard);
    if (destroyer) {
      awardSave(room, destroyer);
      maybeSpawnPickup(room, hazard.x, hazard.y);
      addLog(room, 'system', hazard.kind === 'airTrash' ? '腕で空中ゴミを粉砕' : '脚で足元ゴミを蹴り飛ばした');
      continue;
    }

    if (hazard.kind === 'airTrash') {
      if (fallingTrashHitsRobot(room, hazard)) {
        room.robot.fallGauge += 14;
        room.robot.angularVelocity += hazard.x < room.robot.x ? 0.82 : -0.82;
        damageRobot(room, 11, '上からゴミが直撃');
        continue;
      }
      if (hazard.y >= hazard.targetY) {
        hazard.kind = 'floorTrash';
        hazard.y = hazard.targetY;
        hazard.velocityY = 0;
        hazard.ageMs = 0;
        hazard.durationMs = 2800;
      }
    } else {
      if (hazard.ageMs > 380 && Math.abs(hazard.x - room.robot.x) < 76 && room.robot.downMs <= 0) {
        room.robot.fallGauge += 16;
        room.robot.angularVelocity += hazard.x < room.robot.x ? 0.68 : -0.68;
        damageRobot(room, 9, '足元ゴミにつまずいた');
        continue;
      }
      if (hazard.ageMs >= hazard.durationMs) {
        continue;
      }
    }

    if (hazard.ageMs < hazard.durationMs) {
      remainingHazards.push(hazard);
    }
  }
  room.hazards = remainingHazards;

  const remainingPickups: RoomState['pickups'] = [];
  for (const pickup of room.pickups) {
    pickup.ageMs += dtMs;

    if (pickup.collecting) {
      pickup.collectAgeMs += dtMs;
      if (pickup.collectAgeMs >= pickup.collectDurationMs) {
        room.robot.hp = Math.min(room.robot.maxHp, room.robot.hp + 8);
        room.robot.fallGauge = Math.max(0, room.robot.fallGauge - 12);
        addLog(room, 'system', 'ハート回収。少し立て直した');
        continue;
      }
      remainingPickups.push(pickup);
      continue;
    }

    if (pickupTouchesRobot(room, pickup)) {
      pickup.collecting = true;
      pickup.collectAgeMs = 0;
      pickup.collectDurationMs = 620;
      remainingPickups.push(pickup);
      continue;
    }

    if (pickup.ageMs < pickup.durationMs) {
      remainingPickups.push(pickup);
    }
  }
  room.pickups = remainingPickups;
}

function fallingTrashHitsRobot(room: SimRoom, hazard: RoomState['hazards'][number]) {
  const robot = room.robot;
  if (robot.downMs > 0) {
    return false;
  }
  const bodyCenterY = 380 + robot.y;
  return Math.abs(hazard.x - robot.x) < 82 && Math.abs(hazard.y - bodyCenterY) < 132;
}

function pickupTouchesRobot(room: SimRoom, pickup: RoomState['pickups'][number]) {
  const robot = room.robot;
  if (robot.downMs > 0) {
    return false;
  }
  return Math.abs(pickup.x - robot.x) < 96 && pickup.y > 300 + robot.y && pickup.y < 592 + robot.y;
}

function findHazardDestroyer(room: SimRoom, hazard: RoomState['hazards'][number]): PartKey | undefined {
  const parts = room.robot.parts;
  const distance = Math.abs(hazard.x - room.robot.x);
  const reachable =
    hazard.kind === 'airTrash'
      ? hazard.y > 120 && hazard.y < 520 && distance <= 165
      : hazard.y >= 520 && distance <= 140;
  if (!reachable) {
    return undefined;
  }
  const candidates: PartKey[] = hazard.kind === 'airTrash' ? ['leftArm', 'rightArm'] : ['leftLeg', 'rightLeg'];
  return candidates.find((partKey) => {
    const part = parts[partKey];
    return (part.action === 'attack' || part.action === 'spinAttack') && part.releaseAttackMs > 0 && part.impactReady;
  });
}

function maybeSpawnPickup(room: SimRoom, x: number, y: number) {
  if (Math.random() > 0.35) return;
  room.pickups.push({
    id: `pickup-${room.hazardSeq++}`,
    kind: 'heart',
    x: clamp(x, 210, 660),
    y: clamp(y, 320, 548),
    ageMs: 0,
    durationMs: 4200,
    collecting: false,
    collectAgeMs: 0,
    collectDurationMs: 620
  });
}

function applyPlayerDamage(room: SimRoom, damageScale = 1) {
  const robot = room.robot;
  if (robot.downMs > 0) {
    return;
  }

  let damage = 0;
  let attempted = false;
  let attackCount = 0;
  let recoil = 0;
  const distance = getBossDistance(room);
  const maxRange = robot.airborne ? GAME_CONFIG.playerAttackMaxRange - 70 : GAME_CONFIG.playerAttackMaxRange;
  const rangeMultiplier =
    distance < GAME_CONFIG.playerAttackCloseRange
      ? 1
      : distance < maxRange
        ? 0.55
        : 0;

  for (const arm of ['leftArm', 'rightArm'] as PartKey[]) {
    const part = robot.parts[arm];
    if ((part.action === 'attack' || part.action === 'spinAttack') && part.releaseAttackMs > 0 && part.impactReady && !part.hitApplied) {
      attempted = true;
      part.hitApplied = true;
      attackCount += 1;
      const spinMultiplier = part.action === 'spinAttack' ? GAME_CONFIG.armSpinDamageMultiplier * part.power : 1;
      const partDamage = Math.round(GAME_CONFIG.punchDamage * spinMultiplier * rangeMultiplier * damageScale);
      damage += partDamage;
      awardDamage(room, arm, partDamage);
      recoil += part.action === 'spinAttack' ? 3.2 : 1.4;
      robot.angularVelocity += (arm === 'leftArm' ? -0.18 : 0.18) * spinMultiplier;
    }
  }

  for (const leg of ['leftLeg', 'rightLeg'] as PartKey[]) {
    const part = robot.parts[leg];
    if ((part.action === 'attack' || part.action === 'spinAttack') && part.releaseAttackMs > 0 && part.impactReady && !part.hitApplied) {
      attempted = true;
      part.hitApplied = true;
      attackCount += 1;
      const spinMultiplier = part.action === 'spinAttack' ? GAME_CONFIG.legSpinDamageMultiplier * part.power : 1;
      const airMultiplier = robot.airborne ? GAME_CONFIG.airAttackDamageMultiplier : 1;
      const partDamage = Math.round(GAME_CONFIG.kickDamage * spinMultiplier * airMultiplier * rangeMultiplier * damageScale);
      damage += partDamage;
      awardDamage(room, leg, partDamage);
      recoil += part.action === 'spinAttack' ? 5.2 : 2.6;
      robot.angularVelocity += (leg === 'leftLeg' ? -0.48 : 0.48) * spinMultiplier;
      robot.velocityX -= 18;
    }
  }

  if (damage > 0 && attackCount >= 2) {
    damage = Math.round(damage * (attackCount >= 4 ? 1.45 : 1.22));
  }
  if (damage > 0 && connectedPlayerCount(room) === 1) {
    damage = Math.round(damage * 0.68);
  }

  if (damage > 0) {
    room.boss.hp = Math.max(0, room.boss.hp - damage);
    const prefix = attackCount >= 2 ? '同時攻撃ボーナス。' : robot.airborne ? '空中ヒット。' : '';
    const message =
      damageScale < 1
        ? `${prefix}装甲越しに ${damage} ダメージ`
        : rangeMultiplier >= 1
          ? `${prefix}弱点に ${damage} ダメージ`
          : `${prefix}攻撃がかすった。${damage} ダメージ`;
    addLog(room, 'damage', message);
    robot.fallGauge += recoil + (damageScale < 1 ? attackCount * 2.4 : attackCount * 0.8);
  } else if (attempted) {
    robot.fallGauge += 7 + recoil * 0.7;
    addLog(room, 'damage', robot.airborne ? '空中攻撃が空振り。着地が怖い' : '間合いが遠い。攻撃が届かず、姿勢だけ崩れた');
  }
}

function applyMovementAndBalance(room: SimRoom, dt: number) {
  const robot = room.robot;
  const parts = robot.parts;
  const controls = collectPartControls(room.inputs);
  const commonControls = collectGlobalControls(room.inputs);

  if (robot.downMs > 0) {
    robot.velocityX *= 0.86;
    robot.angularVelocity *= 0.82;
    robot.bodyAngle += (0 - robot.bodyAngle) * 0.08;
    robot.verticalVelocity = 0;
    robot.airborne = false;
    robot.y += (22 - robot.y) * 0.2;
    robot.x = clamp(robot.x + robot.velocityX * dt, 170, 640);
    return;
  }

  const leftBrace = parts.leftLeg.action === 'brace';
  const rightBrace = parts.rightLeg.action === 'brace';
  const leftLift = parts.leftLeg.action === 'lift';
  const rightLift = parts.rightLeg.action === 'lift';
  const leftAttack = parts.leftLeg.action === 'attack' || parts.leftLeg.action === 'spinAttack';
  const rightAttack = parts.rightLeg.action === 'attack' || parts.rightLeg.action === 'spinAttack';
  const leftGuard = parts.leftArm.action === 'guard';
  const rightGuard = parts.rightArm.action === 'guard';
  const jumpCount = leftLift && rightLift ? 2 : 0;
  const leanLeft = commonControls.left;
  const leanRight = commonControls.right;

  if (jumpCount > 0 && !robot.airborne && robot.jumpCooldownMs <= 0) {
    robot.airborne = true;
    robot.jumpCooldownMs = GAME_CONFIG.jumpCooldownMs;
    robot.verticalVelocity = -(GAME_CONFIG.jumpVelocity + (jumpCount - 1) * 90);
    robot.velocityX += clamp(robot.bodyAngle * 7.2, -260, 260);
    robot.fallGauge += jumpCount === 2 ? 4 : 13;
    robot.angularVelocity += Math.abs(robot.bodyAngle) > 18 ? Math.sign(robot.bodyAngle) * 0.2 : 0;
    addLog(room, 'system', Math.abs(robot.bodyAngle) > 10 ? '傾いたままジャンプ。飛ぶ方向も流れた' : '両足Wでジャンプ。空中攻撃のチャンス');
  }

  if (robot.airborne) {
    robot.verticalVelocity += GAME_CONFIG.gravity * dt;
    robot.y += robot.verticalVelocity * dt;
    if (leftLift || rightLift) {
      robot.velocityX += GAME_CONFIG.walkSpeed * 0.34 * dt;
    }
    if (robot.y >= 0) {
      robot.y = 0;
      robot.airborne = false;
      robot.verticalVelocity = 0;
      robot.fallGauge += 10 + Math.abs(robot.bodyAngle) * 0.12;
      robot.angularVelocity += Math.sign(robot.bodyAngle || (leftAttack ? -1 : 1)) * 0.32;
    }
  } else if (leftLift || rightLift) {
    const stepLeg: PartKey | undefined = leftLift ? 'leftLeg' : rightLift ? 'rightLeg' : undefined;
    const alternatingBonus = stepLeg && room.lastStepLeg && stepLeg !== room.lastStepLeg ? 1.45 : 1;
    robot.velocityX += GAME_CONFIG.walkSpeed * alternatingBonus * dt;
    robot.y += (-16 - robot.y) * 0.28;
    if (stepLeg) {
      room.lastStepLeg = stepLeg;
    }
  } else {
    robot.y += (0 - robot.y) * 0.16;
  }

  if (leftAttack || rightAttack) {
    const spinBonus = Number(parts.leftLeg.action === 'spinAttack') + Number(parts.rightLeg.action === 'spinAttack');
    robot.velocityX += (26 + spinBonus * 18) * dt;
    robot.angularVelocity += (leftAttack === rightAttack ? 0 : leftAttack ? -0.3 : 0.3) + spinBonus * 0.08;
  }
  if (leftBrace && rightBrace) {
    robot.velocityX *= 0.72;
  }
  if (leftBrace !== rightBrace) {
    robot.angularVelocity += leftBrace ? -0.34 : 0.34;
  }
  if (leftLift !== rightLift && !robot.airborne) {
    robot.angularVelocity += leftLift ? -0.18 : 0.18;
  }
  if (leftGuard || rightGuard) {
    robot.angularVelocity -= Math.sign(robot.bodyAngle) * GAME_CONFIG.armBalancePower * 1.35 * dt;
  }
  if (leanLeft !== leanRight) {
    robot.angularVelocity += leanLeft ? -0.42 : 0.42;
  }
  const limbTorque =
    (parts.rightArm.angle * 0.0012 +
      parts.rightLeg.angle * 0.0016 -
      parts.leftArm.angle * 0.0012 -
      parts.leftLeg.angle * 0.0016) *
    (robot.airborne ? 1.45 : 1);
  robot.angularVelocity += clamp(limbTorque, -0.42, 0.42);
  const faceTarget = leanLeft !== leanRight ? (leanLeft ? -28 : 28) : clamp(-robot.bodyAngle * 0.35, -18, 18);
  robot.faceAngle += (faceTarget - robot.faceAngle) * 0.32;

  robot.angularVelocity -= robot.bodyAngle * 0.026 * dt;
  robot.angularVelocity *= 0.93;
  robot.bodyAngle += robot.angularVelocity;
  robot.balance = clamp(robot.bodyAngle / GAME_CONFIG.criticalAngleDeg, -1, 1);
  robot.velocityX *= 0.91;
  robot.x = clamp(robot.x + robot.velocityX * dt, 170, 640);

  if (Math.abs(robot.bodyAngle) > GAME_CONFIG.dangerAngleDeg) {
    robot.fallGauge += (Math.abs(robot.bodyAngle) - GAME_CONFIG.dangerAngleDeg) * 0.035;
  } else {
    robot.fallGauge = Math.max(0, robot.fallGauge - GAME_CONFIG.balanceRecoveryRate * 125 * dt);
  }
  robot.fallGauge = clamp(robot.fallGauge, 0, GAME_CONFIG.fallGaugeMax);
}

function checkDownState(room: SimRoom) {
  const robot = room.robot;
  if (robot.downMs > 0) {
    return;
  }

  if (robot.fallGauge >= GAME_CONFIG.fallGaugeMax || Math.abs(robot.bodyAngle) > 58) {
    robot.downMs = GAME_CONFIG.robotDownMs;
    robot.fallGauge = 35;
    robot.angularVelocity = 0;
    robot.bodyAngle = robot.bodyAngle > 0 ? 44 : -44;
    damageRobot(room, 10, '転倒。少しの間、攻撃に対して無防備');
    awardFall(room);
  }
}

function checkWarnings(room: SimRoom) {
  const angle = Math.abs(room.robot.bodyAngle);
  const level =
    angle > GAME_CONFIG.criticalAngleDeg
      ? 3
      : angle > GAME_CONFIG.dangerAngleDeg
        ? 2
        : angle > GAME_CONFIG.warningAngleDeg
          ? 1
          : 0;

  if (level > room.lastWarningLevel) {
    addLog(room, 'warning', `胴体角度 ${Math.round(angle)} 度。転ぶと無防備になる`);
  }
  room.lastWarningLevel = level;
}

function checkEnd(room: SimRoom, elapsedMs: number) {
  if (room.phase !== 'playing') {
    return;
  }

  if (room.boss.hp <= 0) {
    room.boss.hp = 0;
    room.boss.phase = 'defeated';
    room.phase = 'finished';
    room.result = 'victory';
    room.finishedAt = Date.now();
    addLog(room, 'goal', '暴走掃除機、紙パックから夢をこぼして沈黙');
    return;
  }

  if (room.robot.hp <= 0) {
    room.robot.hp = 0;
    room.phase = 'finished';
    room.result = 'defeat';
    room.finishedAt = Date.now();
    addLog(room, 'fall', 'ロボHPが尽きた。段ボールはよく頑張った');
    return;
  }

  if (elapsedMs >= GAME_CONFIG.gameDurationMs) {
    room.phase = 'finished';
    room.result = 'timeout';
    room.finishedAt = Date.now();
    addLog(room, 'fall', '時間切れ。掃除機はまだ元気で、ロボはだいぶボロい');
  }
}

function damageRobot(room: SimRoom, amount: number, message: string) {
  const damage = Math.max(0, Math.round(amount));
  if (damage <= 0) {
    return;
  }
  room.robot.hp = Math.max(0, room.robot.hp - damage);
  room.robot.damageFlashMs = 360;
  addLog(room, 'warning', `${message} (-${damage} HP)`);
}

function bossMoveStartText(move: BossMove) {
  switch (move) {
    case 'suck':
      return '暴走掃除機が吸い込み準備。足、踏ん張れ';
    case 'charge':
      return '暴走掃除機が後ろに下がった。歩いて避けろ';
    case 'trashShot':
      return 'ゴミ噴射準備。上は腕、足元は脚で壊せ';
    case 'weakPoint':
      return '紙パックがなぜか開いた。近づいて攻撃';
  }
}

function attackDuration(move?: BossMove) {
  switch (move) {
    case 'suck':
      return 1650;
    case 'charge':
      return 1050;
    case 'trashShot':
      return 1350;
    default:
      return 800;
  }
}

function getBossDistance(room: SimRoom) {
  return Math.abs(room.boss.positionX - room.robot.x);
}

function connectedPlayerCount(room: SimRoom) {
  return Object.values(room.players).filter((player) => player.connected).length;
}

function ensureScores(room: SimRoom) {
  room.scores ??= {};
  for (const player of Object.values(room.players)) {
    if (!room.scores[player.id]) {
      room.scores[player.id] = createScore(player.id, player.name, player.role);
    } else {
      room.scores[player.id].name = player.name;
      room.scores[player.id].role = player.role;
    }
  }
}

function createScore(playerId: string, name: string, role: RobotRole): PlayerScore {
  return {
    playerId,
    name,
    role,
    damageDealt: 0,
    guardSaves: 0,
    falls: 0,
    score: 0
  };
}

function playersForPart(room: SimRoom, part: PartKey) {
  return Object.values(room.players).filter((player) => player.connected && partsForRole(player.role).includes(part));
}

function awardDamage(room: SimRoom, part: PartKey, amount: number) {
  if (amount <= 0) return;
  ensureScores(room);
  const owners = playersForPart(room, part);
  const share = owners.length > 0 ? amount / owners.length : 0;
  for (const owner of owners) {
    room.scores![owner.id].damageDealt += share;
  }
}

function awardSave(room: SimRoom, part: PartKey) {
  ensureScores(room);
  for (const owner of playersForPart(room, part)) {
    room.scores![owner.id].guardSaves += 1;
  }
}

function awardFall(room: SimRoom) {
  ensureScores(room);
  for (const score of Object.values(room.scores!)) {
    score.falls += 1;
  }
}

function normalizeState(room: SimRoom) {
  const robot = room.robot;
  const boss = room.boss;
  robot.hp = finiteClamp(robot.hp, 0, robot.maxHp);
  robot.x = finiteClamp(robot.x, 170, 640);
  robot.y = finiteClamp(robot.y, -260, 80);
  robot.velocityX = finiteOrZero(robot.velocityX);
  robot.bodyAngle = finiteClamp(robot.bodyAngle, -70, 70);
  robot.faceAngle = finiteClamp(robot.faceAngle, -45, 45);
  robot.angularVelocity = finiteClamp(robot.angularVelocity, -8, 8);
  robot.fallGauge = finiteClamp(robot.fallGauge, 0, GAME_CONFIG.fallGaugeMax);
  robot.downMs = finiteClamp(robot.downMs, 0, GAME_CONFIG.robotDownMs);
  robot.damageFlashMs = finiteClamp(robot.damageFlashMs, 0, 1000);
  robot.verticalVelocity = finiteClamp(robot.verticalVelocity, -900, 900);
  robot.jumpCooldownMs = finiteClamp(robot.jumpCooldownMs, 0, GAME_CONFIG.jumpCooldownMs);
  boss.hp = finiteClamp(boss.hp, 0, boss.maxHp);
  boss.phaseTimeMs = finiteClamp(boss.phaseTimeMs, 0, 10_000);
  boss.positionX = finiteClamp(boss.positionX, GAME_CONFIG.bossMinX, GAME_CONFIG.bossMaxX);
  room.hazards ??= [];
  room.pickups ??= [];
  for (const hazard of room.hazards) {
    hazard.variant = finiteClamp(hazard.variant, 0, 7);
    hazard.x = finiteClamp(hazard.x, 120, 760);
    hazard.y = finiteClamp(hazard.y, -420, 620);
    hazard.targetY = finiteClamp(hazard.targetY, 320, 580);
    hazard.velocityY = finiteClamp(hazard.velocityY, 0, 520);
    hazard.ageMs = finiteClamp(hazard.ageMs, 0, 10_000);
    hazard.durationMs = finiteClamp(hazard.durationMs, 500, 8000);
  }
  for (const pickup of room.pickups) {
    pickup.x = finiteClamp(pickup.x, 120, 760);
    pickup.y = finiteClamp(pickup.y, 280, 580);
    pickup.ageMs = finiteClamp(pickup.ageMs, 0, 10_000);
    pickup.durationMs = finiteClamp(pickup.durationMs, 500, 8000);
    pickup.collecting = Boolean(pickup.collecting);
    pickup.collectAgeMs = finiteClamp(pickup.collectAgeMs, 0, 2000);
    pickup.collectDurationMs = finiteClamp(pickup.collectDurationMs, 200, 2000);
  }
}

function finiteOrZero(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function finiteClamp(value: number, min: number, max: number) {
  return clamp(finiteOrZero(value), min, max);
}

function easeAngle(current: number, target: number, ratio: number) {
  return normalizeAngle(current + (target - current) * ratio);
}

function stepSpinTowardImpact(part: RobotState['parts'][PartKey], key: PartKey, dt: number) {
  const previous = part.angle;
  const next = normalizeAngle(previous + part.spinVelocity * dt);
  const target = attackFrontAngle(key);
  if (crossedAngle(previous, next, target, Math.sign(part.spinVelocity || part.spinDirection || 1))) {
    part.impactReady = true;
    part.spinVelocity *= 0.62;
    return target;
  }
  return next;
}

function attackFrontAngle(_key: PartKey) {
  return -90;
}

function crossedAngle(previous: number, next: number, target: number, direction: number) {
  const prev = normalizePositive(previous);
  const curr = normalizePositive(next);
  const goal = normalizePositive(target);
  if (direction >= 0) {
    const travel = (curr - prev + 360) % 360;
    const toGoal = (goal - prev + 360) % 360;
    return travel > 0 && toGoal <= travel;
  }
  const travel = (prev - curr + 360) % 360;
  const toGoal = (prev - goal + 360) % 360;
  return travel > 0 && toGoal <= travel;
}

function normalizeAngle(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  let angle = value % 720;
  if (angle > 360) angle -= 720;
  if (angle < -360) angle += 720;
  return angle;
}

function normalizePositive(value: number) {
  const angle = value % 360;
  return angle < 0 ? angle + 360 : angle;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
