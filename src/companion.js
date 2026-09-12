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
  animTimer: 0,
  attackCooldown: 0,
  attackRange: 45,
  damage: 15,
  attackTimer: 0
};

export function resetCompanion(px, py) {
  wolf.x = px - 30;
  wolf.y = py + 18;
  wolf.hp = wolf.max;
  wolf.facing = 1;
  wolf.animTimer = 0;
  wolf.attackCooldown = 0;
}

export function updateCompanion(dt, player, enemies, projectiles) {
  if (wolf.hp <= 0) return; // Dead wolf stops moving

  if (wolf.attackCooldown > 0) wolf.attackCooldown -= dt;

  // 1. Find nearest enemy in detection range
  let targetEnemy = null;
  let minDist = 220; // Aggro range

  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const dist = Math.hypot((e.x + e.w / 2) - (wolf.x + wolf.w / 2), (e.y + e.h / 2) - (wolf.y + wolf.h / 2));
    if (dist < minDist) {
      minDist = dist;
      targetEnemy = e;
    }
  }

  // 2. AI State Machine (Chase/Attack Enemy vs Follow Player)
  if (targetEnemy) {
    const ex = targetEnemy.x + targetEnemy.w / 2;
    const wx = wolf.x + wolf.w / 2;
    const dx = ex - wx;

    wolf.facing = dx > 0 ? 1 : -1;

    if (Math.abs(dx) > 25) {
      // Chase Enemy
      wolf.vx = wolf.facing * 180;
      wolf.x += wolf.vx * dt;
      wolf.animTimer += dt * 14;
    } else {
      wolf.vx = 0;
      // Attack Enemy
      if (wolf.attackCooldown <= 0) {
        if (typeof targetEnemy.takeDamage === 'function') {
          targetEnemy.takeDamage(wolf.damage, 'none');
        } else {
          targetEnemy.hp -= wolf.damage;
        }
        wolf.attackCooldown = 0.8; // Attack rate
      }
    }

    // Vertical tracking towards enemy
    const targetY = targetEnemy.y + (targetEnemy.h - wolf.h);
    wolf.y += (targetY - wolf.y) * (1 - Math.exp(-10 * dt));

  } else {
    // Follow Player
    const followDist = 35;
    const targetX = player.x - player.facing * followDist;
    const dx = targetX - wolf.x;

    if (Math.abs(dx) > 6) {
      wolf.vx = Math.sign(dx) * 160;
      wolf.facing = wolf.vx > 0 ? 1 : -1;
      wolf.x += wolf.vx * dt;
      wolf.animTimer += dt * 12;
    } else {
      wolf.vx = 0;
      wolf.animTimer = 0;
    }

    const targetY = player.y + (player.h - wolf.h);
    wolf.y += (targetY - wolf.y) * (1 - Math.exp(-12 * dt));
  }

  // 3. Teleport catch-up if separated too far
  const distToPlayer = Math.hypot(player.x - wolf.x, player.y - wolf.y);
  if (distToPlayer > 350) {
    wolf.x = player.x - player.facing * 35;
    wolf.y = player.y + (player.h - wolf.h);
  }
}

// Function to allow enemies/projectiles to damage the companion
export function damageCompanion(dmg) {
  wolf.hp = Math.max(0, wolf.hp - dmg);
}

export function drawCompanion(ctx, camX, camY = 0) {
  if (wolf.hp <= 0) return; // Don't draw if dead

  const sx = wolf.x - camX;
  const sy = wolf.y - camY;

  ctx.save();
  ctx.translate(sx + wolf.w / 2, sy + wolf.h / 2);

  if (wolf.facing === -1) {
    ctx.scale(-1, 1);
  }

  const isMoving = Math.abs(wolf.vx) > 5;
  const bounce = isMoving ? Math.abs(Math.sin(wolf.animTimer)) * 3 : 0;

  // Wolf Body
  ctx.fillStyle = "#d9a24c";
  ctx.fillRect(-wolf.w / 2, -wolf.h / 2 - bounce, wolf.w - 4, wolf.h - 4);

  // Head & Eyes
  ctx.fillRect(wolf.w / 2 - 8, -wolf.h / 2 - 4 - bounce, 8, 8);
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(wolf.w / 2 - 4, -wolf.h / 2 - 2 - bounce, 2, 2);

  // Legs
  const legStride = isMoving ? Math.sin(wolf.animTimer) * 4 : 0;
  ctx.fillStyle = "#b88132";
  ctx.fillRect(-wolf.w / 2 + 2, wolf.h / 2 - 4 - bounce, 4, 4 + legStride);
  ctx.fillRect(-wolf.w / 2 + 7, wolf.h / 2 - 4 - bounce, 4, 4 - legStride);
  ctx.fillRect(wolf.w / 2 - 10, wolf.h / 2 - 4 - bounce, 4, 4 - legStride);
  ctx.fillRect(wolf.w / 2 - 5, wolf.h / 2 - 4 - bounce, 4, 4 + legStride);

  ctx.restore();
}
