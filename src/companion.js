export const wolf = {
  x: 20,
  y: 300,
  w: 22,
  h: 18,
  vx: 0,
  vy: 0,
  hp: 80,
  max: 80,
  facing: 1,
  animTimer: 0
};

export function resetCompanion(px, py) {
  wolf.x = px - 30;
  wolf.y = py + 18; // Match foot-level alignment with player
  wolf.hp = wolf.max;
  wolf.facing = 1;
  wolf.animTimer = 0;
}

export function updateCompanion(dt, player, enemies, projectiles) {
  const followDist = 35;
  const targetX = player.x - player.facing * followDist;
  const dx = targetX - wolf.x;

  // Horizontal Movement
  if (Math.abs(dx) > 6) {
    wolf.vx = Math.sign(dx) * 160;
    wolf.facing = wolf.vx > 0 ? 1 : -1;
    wolf.x += wolf.vx * dt;
    wolf.animTimer += dt * 12;
  } else {
    wolf.vx = 0;
    wolf.animTimer = 0;
  }

  // Smooth frame-rate-independent Y Tracking
  const targetY = player.y + (player.h - wolf.h);
  const lerpFactor = 1 - Math.exp(-12 * dt); // Prevents frame jitter
  wolf.y += (targetY - wolf.y) * lerpFactor;

  // Rubber-band catch-up if wolf falls too far behind (e.g. fast drops or dashes)
  const distToPlayer = Math.hypot(player.x - wolf.x, player.y - wolf.y);
  if (distToPlayer > 300) {
    wolf.x = player.x - player.facing * followDist;
    wolf.y = targetY;
  }
}

export function drawCompanion(ctx, camX, camY = 0) {
  const sx = wolf.x - camX;
  const sy = wolf.y - camY;

  ctx.save();
  ctx.translate(sx + wolf.w / 2, sy + wolf.h / 2);

  if (wolf.facing === -1) {
    ctx.scale(-1, 1);
  }

  const isMoving = Math.abs(wolf.vx) > 5;
  const bounce = isMoving ? Math.abs(Math.sin(wolf.animTimer)) * 3 : 0;

  // Wolf Body Frame
  ctx.fillStyle = "#d9a24c";
  ctx.fillRect(-wolf.w / 2, -wolf.h / 2 - bounce, wolf.w - 4, wolf.h - 4);

  // Head & Eyes
  ctx.fillRect(wolf.w / 2 - 8, -wolf.h / 2 - 4 - bounce, 8, 8);
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(wolf.w / 2 - 4, -wolf.h / 2 - 2 - bounce, 2, 2);

  // Animated Legs
  const legStride = isMoving ? Math.sin(wolf.animTimer) * 4 : 0;
  ctx.fillStyle = "#b88132";

  // Rear Legs
  ctx.fillRect(-wolf.w / 2 + 2, wolf.h / 2 - 4 - bounce, 4, 4 + legStride);
  ctx.fillRect(-wolf.w / 2 + 7, wolf.h / 2 - 4 - bounce, 4, 4 - legStride);

  // Front Legs
  ctx.fillRect(wolf.w / 2 - 10, wolf.h / 2 - 4 - bounce, 4, 4 - legStride);
  ctx.fillRect(wolf.w / 2 - 5, wolf.h / 2 - 4 - bounce, 4, 4 + legStride);

  ctx.restore();
}
