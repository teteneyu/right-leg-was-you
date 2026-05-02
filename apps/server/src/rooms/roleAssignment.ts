import type { PlayerState, RobotRole } from '@right-leg/shared';

export function assignRoles(players: Record<string, PlayerState>) {
  const active = Object.values(players)
    .filter((player) => player.connected)
    .sort((a, b) => a.joinedAt - b.joinedAt);

  const layouts: RobotRole[][] = [
    ['all'],
    ['leftSide', 'rightSide'],
    ['leftLeg', 'rightLeg', 'arms'],
    ['leftLeg', 'rightLeg', 'leftArm', 'rightArm']
  ];

  const layout = layouts[Math.min(Math.max(active.length, 1), 4) - 1];

  active.forEach((player, index) => {
    player.role = layout[index] ?? 'spectator';
  });

  const activeIds = new Set(active.map((player) => player.id));
  Object.values(players).forEach((player) => {
    if (!activeIds.has(player.id)) {
      player.role = 'spectator';
    }
  });
}
