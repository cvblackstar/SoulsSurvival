import { LEVEL_WIDTH, GRAVITY, resolveCollisions } from './level.js';
import { WEAPONS, LEGENDARY_WEAPONS, TIERS, getWeaponDamage } from './weapons.js';

export const player = {
  x: 60,
  y: 300,
  w: 24,
  h: 36,
  vx: 0,
  vy: 0,
  speed: 180,
  jumpForce: 450,
  grounded: false,
  hp: 100,
  max: 100,
  shield: 0,
  shieldMax: 0,
  weaponKey: 'sword',
  tierKey: 'common',
  elementKey: 'none',
  moveAxis: 0,
  isDashing: false,
  dashTimer: 0,
  dashCooldown: 0,
  attackCooldown: 0,
  attackAnimTimer: 0,
  facing: 1, // 1 = Right, -1 = Left
  animTimer: 0
};

export function resetPlayer() {
  player.x = 60;
  player.y = 300;
  player.vx = 0;
  player.vy = 0;
  player.hp = player.max;
  player.shield = player.shieldMax;
  player.grounded = false;
  player.isDashing = false;
  player.dashTimer = 0;
  player.dashCooldown = 0;
  player.attackCooldown = 0;
  player.attackAnimTimer = 0;
  player.moveAxis = 0;
  player.facing = 1;
  player.animTimer = 0;
}

export function updatePlayer(dt, enemies, projectiles, onGameOver) {
  if (player.dashCooldown > 0) player.dashCooldown -= dt;
  if (player.attackCooldown > 0) player.attackCooldown -= dt;
  if (player.attackAnimTimer > 0) player.attackAnimTimer -= dt;

  if (player.isDashing) {
    player.dashTimer -= dt;
    player.vx = player.facing * player.speed * 2.5;
    if (player.dashTimer <= 0) player.isDashing = false;
  } else {
    if (player.moveAxis !== 0) {
      player.facing = player.moveAxis > 0 ? 1 : -1;
      player.vx = player.moveAxis * player.speed;
      player.animTimer += dt * 10;
    } else {
      player.vx = 0;
      player.animTimer = 0;
    }
  }

  player.vy += GRAVITY * dt;
  player.grounded = resolveCollisions(player, dt);
  player.x = Math.max(0, Math.min(LEVEL_WIDTH - player.w, player.x));

  if (player.y > 640) {
    player.hp = 0;
  }

  if (player.hp <= 0 && onGameOver) {
    onGameOver();
  }
}

export function attack(enemies, projectiles) {
  if (player.attackCooldown > 0) return;

  const w = WEAPONS[player.weaponKey] || LEGENDARY_WEAPONS[player.weaponKey] || WEAPONS['sword'];
  if (!w) return;

  let dmg = getWeaponDamage ? getWeaponDamage(player.weaponKey, player.tierKey) : (w.damage || 20);
  if (!dmg || dmg <= 0) dmg = w.damage || 20;

  player.attackCooldown = w.cooldown || 0.35;
  player.attackAnimTimer = 0.2; // Keep slash on screen for 0.2s

  if (w.type !== 'melee') {
    projectiles.push({
      x: player.x + (player.facing === 1 ? player.w + 4 : -10),
      y: player.y + player.h / 2 - 4,
      vx: player.facing * (w.projSpeed || 400),
      vy: 0,
      r: 5,
      dmg: dmg,
      elem: player.elementKey,
      from: 'player',
      life: 2.0,
      pierce: w.pierce || false,
      homing: w.homing || false,
      turnRate: w.turnRate || 0,
      hitList: []
    });
  } else {
    const range = w.range || 45;
    const atkX = player.facing === 1 ? player.x + player.w : player.x - range;
    const atkY = player.y - 10;
    const atkW = range;
    const atkH = player.h + 20;

    for (const e of enemies) {
      if (atkX < e.x + e.w && atkX + atkW > e.x &&
          atkY < e.y + e.h && atkY + atkH > e.y) {
        if (typeof e.takeDamage === 'function') {
          e.takeDamage(dmg, player.elementKey);
        } else {
          e.hp -= dmg;
        }
      }
    }
  }
}

export function jump() {
  if (player.grounded) {
    player.vy = -player.jumpForce;
    player.grounded = false;
  }
}

export function dash() {
  if (player.dashCooldown <= 0 && !player.isDashing) {
    player.isDashing = true;
    player.dashTimer = 0.2;
    player.dashCooldown = 1.0;
  }
}

export function applyDamageAndStatus(dmg) {
  if (player.isDashing) return;

  if (player.shield > 0) {
    player.shield -= dmg;
    if (player.shield < 0) {
      player.hp += player.shield;
      player.shield = 0;
    }
  } else {
    player.hp -= dmg;
  }
  player.hp = Math.max(0, player.hp);
}

export function drawPlayer(ctx, camX, camY = 0) {
  const sx = player.x - camX;
  const sy = player.y - camY;

  // 1. Draw Player Character Sprite
  ctx.save();
  ctx.translate(sx + player.w / 2, sy + player.h / 2);

  if (player.isDashing) {
    ctx.fillStyle = "rgba(52, 152, 219, 0.4)";
    ctx.fillRect(-player.w / 2 - player.facing * 14, -player.h / 2, player.w, player.h);
  }

  if (player.facing === -1) {
    ctx.scale(-1, 1);
  }

  ctx.fillStyle = "#3498db";
  ctx.fillRect(-player.w / 2, -player.h / 2 + 8, player.w, player.h - 14);

  ctx.fillStyle = "#ecf0f1";
  ctx.fillRect(-player.w / 2 + 2, -player.h / 2, player.w - 4, 10);
  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(1, -player.h / 2 + 3, 7, 3);

  const isMoving = Math.abs(player.vx) > 5;
  const stride = isMoving ? Math.sin(player.animTimer) * 7 : 0;

  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(-player.w / 2 + 3, player.h / 2 - 8, 5, 8 + (isMoving ? stride : 0));
  ctx.fillRect(player.w / 2 - 8, player.h / 2 - 8, 5, 8 - (isMoving ? stride : 0));

  ctx.restore();

  // 2. Draw Melee Slash Animation in Absolute Screen Space
  if (player.attackAnimTimer > 0) {
    const w = WEAPONS[player.weaponKey] || LEGENDARY_WEAPONS[player.weaponKey] || WEAPONS['sword'];
    
    // Only render slash arc if using a melee weapon
    if (!w || w.type === 'melee' || !w.type) {
      ctx.save();
      const centerX = sx + (player.facing === 1 ? player.w + 10 : -10);
      const centerY = sy + player.h / 2;

      ctx.strokeStyle = "#f39c12";
      ctx.lineWidth = 5;
      ctx.beginPath();
      
      // Angle direction based on facing direction
      const startAngle = player.facing === 1 ? -Math.PI / 3 : (2 * Math.PI) / 3;
      const endAngle = player.facing === 1 ? Math.PI / 3 : (4 * Math.PI) / 3;

      ctx.arc(centerX, centerY, 28, startAngle, endAngle, false);
      ctx.stroke();

      // White inner core line for slash effect
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 26, startAngle, endAngle, false);
      ctx.stroke();

      ctx.restore();
    }
  }
}
