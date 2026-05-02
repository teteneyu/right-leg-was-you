import { GAME_CONFIG, type BossMove, type GameLogEntry, type PartKey, type PublicGameState, type RobotRole } from '@right-leg/shared';
import { getGameImages, type GameImages } from './assets.js';

type DrawOptions = {
  width: number;
  height: number;
  deviceRatio: number;
  roleLabel: string;
  role: RobotRole;
  moveLabel: string;
  logs: GameLogEntry[];
};

type Prompt = {
  title: string;
  instruction: string;
  keys: string;
  color: string;
};

type PartVisual = {
  offsetX: number;
  offsetY: number;
  stretchY: number;
  skewX: number;
};

type SuctionVisual = {
  mouthX: number;
  mouthY: number;
  strength: number;
};

const bossFrameCrops = [
  { x: 8, y: 250, w: 344, h: 238 },
  { x: 52, y: 250, w: 292, h: 238 },
  { x: 4, y: 230, w: 334, h: 260 },
  { x: 26, y: 250, w: 284, h: 240 },
  { x: 8, y: 64, w: 352, h: 238 },
  { x: 82, y: 74, w: 278, h: 232 },
  { x: 14, y: 52, w: 330, h: 254 },
  { x: 32, y: 68, w: 284, h: 238 }
] as const;

export function drawGame(ctx: CanvasRenderingContext2D, state: PublicGameState, options: DrawOptions) {
  const images = getGameImages();
  const { width, height } = options;
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.scale(width / 1280, height / 720);
  drawRoom(ctx, images);
  drawRangeHints(ctx, state);
  drawBoss(ctx, state, images);
  drawRobot(ctx, state, images, options);
  drawHazardsAndPickups(ctx, state, images);
  drawRobotDamageFlash(ctx, state);
  drawHud(ctx, state, options);
  drawCommandBanner(ctx, state, options);
  drawLog(ctx, options.logs);
  ctx.restore();
}

function drawRoom(ctx: CanvasRenderingContext2D, images: GameImages) {
  if (isReady(images.background)) {
    ctx.drawImage(images.background, 0, 0, 1280, 720);
    ctx.fillStyle = 'rgba(255, 247, 225, 0.12)';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = 'rgba(58, 35, 18, 0.12)';
    ctx.fillRect(0, 555, 1280, 165);
    return;
  }

  ctx.fillStyle = '#c7a77b';
  ctx.fillRect(0, 0, 1280, 720);

  ctx.fillStyle = '#d8bf95';
  ctx.fillRect(0, 0, 1280, 555);
  ctx.fillStyle = '#b89160';
  ctx.fillRect(0, 400, 1280, 22);
  ctx.fillStyle = '#f0e2c2';
  roundedRect(ctx, 72, 76, 220, 150, 10);
  ctx.fill();
  ctx.strokeStyle = '#6f4d31';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.strokeStyle = '#6f4d31';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(182, 80);
  ctx.lineTo(182, 222);
  ctx.moveTo(76, 151);
  ctx.lineTo(288, 151);
  ctx.stroke();
  ctx.fillStyle = '#8b633d';
  roundedRect(ctx, 860, 118, 270, 20, 6);
  ctx.fill();
  roundedRect(ctx, 900, 246, 240, 20, 6);
  ctx.fill();
  ctx.fillStyle = '#d84632';
  roundedRect(ctx, 912, 86, 34, 32, 5);
  ctx.fill();
  ctx.fillStyle = '#2d6aa2';
  roundedRect(ctx, 982, 84, 44, 34, 5);
  ctx.fill();
  ctx.fillStyle = '#61a35f';
  roundedRect(ctx, 1038, 213, 40, 32, 5);
  ctx.fill();

  ctx.strokeStyle = 'rgba(82, 51, 25, 0.16)';
  for (let x = 0; x < 1280; x += 96) {
    for (let y = 0; y < 720; y += 72) {
      ctx.strokeRect(x, y, 96, 72);
    }
  }

  ctx.fillStyle = '#8c663f';
  ctx.fillRect(0, 555, 1280, 165);
  ctx.fillStyle = '#a96f4d';
  ctx.beginPath();
  ctx.ellipse(500, 612, 360, 44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b98f5f';
  for (let x = -40; x < 1320; x += 120) {
    ctx.fillRect(x, 565, 94, 16);
    ctx.fillRect(x + 48, 630, 94, 16);
  }

  label(ctx, 244, 112, 160, 82, '協力が\nカギ!', '#d3b891', 25);
  drawTape(ctx, 220, 93, 60, -8, '#346ca8');
  drawTape(ctx, 690, 124, 60, 7, '#d44836');
}

function drawHud(ctx: CanvasRenderingContext2D, state: PublicGameState, options: DrawOptions) {
  panel(ctx, 24, 20, 160, 62, '#f4eee2');
  ctx.fillStyle = '#5c3d25';
  ctx.font = '900 16px sans-serif';
  ctx.fillText('TIME', 44, 43);
  ctx.fillStyle = '#1e1a16';
  ctx.font = '900 30px sans-serif';
  ctx.fillText(formatTime(state.timeRemainingMs), 42, 72);

  panel(ctx, 214, 18, 650, 66, '#dec293');
  ctx.fillStyle = '#1e1a16';
  ctx.font = '900 24px sans-serif';
  ctx.fillText('BOSS', 238, 58);
  hpBar(ctx, 330, 38, 420, 26, state.boss.hp / state.boss.maxHp, '#d83d31');
  ctx.font = '900 18px sans-serif';
  ctx.fillText(`${Math.ceil(state.boss.hp)} / ${state.boss.maxHp}`, 762, 58);

  panel(ctx, 890, 18, 334, 66, '#f1efe7');
  ctx.fillStyle = '#1e1a16';
  ctx.font = '900 22px sans-serif';
  ctx.fillText('ROBO', 914, 57);
  hpBar(ctx, 990, 38, 142, 26, state.robot.hp / state.robot.maxHp, state.robot.hp < 30 ? '#d83d31' : '#4e9b58');
  ctx.font = '900 18px sans-serif';
  ctx.fillText(`${Math.ceil(state.robot.hp)} / ${state.robot.maxHp}`, 1144, 57);

  label(ctx, 34, 604, 300, 82, `${options.roleLabel}\nWASD + Space`, '#f1efe7', 22);
  label(ctx, 364, 604, 272, 82, `ダウン\n${Math.round(state.robot.fallGauge)} / 100`, '#dec293', 23);
  gauge(ctx, 472, 654, 132, state.robot.fallGauge / 100);
  label(ctx, 668, 604, 304, 82, `傾き / 顔\n${Math.round(state.robot.bodyAngle)}°`, '#dec293', 23);
  tiltMeter(ctx, 786, 654, 156, state.robot.bodyAngle);

  if (state.robot.downMs > 0) {
    label(ctx, 506, 304, 292, 82, `ダウン中\nSpace連打!`, '#e05b43', 28);
  }
}

function drawCommandBanner(ctx: CanvasRenderingContext2D, state: PublicGameState, options: DrawOptions) {
  const prompt = getPrompt(state, options.roleLabel);
  const isDanger = state.boss.phase === 'tell' || state.boss.phase === 'attack';
  const pulse = isDanger ? 1 + Math.sin(Date.now() / 110) * 0.03 : 1;
  const w = 445 * pulse;
  const h = 126 * pulse;
  const x = 420 - (w - 445) / 2;
  const y = 132 - (h - 126) / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(45, 33, 24, 0.35)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  panel(ctx, x, y, w, h, prompt.color);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#211a15';
  ctx.font = '900 36px sans-serif';
  ctx.fillText(prompt.title, x + 24, y + 44);
  ctx.font = '900 24px sans-serif';
  ctx.fillText(prompt.instruction, x + 24, y + 80);
  ctx.fillStyle = '#fff7e6';
  roundedRect(ctx, x + 24, y + 94, w - 48, 24, 8);
  ctx.fill();
  ctx.fillStyle = '#211a15';
  ctx.font = '900 18px sans-serif';
  ctx.fillText(prompt.keys, x + 38, y + 113);
  ctx.restore();
}

function getPrompt(state: PublicGameState, roleLabel: string): Prompt {
  const move = state.boss.currentMove;
  const isFoot = roleLabel.includes('足') || roleLabel.includes('半身') || roleLabel.includes('全');
  const isArm = roleLabel.includes('腕') || roleLabel.includes('半身') || roleLabel.includes('全');

  if (state.robot.downMs > 0) {
    return {
      title: '倒れてる!',
      instruction: 'Spaceを離して押し直す',
      keys: '連打で早く起きる。長押しは効かない',
      color: '#e05b43'
    };
  }

  if (state.phase === 'finished') {
    return {
      title: state.result === 'victory' ? '勝利!' : '敗北!',
      instruction: '事故ログを見て、すぐ再戦',
      keys: '「もう一回」でリトライ',
      color: state.result === 'victory' ? '#83bf5a' : '#e05b43'
    };
  }

  if (state.boss.phase === 'vulnerable') {
    return {
      title: '弱点むき出し!',
      instruction: isFoot ? '短押し突き / 長押し回転キック' : '短押し突き / 長押し回転パンチ',
      keys: '離すと前方で1回だけ当たる。両足がWでジャンプ回避',
      color: '#83bf5a'
    };
  }

  if (move === 'suck') {
    return {
      title: '吸い込み!',
      instruction: isFoot ? 'Sで踏ん張る' : 'Sで支える',
      keys: '両足が踏ん張ると耐えられる',
      color: '#e4cc54'
    };
  }

  if (move === 'charge') {
    return {
      title: '突進くる!',
      instruction: isFoot ? 'Wでジャンプ' : 'A/Dで傾きを戻す',
      keys: '両足がWでジャンプ回避',
      color: '#e4cc54'
    };
  }

  if (move === 'trashShot') {
    return {
      title: 'ゴミが来る!',
      instruction: isArm ? '上のゴミは腕で殴る' : '足元ゴミは脚で蹴る',
      keys: '壊すとたまにハートが出る',
      color: '#e4cc54'
    };
  }

  return {
    title: '次の予兆を見ろ!',
    instruction: 'W移動 S防御 A/D傾き Space攻撃',
    keys: 'Space短押し=突き、長押し=回転',
    color: '#f1efe7'
  };
}

function drawRobot(ctx: CanvasRenderingContext2D, state: PublicGameState, images: GameImages, options: DrawOptions) {
  const robot = state.robot;
  const x = robot.x;
  const y = 432 + robot.y;
  const controlled = new Set(partsForRole(options.role));
  const suction = getSuctionVisual(state, y);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(((robot.downMs > 0 ? robot.bodyAngle * 1.35 : robot.bodyAngle) * Math.PI) / 180);

  drawRobotPart(
    ctx,
    images.leftArm,
    104,
    -72,
    82,
    150,
    30 + robot.parts.rightArm.angle,
    controlled.has('rightArm'),
    partSuctionVisual(suction, x + 104, y - 72)
  );
  drawRobotPart(
    ctx,
    images.leftLeg,
    56,
    60,
    74,
    134,
    14 + robot.parts.rightLeg.angle,
    controlled.has('rightLeg'),
    partSuctionVisual(suction, x + 56, y + 60)
  );

  if (isReady(images.body)) {
    ctx.drawImage(images.body, -86, -142, 172, 172);
  } else {
    cardboardBox(ctx, -78, -126, 156, 156);
  }

  drawRobotFace(ctx, images, robot.faceAngle ?? 0, options.role !== 'spectator');

  drawRobotPart(
    ctx,
    images.rightArm,
    -104,
    -72,
    82,
    150,
    -30 + robot.parts.leftArm.angle,
    controlled.has('leftArm'),
    partSuctionVisual(suction, x - 104, y - 72)
  );
  drawRobotPart(
    ctx,
    images.rightLeg,
    -44,
    60,
    74,
    134,
    -14 + robot.parts.leftLeg.angle,
    controlled.has('leftLeg'),
    partSuctionVisual(suction, x - 44, y + 60)
  );
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, 630, 118, 16, 0, 0, Math.PI * 2);
  ctx.fill();
}

function getSuctionVisual(state: PublicGameState, robotY: number): SuctionVisual | undefined {
  if (state.boss.currentMove !== 'suck' || (state.boss.phase !== 'tell' && state.boss.phase !== 'attack')) {
    return undefined;
  }
  const distance = Math.abs(state.boss.positionX - state.robot.x);
  const rangeStrength = clamp(1 - distance / GAME_CONFIG.bossSuckRange, 0, 1);
  const phaseStrength = state.boss.phase === 'attack' ? 1 : 0.42;
  const pulse = 0.88 + Math.sin(Date.now() / 95) * 0.12;
  const strength = rangeStrength * phaseStrength * pulse;
  if (strength <= 0.03) {
    return undefined;
  }
  return {
    mouthX: state.boss.positionX - 124,
    mouthY: 508,
    strength: clamp(strength + Math.max(0, robotY - 432) * 0.001, 0, 1)
  };
}

function partSuctionVisual(suction: SuctionVisual | undefined, worldX: number, worldY: number): PartVisual | undefined {
  if (!suction) return undefined;
  const dx = suction.mouthX - worldX;
  const dy = suction.mouthY - worldY;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const localStrength = clamp(suction.strength * (1 - distance / 760), 0, 1);
  if (localStrength <= 0.02) return undefined;
  return {
    offsetX: (dx / distance) * 14 * localStrength,
    offsetY: (dy / distance) * 9 * localStrength,
    stretchY: 1 + localStrength * 0.18,
    skewX: (dx / distance) * localStrength * 0.18
  };
}

function drawRobotFace(ctx: CanvasRenderingContext2D, images: GameImages, angle: number, highlighted: boolean) {
  ctx.save();
  ctx.translate(0, -140);
  ctx.fillStyle = '#4b321f';
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  if (highlighted || Math.abs(angle) > 3) {
    ctx.save();
    ctx.strokeStyle = 'rgba(28, 118, 255, 0.7)';
    ctx.lineWidth = 5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, 64, Math.PI * 1.06, Math.PI * 1.94);
    ctx.stroke();
    ctx.restore();
  }
  ctx.rotate((angle * Math.PI) / 180);
  if (isReady(images.face)) {
    ctx.drawImage(images.face, -62, -92, 124, 104);
  } else {
    cardboardBox(ctx, -54, -76, 108, 74);
  }
  ctx.restore();
}

function drawRobotDamageFlash(ctx: CanvasRenderingContext2D, state: PublicGameState) {
  if (state.robot.damageFlashMs <= 0) return;
  const alpha = Math.min(0.28, state.robot.damageFlashMs / 1300);
  ctx.save();
  ctx.fillStyle = `rgba(216, 61, 49, ${alpha})`;
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = `rgba(216, 61, 49, ${Math.min(0.55, alpha * 2)})`;
  ctx.beginPath();
  ctx.ellipse(state.robot.x, 468 + state.robot.y, 170, 230, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff7e6';
  ctx.strokeStyle = '#942b21';
  ctx.lineWidth = 6;
  ctx.font = '900 36px sans-serif';
  ctx.strokeText('HIT!', state.robot.x - 42, 250 + state.robot.y);
  ctx.fillText('HIT!', state.robot.x - 42, 250 + state.robot.y);
  ctx.restore();
}

function drawRobotPart(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  angleDeg: number,
  highlighted: boolean,
  visual?: PartVisual
) {
  ctx.save();
  ctx.translate(x + (visual?.offsetX ?? 0), y + (visual?.offsetY ?? 0));
  ctx.rotate((angleDeg * Math.PI) / 180);
  if (visual) {
    ctx.transform(1, 0, visual.skewX, visual.stretchY, 0, 0);
  }
  if (highlighted) {
    ctx.save();
    ctx.shadowColor = 'rgba(28, 118, 255, 0.85)';
    ctx.shadowBlur = 22;
    ctx.strokeStyle = '#1c76ff';
    ctx.lineWidth = 9;
    ctx.setLineDash([14, 8]);
    roundedRect(ctx, -w / 2 - 8, -8, w + 16, h + 18, 18);
    ctx.stroke();
    ctx.restore();
  }
  if (isReady(image)) {
    ctx.drawImage(image, -w / 2, 0, w, h);
  } else {
    cardboardBox(ctx, -w / 2, 0, w, h);
  }
  ctx.restore();
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

function drawBoss(ctx: CanvasRenderingContext2D, state: PublicGameState, images: GameImages) {
  const boss = state.boss;
  const x = boss.positionX + (boss.phase === 'attack' && boss.currentMove === 'charge' ? Math.sin(Date.now() / 50) * 10 : 0);
  const y = 532;

  drawBossEffects(ctx, state, x, y, images);

  if (isReady(images.vacuum)) {
    const frameW = images.vacuum.width / 4;
    const frameH = images.vacuum.height / 2;
    const frame = getBossFrame(boss.currentMove, boss.phase);
    const crop = bossFrameCrops[frame] ?? bossFrameCrops[0];
    const sx = (frame % 4) * frameW + crop.x;
    const sy = Math.floor(frame / 4) * frameH + crop.y;
    const drawW = boss.phase === 'attack' && boss.currentMove === 'charge' ? 370 : 345;
    const drawH = drawW * (crop.h / crop.w);
    const bob = boss.phase === 'idle' ? Math.sin(Date.now() / 260) * 3 : 0;
    ctx.drawImage(images.vacuum, sx, sy, crop.w, crop.h, x - drawW / 2, y + 92 - drawH + bob, drawW, drawH);
  } else {
    drawFallbackBoss(ctx, x, y, state);
  }

  if (boss.phase === 'vulnerable') {
    ctx.save();
    ctx.translate(x, y + 54);
    ctx.fillStyle = '#83bf5a';
    roundedRect(ctx, -88, -28, 176, 48, 12);
    ctx.fill();
    ctx.strokeStyle = '#211a15';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = '#211a15';
    ctx.font = '900 22px sans-serif';
    ctx.fillText('弱点! 攻撃!', -62, 3);
    ctx.restore();
  }
}

function drawRangeHints(ctx: CanvasRenderingContext2D, state: PublicGameState) {
  const boss = state.boss;
  if (boss.phase === 'vulnerable') {
    drawRangeBand(
      ctx,
      boss.positionX - GAME_CONFIG.playerAttackMaxRange,
      boss.positionX - GAME_CONFIG.playerAttackCloseRange,
      '#e4cc54',
      'かすり'
    );
    drawRangeBand(ctx, boss.positionX - GAME_CONFIG.playerAttackCloseRange, boss.positionX, '#83bf5a', '近距離ヒット');
    return;
  }

  if (boss.phase !== 'tell' && boss.phase !== 'attack') {
    return;
  }

  if (boss.currentMove === 'suck') {
    drawRangeBand(ctx, boss.positionX - GAME_CONFIG.bossSuckRange, boss.positionX, '#e4cc54', '吸い込み範囲');
  } else if (boss.currentMove === 'charge') {
    drawRangeBand(ctx, boss.positionX - GAME_CONFIG.bossChargeRange, boss.positionX, '#d83d31', '突進直撃');
  } else if (boss.currentMove === 'trashShot') {
    drawRangeBand(ctx, boss.positionX - GAME_CONFIG.bossTrashRange, boss.positionX, '#d83d31', 'ゴミ射程');
  }
}

function drawRangeBand(ctx: CanvasRenderingContext2D, startX: number, endX: number, color: string, text: string) {
  const x = clamp(startX, 130, 1100);
  const w = Math.max(8, clamp(endX, 130, 1100) - x);
  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = color;
  roundedRect(ctx, x, 560, w, 42, 12);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 7]);
  roundedRect(ctx, x, 560, w, 42, 12);
  ctx.stroke();
  ctx.fillStyle = '#241d18';
  ctx.font = '900 20px sans-serif';
  ctx.fillText(text, x + 12, 589);
  ctx.restore();
}

function drawHazardsAndPickups(ctx: CanvasRenderingContext2D, state: PublicGameState, images: GameImages) {
  for (const hazard of state.hazards) {
    const size = hazard.kind === 'airTrash' ? 54 : 62;
    const wobble = Math.sin(Date.now() / 120 + hazard.x) * 7;
    if (hazard.kind === 'airTrash') {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 248, 226, 0.68)';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(hazard.x + wobble * 0.4, Math.max(120, hazard.y - 82));
      ctx.lineTo(hazard.x + wobble, hazard.y - size * 0.7);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = 'rgba(52, 36, 24, 0.24)';
      ctx.beginPath();
      ctx.ellipse(hazard.x, 594, 54, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(hazard.x + wobble, hazard.y);
    ctx.rotate((Date.now() / 240 + hazard.x) % (Math.PI * 2));
    if (isReady(images.dust)) {
      drawDustSprite(ctx, images.dust, hazard.variant, size);
    } else {
      ctx.fillStyle = hazard.kind === 'airTrash' ? '#ead7a3' : '#8f6a4b';
      roundedRect(ctx, -size / 2, -size / 2, size, size, 8);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = hazard.kind === 'airTrash' ? '#2d6aa2' : '#d84632';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    ctx.arc(hazard.x, hazard.y, size * 0.68, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#211a15';
    ctx.font = '900 16px sans-serif';
    ctx.fillText(hazard.kind === 'airTrash' ? '腕で割る' : '脚で蹴る', hazard.x - 34, hazard.y - size * 0.8);
    ctx.restore();
  }

  for (const pickup of state.pickups) {
    const heart = heartPosition(state, pickup);
    ctx.save();
    ctx.translate(heart.x, heart.y);
    ctx.globalAlpha = heart.alpha;
    ctx.scale(heart.scale, heart.scale);
    if (isReady(images.heart)) {
      drawSheetSprite(ctx, images.heart, heartFrame(pickup), 52);
    } else {
      ctx.fillStyle = '#d84632';
      circle(ctx, -8, -4, 12);
      circle(ctx, 8, -4, 12);
      ctx.beginPath();
      ctx.moveTo(-20, 4);
      ctx.lineTo(0, 26);
      ctx.lineTo(20, 4);
      ctx.fill();
    }
    ctx.restore();
  }
}

function heartPosition(state: PublicGameState, pickup: PublicGameState['pickups'][number]) {
  if (!pickup.collecting) {
    return {
      x: pickup.x,
      y: pickup.y + Math.sin(Date.now() / 140) * 6,
      scale: 1 + Math.sin(Date.now() / 120) * 0.07,
      alpha: 1
    };
  }

  const centerX = state.robot.x;
  const centerY = 376 + state.robot.y;
  const dx = pickup.x - centerX;
  const dy = pickup.y - centerY;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const dirX = dx / distance;
  const dirY = dy / distance;
  const t = clamp(pickup.collectAgeMs / Math.max(1, pickup.collectDurationMs), 0, 1);
  const outwardX = pickup.x + dirX * 46;
  const outwardY = pickup.y + dirY * 34;

  if (t < 0.32) {
    const p = easeOutCubic(t / 0.32);
    return {
      x: pickup.x + (outwardX - pickup.x) * p,
      y: pickup.y + (outwardY - pickup.y) * p,
      scale: 1 + p * 0.35,
      alpha: 1
    };
  }

  const p = easeInCubic((t - 0.32) / 0.68);
  return {
    x: outwardX + (centerX - outwardX) * p,
    y: outwardY + (centerY - outwardY) * p,
    scale: 1.35 - p * 0.72,
    alpha: 1 - Math.max(0, t - 0.82) / 0.18
  };
}

function heartFrame(pickup: PublicGameState['pickups'][number]) {
  if (pickup.collecting) {
    return Math.min(7, Math.floor((pickup.collectAgeMs / Math.max(1, pickup.collectDurationMs)) * 8));
  }
  return Math.floor(pickup.ageMs / 90) % 8;
}

function drawDustSprite(ctx: CanvasRenderingContext2D, image: HTMLImageElement, variant: number, size: number) {
  drawSheetSprite(ctx, image, variant, size);
}

function drawSheetSprite(ctx: CanvasRenderingContext2D, image: HTMLImageElement, variant: number, size: number) {
  const columns = 4;
  const rows = 2;
  const index = Math.abs(Math.trunc(variant || 0)) % (columns * rows);
  const cellW = image.width / columns;
  const cellH = image.height / rows;
  const sx = (index % columns) * cellW;
  const sy = Math.floor(index / columns) * cellH;
  ctx.drawImage(image, sx, sy, cellW, cellH, -size / 2, -size / 2, size, size);
}

function drawBossEffects(ctx: CanvasRenderingContext2D, state: PublicGameState, x: number, y: number, images: GameImages) {
  const move = state.boss.currentMove;

  if (state.boss.phase === 'tell' || state.boss.phase === 'attack') {
    const glow = ctx.createRadialGradient(x - 18, y - 52, 20, x - 18, y - 52, 168);
    glow.addColorStop(0, 'rgba(255, 219, 119, 0.34)');
    glow.addColorStop(0.62, 'rgba(216, 61, 49, 0.14)');
    glow.addColorStop(1, 'rgba(216, 61, 49, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x - 18, y - 52, 166 + Math.sin(Date.now() / 90) * 8, 0, Math.PI * 2);
    ctx.fill();
  }

  if ((state.boss.phase === 'tell' || state.boss.phase === 'attack') && move === 'suck') {
    drawSuctionEffect(ctx, state, x, y, images);
  }

  if ((state.boss.phase === 'tell' || state.boss.phase === 'attack') && move === 'trashShot') {
    drawTrashLaunchEffect(ctx, state, x, y, images);
  }
}

function drawSuctionEffect(ctx: CanvasRenderingContext2D, state: PublicGameState, x: number, y: number, images: GameImages) {
  const mouthX = x - 124;
  const mouthY = y - 2;
  const strength = state.boss.phase === 'attack' ? 1 : 0.45;
  const time = Date.now();

  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 11; i += 1) {
    const offset = ((time / (18 + i * 2) + i * 54) % 420) + 80;
    const startX = mouthX - offset;
    const startY = mouthY + Math.sin(time / 120 + i) * 52 + (i - 5) * 5;
    const midX = mouthX - offset * 0.48;
    const midY = mouthY + Math.sin(time / 90 + i * 1.7) * 36;
    const gradient = ctx.createLinearGradient(startX, startY, mouthX, mouthY);
    gradient.addColorStop(0, `rgba(255, 248, 226, ${0.02 + 0.18 * strength})`);
    gradient.addColorStop(0.7, `rgba(255, 255, 255, ${0.1 + 0.28 * strength})`);
    gradient.addColorStop(1, `rgba(255, 255, 255, ${0.36 * strength})`);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4 + (i % 3) * 1.6;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(midX, midY, mouthX, mouthY);
    ctx.stroke();
  }
  ctx.restore();

  if (isReady(images.dust)) {
    for (let i = 0; i < 7; i += 1) {
      const p = ((time / (520 - i * 22) + i * 0.19) % 1);
      const startX = state.robot.x - 180 + i * 34;
      const startY = 362 + Math.sin(i * 1.3) * 110;
      const px = startX + (mouthX - startX) * easeInCubic(p);
      const py = startY + (mouthY - startY) * easeInCubic(p) + Math.sin(p * Math.PI * 2 + i) * 18;
      ctx.save();
      ctx.globalAlpha = 0.4 + p * 0.45;
      ctx.translate(px, py);
      ctx.rotate(time / 320 + i);
      drawDustSprite(ctx, images.dust, i, 22 + p * 14);
      ctx.restore();
    }
  }
}

function drawTrashLaunchEffect(ctx: CanvasRenderingContext2D, state: PublicGameState, x: number, y: number, images: GameImages) {
  if (!isReady(images.dust)) {
    return;
  }
  const time = Date.now();
  const originX = x - 122;
  const originY = y - 26;
  const intensity = state.boss.phase === 'attack' ? 1 : 0.45;

  for (let i = 0; i < 10; i += 1) {
    const p = ((time / (760 - i * 28) + i * 0.13) % 1);
    const arc = easeOutCubic(p);
    const px = originX - 30 - i * 8 - arc * (90 + i * 10);
    const py = originY - arc * (160 + (i % 4) * 34) + Math.sin(time / 100 + i) * 13;
    ctx.save();
    ctx.globalAlpha = (1 - p * 0.55) * intensity;
    ctx.translate(px, py);
    ctx.rotate(time / 260 + i * 0.8);
    drawDustSprite(ctx, images.dust, (i + Math.floor(time / 300)) % 8, 30 + (i % 3) * 8);
    ctx.restore();
  }
}

function drawFallbackBoss(ctx: CanvasRenderingContext2D, x: number, y: number, state: PublicGameState) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#ebe0ce';
  roundedRect(ctx, -102, -92, 204, 142, 34);
  ctx.fill();
  ctx.strokeStyle = '#2f2925';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = '#c8322c';
  roundedRect(ctx, -46, -28, 92, 76, 18);
  ctx.fill();
  ctx.fillStyle = '#151311';
  circle(ctx, 0, 12, 35);
  if (state.boss.phase === 'vulnerable') {
    ctx.fillStyle = '#cfa76e';
    roundedRect(ctx, -42, 50, 84, 60, 8);
    ctx.fill();
  }
  ctx.restore();
}

function getBossFrame(move: BossMove | undefined, phase: PublicGameState['boss']['phase']) {
  const beat = Math.floor(Date.now() / 180);
  if (phase === 'vulnerable') return beat % 2 === 0 ? 6 : 7;
  if (move === 'suck') return phase === 'attack' ? (beat % 2 === 0 ? 5 : 3) : 1;
  if (move === 'charge') return phase === 'attack' ? (beat % 2 === 0 ? 2 : 6) : 2;
  if (move === 'trashShot') return phase === 'attack' ? (beat % 2 === 0 ? 4 : 7) : 4;
  if (phase === 'idle') return beat % 4 === 0 ? 1 : 0;
  return 0;
}

function drawLog(ctx: CanvasRenderingContext2D, logs: GameLogEntry[]) {
  panel(ctx, 1002, 128, 246, 420, '#f1efe7');
  ctx.fillStyle = '#942b21';
  ctx.fillRect(1002, 128, 246, 40);
  ctx.fillStyle = '#fff8e7';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('事故ログ', 1082, 155);

  ctx.fillStyle = '#241d18';
  ctx.font = '16px sans-serif';
  logs.slice(-6).forEach((log, index) => {
    const y = 198 + index * 58;
    ctx.fillStyle = index % 2 ? '#fff8e7' : '#eadcc3';
    ctx.fillRect(1016, y - 24, 216, 48);
    ctx.fillStyle = '#241d18';
    ctx.fillText(formatStamp(log.t), 1028, y - 5);
    wrapText(ctx, log.message, 1028, y + 14, 192, 17, 2);
  });
}

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string) {
  ctx.fillStyle = fill;
  roundedRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = '#3b2a1c';
  ctx.lineWidth = 4;
  ctx.stroke();
}

function label(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, text: string, fill: string, size: number) {
  panel(ctx, x, y, w, h, fill);
  ctx.fillStyle = '#211a15';
  const lines = text.split('\n');
  ctx.font = `900 ${size}px sans-serif`;
  lines.forEach((line, index) => ctx.fillText(line, x + 18, y + 31 + index * (size + 4)));
}

function cardboardBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#bd8e55';
  roundedRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = '#4b321f';
  ctx.lineWidth = 4;
  ctx.stroke();
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawTape(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, angle: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(0, 0, w, 16);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function gauge(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, ratio: number) {
  ctx.fillStyle = '#2b2825';
  ctx.fillRect(x, y, w, 16);
  ctx.fillStyle = ratio > 0.7 ? '#d83d31' : ratio > 0.4 ? '#e6b64b' : '#83bf5a';
  ctx.fillRect(x + 3, y + 3, (w - 6) * Math.max(0, Math.min(1, ratio)), 10);
}

function hpBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ratio: number, color: string) {
  ctx.fillStyle = '#2b2825';
  roundedRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.fillStyle = color;
  roundedRect(ctx, x + 4, y + 4, (w - 8) * Math.max(0, Math.min(1, ratio)), h - 8, 6);
  ctx.fill();
}

function tiltMeter(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, angle: number) {
  ctx.strokeStyle = '#2b2825';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  const needle = x + w / 2 + (Math.max(-45, Math.min(45, angle)) / 45) * (w / 2);
  ctx.fillStyle = '#d83d31';
  ctx.beginPath();
  ctx.moveTo(needle, y - 16);
  ctx.lineTo(needle - 10, y + 16);
  ctx.lineTo(needle + 10, y + 16);
  ctx.closePath();
  ctx.fill();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const chars = [...text];
  let line = '';
  let lineCount = 0;
  for (const char of chars) {
    const next = line + char;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y + lineCount * lineHeight);
      line = char;
      lineCount += 1;
      if (lineCount >= maxLines) return;
    } else {
      line = next;
    }
  }
  if (lineCount < maxLines) {
    ctx.fillText(line, x, y + lineCount * lineHeight);
  }
}

function formatTime(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function formatStamp(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(value: number) {
  const t = clamp(value, 0, 1);
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(value: number) {
  const t = clamp(value, 0, 1);
  return t * t * t;
}

function isReady(image?: HTMLImageElement): image is HTMLImageElement {
  return Boolean(image?.complete && image.naturalWidth > 0);
}
